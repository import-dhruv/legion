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

const NAV = [
  { href: "/", label: "Overview", icon: DashboardIcon, exact: true },
  { href: "/projects", label: "Projects", icon: FolderIcon },
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
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-line bg-surface transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-400 via-violet-500 to-indigo-700 text-white shadow-glow">
              <SparkIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-[0.12em] text-zinc-50">AI-SE</span>
              <span className="text-[10px] text-zinc-500">Engineering control plane</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200 lg:hidden"
            aria-label="Close menu"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Workspace</p>
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                  active
                    ? "bg-indigo-500/10 text-indigo-200"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
                )}
              >
                {active && <span className="absolute left-0 top-2 h-6 w-0.5 rounded-r bg-indigo-400" />}
                <Icon className={cn("h-[17px] w-[17px]", active ? "text-indigo-300" : "text-zinc-500 group-hover:text-zinc-300")} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/approvals" && pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-300">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}

          <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Actions</p>
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
            <PlusIcon className="h-[17px] w-[17px] text-zinc-500 group-hover:text-indigo-300" />
            New project
          </Link>
        </nav>

        <div className="border-t border-line p-4">
          <div className="rounded-xl border border-line bg-panel/70 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    healthOk ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-amber-400",
                  )}
                />
                {healthOk ? "System operational" : health.loading ? "Checking API…" : "API unreachable"}
              </span>
              <ActivityIcon className="h-3.5 w-3.5 text-zinc-600" />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
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
            <p className="mt-2 text-[10px] text-zinc-600">
              {health.data?.agents ?? "—"} agents registered · control plane v1
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
