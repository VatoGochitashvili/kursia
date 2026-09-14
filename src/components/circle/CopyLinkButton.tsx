"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Copies the circle's address, and says so, so nobody pastes an empty clipboard. */
export function CopyLinkButton({ path, label, copiedLabel }: { path: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by the browser; the button simply stays put.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-line text-[13px] font-semibold text-ink transition-colors hover:bg-surface-sunken"
    >
      <Icon name={copied ? "check" : "external"} size={14} />
      {copied ? copiedLabel : label}
    </button>
  );
}
