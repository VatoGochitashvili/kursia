import { z } from "zod";
import { db } from "@/lib/db";
import {
  ApiError, beginMutation, handler, jsonCreated, jsonOk, notFoundError, readJson,
} from "@/lib/api";
import { requireUser } from "@/lib/auth/rbac";
import { getSessionUser } from "@/lib/auth/session";
import { getMembership, loadFeed } from "@/lib/community";
import { notify } from "@/lib/notifications";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * The community feed: reading it, and writing to it.
 *
 * Both verbs answer to `getMembership`, which is the only place the rule
 * lives. Membership is earned by buying something from the creator, so a feed
 * is private to the people who did.
 */
export const GET = handler(async (request) => {
  const url = new URL(request.url);
  const creatorId = url.searchParams.get("creatorId") ?? "";
  const parentId = url.searchParams.get("parentId");
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const courseId = url.searchParams.get("courseId") ?? undefined;

  const viewer = await getSessionUser();
  const membership = await getMembership(viewer?.id ?? null, creatorId);
  if (!membership.isMember) {
    throw new ApiError(403, "FORBIDDEN", "ეს სივრცე მხოლოდ სტუდენტებისთვისაა");
  }

  // ── Replies to one post ─────────────────────────────────────────────────
  if (parentId) {
    const parent = await db.post.findUnique({
      where: { id: parentId },
      select: { id: true, creatorId: true },
    });
    // A parent from another community is not this member's business.
    if (!parent || parent.creatorId !== creatorId) throw notFoundError("პოსტი ვერ მოიძებნა");

    const replies = await db.post.findMany({
      where: {
        parentId,
        ...(membership.isOwner || membership.isAdmin
          ? { status: { not: "REMOVED" } }
          : {
              OR: [
                { status: "VISIBLE" },
                ...(viewer ? [{ status: "HIDDEN", authorId: viewer.id }] : []),
              ],
            }),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true, body: true, status: true, likeCount: true, createdAt: true,
        author: {
          select: {
            id: true,
            profile: { select: { fullName: true, avatarUrl: true } },
            creatorProfile: { select: { displayName: true, isVerified: true } },
          },
        },
      },
    });

    const liked = viewer
      ? new Set(
          (
            await db.postLike.findMany({
              where: { userId: viewer.id, postId: { in: replies.map((r) => r.id) } },
              select: { postId: true },
            })
          ).map((l) => l.postId),
        )
      : new Set<string>();

    return jsonOk({
      replies: replies.map((r) => ({ ...r, likedByViewer: liked.has(r.id) })),
      membership,
    });
  }

  const feed = await loadFeed({
    creatorId,
    viewerId: viewer?.id ?? null,
    membership,
    courseId,
    cursor,
  });

  return jsonOk({ ...feed, membership });
});

const createSchema = z
  .object({
    creatorId: cuid,
    parentId: cuid.optional(),
    courseId: z.union([cuid, z.literal("")]).optional(),
    title: z.string().trim().max(160).optional(),
    body: z.string().trim().min(1, "დაწერე რამე").max(10000),
  })
  .strict();

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const body = await readJson(request, createSchema);

  const membership = await getMembership(user.id, body.creatorId);
  if (!membership.isMember) {
    throw new ApiError(403, "FORBIDDEN", "ეს სივრცე მხოლოდ სტუდენტებისთვისაა");
  }

  // A reply must belong to a post in this same community, or threads could be
  // stitched across communities by passing someone else's post id.
  let parent: { id: string; authorId: string; creatorId: string } | null = null;
  if (body.parentId) {
    parent = await db.post.findUnique({
      where: { id: body.parentId },
      select: { id: true, authorId: true, creatorId: true },
    });
    if (!parent || parent.creatorId !== body.creatorId) throw notFoundError("პოსტი ვერ მოიძებნა");
  }

  const post = await db.post.create({
    data: {
      creatorId: body.creatorId,
      authorId: user.id,
      parentId: parent?.id ?? null,
      courseId: body.courseId || null,
      // A reply never carries a title, whatever was sent.
      title: parent ? null : body.title || null,
      body: body.body,
    },
    select: { id: true, createdAt: true },
  });

  if (parent) {
    await db.post.update({
      where: { id: parent.id },
      data: { replyCount: { increment: 1 } },
    });

    // Tell the author someone replied — unless they are replying to
    // themselves, which needs no announcement.
    if (parent.authorId !== user.id) {
      const creator = await db.creatorProfile.findUnique({
        where: { id: body.creatorId },
        select: { slug: true },
      });
      await notify({
        userId: parent.authorId,
        type: "COMMENT_REPLY",
        title: "ახალი პასუხი შენს პოსტზე",
        body: body.body.slice(0, 200),
        linkUrl: creator ? `/community/${creator.slug}?post=${parent.id}` : undefined,
      }).catch(() => undefined);
    }
  }

  return jsonCreated({ post });
});
