"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, errorMessage } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

interface Message {
  id: string;
  mine: boolean;
  body: string;
  createdAt: string;
}

const POLL_MS = 4000;

/** "14:05" — hand-formatted so server and client agree to the character. */
function clock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * The conversation itself. It polls every few seconds while the tab is
 * visible — enough for people talking to each other, and it needs nothing
 * from a free host beyond ordinary requests.
 */
export function MessageThread({
  peerId,
  labels,
}: {
  peerId: string;
  labels: { placeholder: string; send: string; empty: string };
}) {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      const result = await api.get<{ messages: Message[] }>(
        `/api/messages?with=${encodeURIComponent(peerId)}`,
      );
      setMessages(result.messages);
    } catch {
      // A missed poll is not worth a toast; the next one will try again.
    }
  }, [peerId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Follow the conversation down only when something new arrived.
  useEffect(() => {
    if (messages && messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const result = await api.post<{ message: Message }>("/api/messages", { to: peerId, body });
      setMessages((current) => [...(current ?? []), result.message]);
      setDraft("");
    } catch (err) {
      toast.show(errorMessage(err), "danger");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter makes a new line.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {messages === null ? null : messages.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-ink-muted">{labels.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {messages.map((m) => (
              <li key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed",
                    m.mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-surface-sunken text-ink",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-0.5 text-end text-[10.5px]", m.mine ? "text-white/70" : "text-ink-subtle")}>
                    {clock(m.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex items-end gap-2 border-t border-line pt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={labels.placeholder}
          rows={1}
          maxLength={2000}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <Button type="submit" loading={sending} disabled={!draft.trim()} aria-label={labels.send}>
          <Icon name="send" size={16} />
          <span className="hidden sm:inline">{labels.send}</span>
        </Button>
      </form>
    </>
  );
}
