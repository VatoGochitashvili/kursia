import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";

/** Focused, distraction-free frame for the authentication screens. */
export function AuthShell({
  title,
  subtitle,
  brand,
  homeHref,
  children,
  footer,
  aside,
}: {
  title: string;
  subtitle?: string;
  brand: string;
  homeHref: string;
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href={homeHref} className="inline-flex w-fit items-center gap-2">
          <Logo size={30} />
          <span className="text-[17px] font-bold tracking-tight text-ink">{brand}</span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-ink-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
        </div>
      </div>

      {/* Decorative panel — hidden on small screens where it would only push
          the form below the fold. */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(45rem 30rem at 25% 10%, rgb(53 89 240 / 0.55), transparent 62%)," +
              "radial-gradient(38rem 26rem at 85% 90%, rgb(255 87 16 / 0.35), transparent 62%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-12">{aside}</div>
      </div>
    </div>
  );
}
