"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { PhasePipeline } from "@/components/PhasePipeline";
import {
  ActivityIcon,
  BoltIcon,
  ChevronRightIcon,
  CoinIcon,
  CpuIcon,
  FolderIcon,
  LayersIcon,
  PlusIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/Icons";
import { EmptyState, ErrorBanner, KpiCard, LiveIndicator, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { useEventStream } from "@/hooks/useEventStream";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import type { FeedEvent } from "@/lib/types";
import { cn, formatCompact, formatCurrency, formatNumber, relativeTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";

export default function DashboardPage() {
  const dashboard = usePolling(() => api.dashboard(), 3000, "dashboard");
  const data = dashboard.data;
  const projects = data?.projects ?? [];
  const activeProjects = projects.filter((p) => p.control === "running" && p.status !== "completed").slice(0, 4);
  const activeIds = useMemo(() => activeProjects.map((p) => p.id).slice(0, 3), [projects]);
  const activeKey = activeIds.join(",");

  const stream = useEventStream(activeKey ? activeIds : null);
  const liveEvents = useAppStore((state) => state.liveEvents);

  const tasks = usePolling(
    () => (activeIds[0] ? api.tasks(activeIds[0]) : Promise.resolve([])),
    4000,
    `dashboard-tasks-${activeIds[0] ?? "none"}`,
  );

  const history = usePolling<FeedEvent[]>(
    async () => {
      if (!activeKey) return [];
      const lists = await Promise.all(activeIds.map((id) => api.events(id, 12)));
      return lists.flat();
    },
    5000,
    `dashboard-history-${activeKey}`,
  );

  const phaseCounts = useMemo(() => {
    const counts: Record<string, { done: number; total: number }> = {};
    for (const task of tasks.data ?? []) {
      const entry = (counts[task.phase] ??= { done: 0, total: 0 });
      entry.total += 1;
      if (task.status === "completed") entry.done += 1;
    }
    return counts;
  }, [tasks.data]);

  const feed = useMemo(() => {
    const merged = new Map<string, FeedEvent>();
    for (const event of [...(history.data ?? []), ...liveEvents]) {
      if (!activeIds.includes(event.project_id)) continue;
      const dedupeKey = `${event.type}|${event.message}|${event.agent_id}|${event.timestamp}`;
      const existing = merged.get(dedupeKey);
      if (!existing || (event.live && !existing.live)) merged.set(dedupeKey, event);
    }
    return [...merged.values()].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [history.data, liveEvents, activeKey]);

  const taskStats = data?.tasks ?? { total: 0, completed: 0, pending: 0, blocked: 0 };
  const completion = taskStats.total ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
  const focusProject = activeProjects[0] ?? projects[0];

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Command center"
        title="Good to see you."
        description="Real-time visibility into your autonomous engineering organization — projects, agents, approvals, and execution activity in one place."
        action={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/50 bg-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_22px_-8px_rgba(99,102,241,0.9)] transition-colors hover:bg-indigo-400"
          >
            <PlusIcon className="h-4 w-4" /> New project
          </Link>
        }
      />

      {dashboard.error && <div className="mb-5"><ErrorBanner message={dashboard.error} onRetry={dashboard.refresh} /></div>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Active projects" value={String(activeProjects.length)} hint={`${projects.length} total projects`} icon={<FolderIcon className="h-[18px] w-[18px]" />} tone="indigo" />
        <KpiCard label="Running agents" value={formatNumber(data?.running_agents ?? 0)} hint="Executing tasks now" icon={<CpuIcon className="h-[18px] w-[18px]" />} tone="cyan" />
        <KpiCard label="Completed tasks" value={formatNumber(taskStats.completed)} hint={`${taskStats.total} tasks overall`} icon={<BoltIcon className="h-[18px] w-[18px]" />} tone="emerald" />
        <KpiCard label="Pending approvals" value={String(data?.pending_approvals?.length ?? 0)} hint="Require human decision" icon={<ShieldIcon className="h-[18px] w-[18px]" />} tone="amber" />
        <KpiCard label="Tokens used" value={formatCompact(data?.tokens ?? 0)} hint={`${formatNumber(data?.llm_requests ?? 0)} LLM requests`} icon={<SparkIcon className="h-[18px] w-[18px]" />} tone="violet" />
        <KpiCard label="Est. cost" value={formatCurrency(data?.estimated_cost_usd ?? 0)} hint="Across all projects" icon={<CoinIcon className="h-[18px] w-[18px]" />} tone="emerald" />
        <KpiCard label="LLM requests" value={formatNumber(data?.llm_requests ?? 0)} hint="Gateway calls recorded" icon={<ActivityIcon className="h-[18px] w-[18px]" />} tone="cyan" />
      </div>

      {(data?.pending_approvals?.length ?? 0) > 0 && (
        <Link
          href="/approvals"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-5 py-3.5 transition-colors hover:border-amber-400/50 hover:bg-amber-500/[0.11]"
        >
          <span className="flex items-center gap-3 text-[13px] text-amber-100">
            <ShieldIcon className="h-4 w-4 text-amber-300" />
            <span className="font-medium">{data?.pending_approvals?.length} approval request awaiting your decision</span>
            <span className="hidden text-amber-200/60 sm:inline">The pipeline is paused until it is resolved.</span>
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
            Review <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel
          title="Active projects"
          subtitle="Live execution across the organization"
          className="lg:col-span-2"
          action={
            <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200">
              All projects <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClassName="p-0"
        >
          {dashboard.loading && !data ? (
            <LoadingState />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={<FolderIcon className="h-5 w-5" />}
              title="No projects yet"
              description="Submit a requirement to spin up an autonomous engineering team."
              action={
                <Link href="/projects/new" className="mt-1 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20">
                  Create your first project
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line/70">
              {projects.slice(0, 5).map((project) => (
                <li key={project.id}>
                  <Link href={`/projects/${project.id}`} className="group flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-elevated text-indigo-300 group-hover:border-indigo-500/40">
                      <LayersIcon className="h-[17px] w-[17px]" />
                    </span>
                    <div className="min-w-[140px] flex-1">
                      <p className="truncate text-[13px] font-medium text-zinc-100 group-hover:text-white">{project.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{project.requirement}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-[10px] uppercase tracking-wider text-zinc-600 sm:inline">{titleize(project.phase)}</span>
                      <StatusBadge status={project.control === "paused" ? "paused" : project.status} />
                    </div>
                    <span className="w-14 text-right text-[10px] text-zinc-600">{relativeTime(project.updated_at)}</span>
                    <ChevronRightIcon className="h-4 w-4 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Live activity"
          subtitle="Streaming organization events"
          action={<LiveIndicator connected={stream.connected} error={stream.error} />}
          bodyClassName="p-3 max-h-[340px] overflow-y-auto"
        >
          <ActivityFeed events={feed} max={14} />
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel
          title="Current pipeline"
          subtitle={focusProject ? `${focusProject.name} · ${titleize(focusProject.phase)} phase` : "No active execution"}
          className="lg:col-span-2"
          action={<StatusBadge status={focusProject?.control === "paused" ? "paused" : focusProject?.status ?? "idle"} />}
        >
          {focusProject ? (
            <>
              <PhasePipeline currentPhase={focusProject.phase} counts={phaseCounts} />
              {focusProject.summary && (
                <p className="mt-5 line-clamp-2 border-t border-line/70 pt-4 text-xs leading-relaxed text-zinc-400">
                  {focusProject.summary}
                </p>
              )}
              {focusProject.error && <p className="mt-3 text-xs text-rose-300">{focusProject.error}</p>}
            </>
          ) : (
            <EmptyState icon={<SparkIcon className="h-5 w-5" />} title="Pipeline idle" description="Create a project to start the agent workflow." />
          )}
        </Panel>

        <Panel title="Task health" subtitle="Completion across all projects">
          <div className="space-y-4">
            {[
              { label: "Completed", value: taskStats.completed, tone: "bg-emerald-400" },
              { label: "Pending / active", value: taskStats.pending, tone: "bg-indigo-400" },
              { label: "Blocked / failed", value: taskStats.blocked, tone: "bg-rose-400" },
            ].map((row) => {
              const percent = taskStats.total ? Math.round((row.value / taskStats.total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{row.label}</span>
                    <span className="tabular-nums text-zinc-200">{row.value} <span className="text-zinc-600">({percent}%)</span></span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
                    <div className={cn("h-full rounded-full transition-all duration-500", row.tone)} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="border-t border-line/70 pt-4 text-xs text-zinc-500">
              Overall completion <span className="font-semibold text-zinc-200">{completion}%</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
