"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * Search is a plain form that navigates to /courses?q=… — it works without
 * JavaScript, and the results page is fully server-rendered and indexable.
 */
export function SearchBar({
  placeholder,
  defaultValue = "",
  action = "/courses",
  size = "md",
  className,
  autoFocus,
}: {
  placeholder: string;
  defaultValue?: string;
  action?: string;
  size?: "md" | "lg";
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    router.push(q ? `${action}?q=${encodeURIComponent(q)}` : action);
  }

  return (
    <form
      onSubmit={onSubmit}
      action={action}
      method="get"
      role="search"
      className={cn("relative flex w-full items-center", className)}
    >
      <Icon
        name="search"
        size={size === "lg" ? 20 : 18}
        className="pointer-events-none absolute left-4 text-ink-subtle"
      />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className={cn(
          "w-full rounded-full border border-line-strong bg-surface text-ink placeholder:text-ink-subtle",
          "transition-shadow focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/12",
          size === "lg" ? "h-14 pl-12 pr-32 text-[15px]" : "h-11 pl-11 pr-4 text-sm",
        )}
      />
      {size === "lg" && (
        <button
          type="submit"
          className="absolute right-1.5 h-11 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          ძიება
        </button>
      )}
    </form>
  );
}
