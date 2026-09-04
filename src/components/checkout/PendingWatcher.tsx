"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * While a payment is still settling, poll our own API for the authoritative
 * purchase status. The client never decides the outcome — it only asks the
 * server whether the webhook has arrived yet, and refreshes when it has.
 */
export function PendingWatcher({ reference }: { reference: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Back off from 2s to 10s so a slow bank does not generate a poll storm.
    let delay = 2000;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/purchases/${encodeURIComponent(reference)}/status`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { status: string };
          if (data.status !== "PENDING") {
            router.refresh();
            return;
          }
        }
      } catch {
        // Transient network failure — keep polling.
      }
      setElapsed((n) => n + delay / 1000);
      delay = Math.min(delay * 1.4, 10_000);
      if (!cancelled) setTimeout(poll, delay);
    }

    const timer = setTimeout(poll, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reference, router]);

  // Stop nagging after two minutes; the page still updates on manual reload.
  if (elapsed > 120) return null;
  return null;
}
