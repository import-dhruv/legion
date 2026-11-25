"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/services/api";
import { useAppStore } from "@/lib/store";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  DashboardIcon,
  FolderIcon,
  PlusIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
  XIcon,
} from "@/components/Icons";
import { AuroraText } from "@/components/ui/aurora-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { Dock, DockIcon } from "@/components/ui/dock";

const NAV = [
  { href: "/", label: "Overview", icon: DashboardIcon, exact: true },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/agents", label: "Organization", icon: UsersIcon },
  { href: "/approvals", label: "Approvals", icon: ShieldIcon },
];

const DOCK = [
  { href: "/", label: "Overview", icon: DashboardIcon, exact: true },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/projects/new", label: "New project", icon: PlusIcon },
  { href: "/agents", label: "Organization", icon: UsersIcon },
  { href: "/approvals", label: "Approvals", icon: ShieldIcon },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const health = usePolling(() => api.health(), 5000, "health");
  const approvalVersion = useAppStore((state) => state.approvalVersion);
  const pending = usePolling(() => api.approvals("pending"), 5000, `approvals-${approvalVersion}`);
  const pendingCount = pending.data?.length ?? 0;

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const healthOk = health.data?.status === "ok" && !health.error;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-white/[0.06] bg-surface/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative flex h-16 items-center justify-between overflow-hidden border-b border-white/[0.06] px-5">
          <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
          <Link href="/" className="group relative flex items-center gap-3" onClick={onClose}>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-indigo-300/30 bg-gradient-to-br from-indigo-400 via-violet-500 to-indigo-700 text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
              <SparkIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="flex flex-col leading-tight">
              <AuroraText
                colors={["#c4b5fd", "#a5b4fc", "#67e8f9", "#c4b5fd"]}
                speed={0.6}
                className="text-[15px] font-bold tracking-[0.14em]"
              >
                AI-SE
              </AuroraText>
              <span className="text-[10px] text-zinc-500">Engineering control plane</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200 lg:hidden"
            aria-label="Close menu"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Workspace</p>
          {NAV.map((item, index) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <BlurFade key={item.href} delay={index * 0.05} direction="right" offset={8} blur="4px">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                    active
                      ? "bg-indigo-500/[0.12] text-indigo-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
                  )}
                >
                  {active && (
                    <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-300 shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
                  )}
                  {active && <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent" />}
                  <Icon className={cn("relative h-[17px] w-[17px]", active ? "text-indigo-300" : "text-zinc-500 group-hover:text-zinc-300")} />
                  <span className="relative flex-1">{item.label}</span>
                  {item.href === "/approvals" && pendingCount > 0 && (
                    <span className="relative rounded-full border border-amber-400/20 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-300">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </BlurFade>
            );
          })}

          <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Actions</p>
          <BlurFade delay={0.2} direction="right" offset={8} blur="4px">
            <Link
              href="/projects/new"
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                pathname === "/projects/new"
                  ? "bg-indigo-500/10 text-indigo-200"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
              )}
            >
              <PlusIcon className="h-[17px] w-[17px] text-zinc-500 transition-colors group-hover:text-indigo-300" />
              New project
            </Link>
          </BlurFade>
        </nav>

        <div className="border-t border-white/[0.06] p-4">
          <Dock
            className="mt-2 h-12 w-max gap-0.5 border-white/[0.07] bg-white/[0.025] p-1.5 shadow-panel"
            iconSize={30}
            iconMagnification={42}
            iconDistance={90}
          >
            {DOCK.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <DockIcon key={item.href} className={cn(active ? "bg-indigo-500/15" : "hover:bg-white/[0.06]")}>
                  <Link href={item.href} onClick={onClose} aria-label={item.label} title={item.label}>
                    <Icon className={cn("h-4 w-4", active ? "text-indigo-300" : "text-zinc-500")} />
                  </Link>
                </DockIcon>
              );
            })}
          </Dock>

          <div className="mt-4 relative overflow-hidden rounded-xl border border-white/[0.07] bg-panel/70 p-3.5 shadow-panel">
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-indigo-500/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    healthOk ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse-soft" : "bg-amber-400",
                  )}
                />
                {healthOk ? "System operational" : health.loading ? "Checking API…" : "API unreachable"}
              </span>
              <ActivityIcon className="h-3.5 w-3.5 text-zinc-600" />
            </div>
            <div className="relative mt-3 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="truncate capitalize">{health.data?.llm_provider ?? "unknown provider"}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider",
                  health.data?.mock_mode ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300",
                )}
              >
                {health.data?.mock_mode ? "Mock" : "Live"}
              </span>
            </div>
            <p className="relative mt-2 text-[10px] text-zinc-600">
              {health.data?.agents ?? "—"} agents registered · control plane v1
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
