"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MenuIcon, SparkIcon } from "@/components/Icons";
import { cn, titleize } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const close = useCallback(() => setMobileOpen(false), []);

  const section =
    pathname === "/"
      ? "Overview"
      : pathname.startsWith("/projects/new")
        ? "New project"
        : pathname.startsWith("/projects/")
          ? "Project workspace"
          : titleize(pathname.split("/").filter(Boolean)[0] ?? "");

  return (
    <div className="min-h-screen bg-canvas text-zinc-200 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(70%_45%_at_50%_-10%,rgba(99,102,241,0.10),transparent_70%)]" />
      <Sidebar open={mobileOpen} onClose={close} />

      <div className="relative z-10 lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-5 backdrop-blur-xl sm:px-8 lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-line bg-panel p-2 text-zinc-300 hover:bg-elevated"
              aria-label="Open navigation"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
            <span className="flex items-center gap-2">
              <SparkIcon className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-bold tracking-[0.12em] text-zinc-100">AI-SE</span>
            </span>
          </div>
          <span className="text-xs text-zinc-500">{section}</span>
        </header>

        <div className="hidden h-12 items-center justify-between border-b border-line/70 px-8 lg:flex">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Link href="/" className="transition-colors hover:text-zinc-200">
              Control center
            </Link>
            <span className="text-zinc-700">/</span>
            <span className={cn("text-zinc-300")}>{section}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/80" />
            Autonomous engineering organization
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-7 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
