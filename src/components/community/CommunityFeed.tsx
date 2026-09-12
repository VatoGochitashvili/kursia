"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Alert, Avatar, Badge, Card, Textarea } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { cn } from "@/lib/cn";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/lib/enums";

interface Author {
  id: string;
  profile: { fullName: string; username?: string; avatarUrl: string | null } | null;
  creatorProfile: { slug?: string; displayName: string; isVerified: boolean } | null;
}

interface Post {
  id: string;
  title: string | null;
  body: string;
  isPinned: boolean;
  status: string;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  likedByViewer: boolean;
  author: Author;
  course: { slug: string; title: string } | null;
}

interface Membership {
  isMember: boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

/**
 * The community feed.
 *
 * Everything here is gated server-side — this component renders what the
 * endpoint returned and never decides who may see what. `membership` arrives
 * with the feed and is used only to choose which controls to draw, so a
 * tampered client gets a pin button that the server then refuses.
 */
export function CommunityFeed({
  creatorId,
  viewerId,
  locale,
  t,
}: {
  creatorId: string;
  viewerId: string | null;
  locale: Locale;
  t: Dictionary;
}) {
  const toast = useToast();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(
    async (after?: string) => {
      try {
        const query = new URLSearchParams({ creatorId });
        if (after) query.set("cursor", after);

        const data = await api.get<{
          posts: Post[];
          nextCursor: string | null;
          membership: Membership;
        }>(`/api/posts?${query}`);

        setMembership(data.membership);
        setCursor(data.nextCursor);
        setPosts((current) => (after ? [...(current ?? []), ...data.posts] : data.posts));
      } catch (err) {
        setError(errorMessage(err));
        setPosts([]);
      }
    },
    [creatorId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setPosting(true);
    try {
      await api.post("/api/posts", {
        creatorId,
        title: title.trim() || undefined,
        body: body.trim(),
      });
      setTitle("");
      setBody("");
      await load();
      toast.show(t.community.posted, "success");
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setPosting(false);
    }
  }

  if (error) return <Alert tone="danger">{error}</Alert>;

  if (!posts) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-5">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton mt-3 h-3 w-full rounded" />
            <div className="skeleton mt-2 h-3 w-2/3 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {membership?.isMember && (
        <Card className="p-4">
          <Textarea
            rows={body ? 4 : 2}
            value={body}
            placeholder={t.community.placeholder}
            onChange={(e) => setBody(e.target.value)}
          />
          {body.trim() && (
            <div className="mt-3 animate-fade-up space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.community.titleOptional}
                aria-label={t.community.titleOptional}
                className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-subtle focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="md" onClick={() => { setBody(""); setTitle(""); }}>
                  {t.common.cancel}
                </Button>
                <Button size="md" loading={posting} onClick={submit}>
                  <Icon name="send" size={15} />
                  {t.community.post}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {posts.length === 0 && (
        <Card className="p-8 text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon name="message" size={22} />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-ink">{t.community.emptyTitle}</p>
          <p className="mt-1 text-[14px] text-ink-muted">{t.community.emptyBody}</p>
        </Card>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          creatorId={creatorId}
          viewerId={viewerId}
          membership={membership}
          locale={locale}
          t={t}
          onChanged={() => load()}
        />
      ))}

      {cursor && (
        <Button
          variant="outline"
          fullWidth
          loading={loadingMore}
          onClick={async () => {
            setLoadingMore(true);
            await load(cursor);
            setLoadingMore(false);
          }}
        >
          {t.common.showMore}
        </Button>
      )}
    </div>
  );
}

/* ── One post, with its replies ──────────────────────────────────────── */

interface Reply {
  id: string;
  body: string;
  status: string;
  likeCount: number;
  createdAt: string;
  likedByViewer: boolean;
  author: Author;
}

function PostCard({
  post,
  creatorId,
  viewerId,
  membership,
  locale,
  t,
  onChanged,
}: {
  post: Post;
  creatorId: string;
  viewerId: string | null;
  membership: Membership | null;
  locale: Locale;
  t: Dictionary;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [liked, setLiked] = useState(post.likedByViewer);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  const isAuthor = viewerId === post.author.id;
  const canModerate = Boolean(membership?.isOwner || membership?.isAdmin);
  const name =
    post.author.creatorProfile?.displayName ?? post.author.profile?.fullName ?? "—";

  async function toggleLike() {
    const next = !liked;
    // Optimistic, then corrected from the server's own count.
    setLiked(next);
    setLikeCount((n) => n + (next ? 1 : -1));
    try {
      const result = next
        ? await api.post<{ likeCount: number }>(`/api/posts/${post.id}/like`)
        : await api.delete<{ likeCount: number }>(`/api/posts/${post.id}/like`);
      setLikeCount(result.likeCount);
    } catch (err) {
      setLiked(!next);
      setLikeCount(post.likeCount);
      toast.show(errorMessage(err), "danger");
    }
  }

  async function loadReplies() {
    try {
      const data = await api.get<{ replies: Reply[] }>(
        `/api/posts?creatorId=${creatorId}&parentId=${post.id}`,
      );
      setReplies(data.replies);
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  async function sendReply() {
    setReplying(true);
    try {
      await api.post("/api/posts", { creatorId, parentId: post.id, body: replyBody.trim() });
      setReplyBody("");
      await loadReplies();
      onChanged();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setReplying(false);
    }
  }

  async function moderate(patch: Record<string, unknown>) {
    try {
      await api.patch(`/api/posts/${post.id}`, patch);
      onChanged();
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  async function remove() {
    try {
      await api.delete(`/api/posts/${post.id}`);
      onChanged();
      toast.show(t.community.removed, "success");
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    }
  }

  return (
    <Card className={cn("p-5", post.isPinned && "border-brand-200 bg-brand-50/25")}>
      <div className="flex items-start gap-3">
        <Avatar
          src={post.author.profile?.avatarUrl ?? null}
          name={name}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14px] font-semibold text-ink">{name}</span>
            {post.author.creatorProfile && (
              <Badge tone="brand">{t.community.authorBadge}</Badge>
            )}
            {post.isPinned && (
              <Badge tone="accent">
                <Icon name="tag" size={11} />
                {t.community.pinned}
              </Badge>
            )}
            {post.status === "HIDDEN" && <Badge tone="warn">{t.community.hidden}</Badge>}
            <span className="text-[12px] text-ink-subtle">
              <TimeAgo date={post.createdAt} locale={locale} />
            </span>
          </div>

          {post.title && <h3 className="mt-2 text-[17px]">{post.title}</h3>}
          <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink">
            {post.body}
          </p>

          {post.course && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-ink-subtle">
              <Icon name="book" size={12} />
              {post.course.title}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={toggleLike}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-95",
                liked
                  ? "text-accent-600 hover:bg-accent-50"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              <Icon name="heart" size={15} filled={liked} />
              {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                if (!replies) void loadReplies();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <Icon name="message" size={15} />
              {post.replyCount > 0 ? post.replyCount : t.community.reply}
            </button>

            {canModerate && (
              <>
                <button
                  type="button"
                  onClick={() => moderate({ isPinned: !post.isPinned })}
                  className="ms-auto rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  {post.isPinned ? t.community.unpin : t.community.pin}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    moderate({ status: post.status === "HIDDEN" ? "VISIBLE" : "HIDDEN" })
                  }
                  className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  {post.status === "HIDDEN" ? t.community.unhide : t.community.hide}
                </button>
              </>
            )}

            {(isAuthor || canModerate) && (
              <button
                type="button"
                onClick={remove}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-danger-50 hover:text-danger-700",
                  !canModerate && "ms-auto",
                )}
              >
                {t.common.delete}
              </button>
            )}
          </div>

          {open && (
            <div className="mt-4 space-y-3 border-t border-line pt-4">
              {replies?.map((reply) => (
                <div key={reply.id} className="flex items-start gap-2.5">
                  <Avatar
                    src={reply.author.profile?.avatarUrl ?? null}
                    name={
                      reply.author.creatorProfile?.displayName ??
                      reply.author.profile?.fullName ??
                      "—"
                    }
                    size={30}
                  />
                  <div className="min-w-0 flex-1 rounded-xl bg-surface-muted px-3 py-2">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="text-[13px] font-semibold text-ink">
                        {reply.author.creatorProfile?.displayName ??
                          reply.author.profile?.fullName ??
                          "—"}
                      </span>
                      {reply.author.creatorProfile && (
                        <Badge tone="brand">{t.community.authorBadge}</Badge>
                      )}
                      <span className="text-[11px] text-ink-subtle">
                        <TimeAgo date={reply.createdAt} locale={locale} />
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink">
                      {reply.body}
                    </p>
                  </div>
                </div>
              ))}

              {membership?.isMember && (
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    value={replyBody}
                    placeholder={t.community.replyPlaceholder}
                    onChange={(e) => setReplyBody(e.target.value)}
                  />
                  <Button
                    size="md"
                    loading={replying}
                    disabled={!replyBody.trim()}
                    onClick={sendReply}
                  >
                    <Icon name="send" size={15} />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
