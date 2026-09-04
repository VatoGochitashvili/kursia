"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * Root error boundary.
 *
 * Shows a recovery action and the digest only — never the stack or the raw
 * message, which can leak query fragments and internal paths to the visitor.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server already logged this; recording it here surfaces client-side
    // render failures too.
    console.error("[app] render error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-muted p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
          <Icon name="alert" size={26} />
        </span>

        <h1 className="mt-5 text-2xl font-bold">დაფიქსირდა შეცდომა</h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          ჩვენ უკვე ვმუშაობთ ამაზე. სცადეთ თავიდან ან დაბრუნდით მთავარ გვერდზე.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-[11px] text-ink-subtle">#{error.digest}</p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>
            <Icon name="refresh" size={16} />
            თავიდან ცდა
          </Button>
          <ButtonLink href="/" variant="outline">
            მთავარ გვერდზე
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
