"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MenuIcon, SparkIcon } from "@/components/Icons";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Meteors } from "@/components/ui/meteors";
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
    <div className="relative min-h-screen bg-canvas text-zinc-200 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(75%_50%_at_50%_-10%,rgba(99,102,241,0.14),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_100%_20%,rgba(34,211,238,0.06),transparent_65%)]" />
        <div className="grid-fade absolute inset-0 opacity-60" />
        <DotPattern width={48} height={48} cr={0.7} className="text-indigo-300/[0.09]" />
        <div className="absolute inset-x-0 top-0 h-[420px] overflow-hidden">
          <Meteors number={8} minDelay={2} maxDelay={6} minDuration={8} maxDuration={16} className="bg-violet-200/50" />
        </div>
        <div className="absolute -left-40 top-1/3 h-80 w-80 rounded-full bg-violet-600/[0.05] blur-[120px]" />
        <div className="absolute -right-40 top-2/3 h-80 w-80 rounded-full bg-cyan-500/[0.04] blur-[120px]" />
      </div>

      <Sidebar open={mobileOpen} onClose={close} />

      <div className="relative z-10 lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-canvas/85 px-5 backdrop-blur-xl sm:px-8 lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-line bg-panel p-2 text-zinc-300 transition-colors hover:bg-elevated"
              aria-label="Open navigation"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
            <span className="flex items-center gap-2">
              <SparkIcon className="h-4 w-4 text-indigo-300" />
              <span className="bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300 bg-clip-text text-sm font-bold tracking-[0.12em] text-transparent">AI-SE</span>
            </span>
          </div>
          <span className="text-xs text-zinc-500">{section}</span>
        </header>

        <div className="hidden h-12 items-center justify-between border-b border-white/[0.06] px-8 backdrop-blur-sm lg:flex">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Link href="/" className="transition-colors hover:text-zinc-200">
              Control center
            </Link>
            <span className="text-zinc-700">/</span>
            <span className={cn("text-zinc-300")}>{section}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/80 shadow-[0_0_8px_rgba(129,140,248,0.9)]" />
            Autonomous engineering organization
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1440px] px-5 pb-20 pt-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
