"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function MarkAllReadButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markAll() {
    setPending(true);
    try {
      await api.post("/api/notifications/read", {});
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" loading={pending} onClick={markAll}>
      <Icon name="check" size={15} />
      {label}
    </Button>
  );
}
