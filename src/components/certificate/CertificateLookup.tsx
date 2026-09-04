"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/primitives";

/**
 * Certificate lookup. Navigates to /certificate/[code] so the result is a real
 * shareable URL rather than transient client state — the whole point of a
 * verification page is that the link can be sent to someone else.
 */
export function CertificateLookup({
  basePath,
  labels,
}: {
  basePath: string;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    if (clean) router.push(`${basePath}/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder={labels.placeholder}
        className="font-mono uppercase"
        dir="ltr"
        maxLength={40}
        autoFocus
      />
      <Button type="submit" disabled={!code.trim()}>
        {labels.submit}
      </Button>
    </form>
  );
}
