import { z } from "zod";
import { db } from "@/lib/db";
import { beginMutation, handler, jsonCreated, jsonOk, readJson } from "@/lib/api";
import { forbidden, requireUser } from "@/lib/auth/rbac";
import { canMessage } from "@/lib/social";
import { cuid } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Private messages between two members of the same circle.
 *
 * GET ?with=<userId> returns the thread (oldest first, last 200) and marks
 * what was waiting for the caller as read. The thread page polls this, which
 * is enough for a conversation between people and needs no socket server on
 * a free host.
 */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const peer = new URL(request.url).searchParams.get("with") ?? "";
  if (!cuid.safeParse(peer).success) return jsonOk({ messages: [] });

  const rows = await db.directMessage.findMany({
    where: {
      OR: [
        { senderId: user.id, recipientId: peer },
        { senderId: peer, recipientId: user.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, senderId: true, body: true, createdAt: true, readAt: true },
  });

  await db.directMessage.updateMany({
    where: { senderId: peer, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return jsonOk({
    messages: rows.reverse().map((m) => ({
      id: m.id,
      mine: m.senderId === user.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

const sendSchema = z
  .object({
    to: cuid,
    body: z.string().trim().min(1).max(2000),
  })
  .strict();

export const POST = handler(async (request) => {
  const user = await requireUser();
  await beginMutation("write", user.id);
  const { to, body } = await readJson(request, sendSchema);

  if (!(await canMessage(user.id, to))) {
    throw forbidden("მიწერა შეგიძლია მხოლოდ იმ ადამიანს, ვისთანაც ერთ წრეში ხარ");
  }

  const message = await db.directMessage.create({
    data: { senderId: user.id, recipientId: to, body },
    select: { id: true, body: true, createdAt: true },
  });

  return jsonCreated({
    message: {
      id: message.id,
      mine: true,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    },
  });
});
