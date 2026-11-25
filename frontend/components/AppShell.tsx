"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/Sidebar";
import { SparkIcon } from "@/components/Icons";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Meteors } from "@/components/ui/meteors";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn, titleize } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const section =
    pathname === "/"
      ? "Dashboard"
      : pathname.startsWith("/projects/new")
        ? "New project"
        : pathname.startsWith("/projects/")
          ? "Project workspace"
          : titleize(pathname.split("/").filter(Boolean)[0] ?? "");

  return (
    <SidebarProvider className="bg-background">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(75%_50%_at_50%_-10%,rgba(0,0,0,0.045),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_40%_at_100%_20%,rgba(0,0,0,0.025),transparent_65%)]" />
        <div className="grid-fade absolute inset-0 opacity-60" />
        <DotPattern width={48} height={48} cr={0.7} className="text-black/[0.07]" />
        <div className="absolute inset-x-0 top-0 h-[420px] overflow-hidden">
          <Meteors number={8} minDelay={2} maxDelay={6} minDuration={8} maxDuration={16} className="bg-black/20" />
        </div>
        <div className="absolute -left-40 top-1/3 h-80 w-80 rounded-full bg-black/[0.025] blur-[120px]" />
        <div className="absolute -right-40 top-2/3 h-80 w-80 rounded-full bg-black/[0.02] blur-[120px]" />
      </div>

      <AppSidebar />

      <SidebarInset className="min-w-0 bg-background/80">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="shrink-0" title="Toggle sidebar (⌘/Ctrl+B)" />
            <span className="mx-1 h-4 w-px bg-border" />
            <span className="flex items-center gap-2">
              <SparkIcon className="h-4 w-4 text-foreground" />
              <span className="text-sm font-bold tracking-[0.12em] text-foreground">AI-SE</span>
            </span>
            <span className="hidden text-muted-foreground sm:inline">/</span>
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">{section}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground/80 shadow-[0_0_8px_rgba(0,0,0,0.4)]" />
            <span className="hidden sm:inline">Autonomous engineering organization</span>
          </div>
        </header>

        <div className="hidden items-center justify-between border-b border-border px-6 py-2.5 text-xs text-muted-foreground lg:flex">
          <div className="flex items-center gap-2">
            <Link href="/" className="transition-colors hover:text-foreground">
              Control center
            </Link>
            <span className="text-muted-foreground/60">/</span>
            <span className={cn("font-medium text-foreground")}>{section}</span>
          </div>
        </div>

        <main className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-20 pt-8 sm:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
