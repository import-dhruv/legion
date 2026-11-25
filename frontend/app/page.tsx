"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { EmptyState, ErrorBanner, KpiCard, LiveIndicator, LoadingState, Panel, StatusBadge } from "@/components/ui";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AuroraText } from "@/components/ui/aurora-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useEventStream } from "@/hooks/useEventStream";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import type { FeedEvent } from "@/lib/types";
import { cn, formatCompact, formatCurrency, formatNumber, relativeTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";

export default function DashboardPage() {
  const router = useRouter();
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
  const pendingCount = data?.pending_approvals?.length ?? 0;
  const signals = activeProjects.length
    ? activeProjects.map((project) => `${project.name} · ${titleize(project.phase)}`)
    : ["Pipeline idle", "Awaiting requirement", "Agents standing by"];

  return (
    <div className="space-y-5">
      <BlurFade delay={0.04} duration={0.55} offset={12} blur="8px">
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/50 p-6 shadow-panel sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <AnimatedGridPattern
              width={44}
              height={44}
              numSquares={9}
              maxOpacity={0.22}
              duration={5}
              className="text-indigo-300/[0.12]"
            />
            <div className="absolute inset-0 bg-[radial-gradient(70%_120%_at_0%_0%,rgba(99,102,241,0.13),transparent_70%)]" />
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />
          </div>

          <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <AnimatedGradientText
                speed={0.9}
                colorFrom="#a78bfa"
                colorTo="#22d3ee"
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              >
                Command center · live overview
              </AnimatedGradientText>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                <AuroraText colors={["#c4b5fd", "#a5b4fc", "#67e8f9", "#c4b5fd"]} speed={0.55}>
                  Good to see you.
                </AuroraText>
              </h1>
              <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted">
                Real-time visibility into your autonomous engineering organization — projects, agents, approvals, and execution activity in one place.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ShimmerButton
                  onClick={() => router.push("/projects/new")}
                  shimmerColor="#c7d2fe"
                  shimmerDuration="3.5s"
                  background="linear-gradient(135deg, #4f46e5, #7c3aed 55%, #2563eb)"
                  className="px-5 py-2.5 text-[13px] font-semibold shadow-[0_10px_30px_-12px_rgba(99,102,241,0.9)]"
                >
                  <PlusIcon className="mr-2 h-4 w-4" /> New project
                </ShimmerButton>
                <Link
                  href="/agents"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  Explore the org <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex min-w-[220px] flex-1 flex-col items-end gap-3 sm:max-w-[280px]">
              <div className="w-full rounded-xl border border-white/[0.07] bg-panel/70 p-4 shadow-panel backdrop-blur-sm">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  <span>Overall completion</span>
                  <LiveIndicator connected={stream.connected} error={stream.error} />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <NumberTicker value={completion} className="text-3xl font-semibold text-zinc-50" />
                  <span className="text-sm text-zinc-500">%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-cyan-300 shadow-[0_0_12px_rgba(129,140,248,0.7)] transition-all duration-700"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="mt-3 text-[11px] text-zinc-500">
                  {formatNumber(taskStats.completed)} of {formatNumber(taskStats.total)} tasks complete
                </p>
              </div>
            </div>
          </div>
        </section>
      </BlurFade>

      {dashboard.error && <div><ErrorBanner message={dashboard.error} onRetry={dashboard.refresh} /></div>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard label="Active projects" value={String(activeProjects.length)} tickerValue={activeProjects.length} hint={`${projects.length} total projects`} icon={<FolderIcon className="h-[18px] w-[18px]" />} tone="indigo" beam />
        <KpiCard label="Running agents" value={formatNumber(data?.running_agents ?? 0)} tickerValue={data?.running_agents ?? 0} hint="Executing tasks now" icon={<CpuIcon className="h-[18px] w-[18px]" />} tone="cyan" />
        <KpiCard label="Completed tasks" value={formatNumber(taskStats.completed)} tickerValue={taskStats.completed} hint={`${taskStats.total} tasks overall`} icon={<BoltIcon className="h-[18px] w-[18px]" />} tone="emerald" beam />
        <KpiCard label="Pending approvals" value={String(pendingCount)} tickerValue={pendingCount} hint="Require human decision" icon={<ShieldIcon className="h-[18px] w-[18px]" />} tone="amber" />
        <KpiCard label="Tokens used" value={formatCompact(data?.tokens ?? 0)} hint={`${formatNumber(data?.llm_requests ?? 0)} LLM requests`} icon={<SparkIcon className="h-[18px] w-[18px]" />} tone="violet" />
        <KpiCard label="Est. cost" value={formatCurrency(data?.estimated_cost_usd ?? 0)} hint="Across all projects" icon={<CoinIcon className="h-[18px] w-[18px]" />} tone="emerald" />
        <KpiCard label="LLM requests" value={formatNumber(data?.llm_requests ?? 0)} tickerValue={data?.llm_requests ?? 0} hint="Gateway calls recorded" icon={<ActivityIcon className="h-[18px] w-[18px]" />} tone="cyan" beam />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-surface/40">
        <Marquee repeat={4} pauseOnHover className="[--duration:50s] py-1.5">
          {signals.map((signal, index) => (
            <span key={`${signal}-${index}`} className="inline-flex items-center gap-2 whitespace-nowrap px-4 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/80 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
              {signal}
            </span>
          ))}
        </Marquee>
      </div>

      {pendingCount > 0 && (
        <BlurFade delay={0.1} offset={8}>
          <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl border border-amber-400/25 bg-amber-500/[0.07] px-5 py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_0%_50%,rgba(251,191,36,0.12),transparent_70%)]" />
            <span className="relative flex items-center gap-3 text-[13px] text-amber-100">
              <ShieldIcon className="h-4 w-4 text-amber-300" />
              <span className="font-medium">{pendingCount} approval request{pendingCount === 1 ? "" : "s"} awaiting your decision</span>
              <span className="hidden text-amber-200/60 sm:inline">The pipeline is paused until it is resolved.</span>
            </span>
            <ShimmerButton
              onClick={() => router.push("/approvals")}
              shimmerColor="#fde68a"
              shimmerDuration="4s"
              background="linear-gradient(135deg, #b45309, #d97706)"
              className="relative px-4 py-2 text-xs font-semibold"
            >
              Review approvals <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5" />
            </ShimmerButton>
          </div>
        </BlurFade>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Active projects"
          subtitle="Live execution across the organization"
          className="lg:col-span-2"
          beam
          action={
            <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 transition-colors hover:text-indigo-200">
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
                <ShimmerButton
                  onClick={() => router.push("/projects/new")}
                  background="rgba(99,102,241,0.15)"
                  className="mt-1 border border-indigo-400/30 px-3 py-2 text-xs font-medium"
                >
                  Create your first project
                </ShimmerButton>
              }
            />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {projects.slice(0, 5).map((project) => (
                <li key={project.id}>
                  <Link href={`/projects/${project.id}`} className="group flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-500/10 text-indigo-300 transition-colors group-hover:border-indigo-400/50 group-hover:bg-indigo-500/20">
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
          bodyClassName="max-h-[360px] overflow-y-auto p-3"
        >
          <ActivityFeed events={feed} max={14} animated />
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Current pipeline"
          subtitle={focusProject ? `${focusProject.name} · ${titleize(focusProject.phase)} phase` : "No active execution"}
          beam
          action={<StatusBadge status={focusProject?.control === "paused" ? "paused" : focusProject?.status ?? "idle"} />}
        >
          {focusProject ? (
            <div className="relative">
              <AnimatedGridPattern
                width={36}
                height={36}
                numSquares={5}
                maxOpacity={0.18}
                duration={6}
                className="text-indigo-300/[0.1]"
              />
              <div className="relative z-10">
                <PhasePipeline currentPhase={focusProject.phase} counts={phaseCounts} />
                {focusProject.summary && (
                  <p className="mt-5 line-clamp-2 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-zinc-400">
                    {focusProject.summary}
                  </p>
                )}
                {focusProject.error && <p className="mt-3 text-xs text-rose-300">{focusProject.error}</p>}
              </div>
            </div>
          ) : (
            <EmptyState icon={<SparkIcon className="h-5 w-5" />} title="Pipeline idle" description="Create a project to start the agent workflow." />
          )}
        </Panel>

        <Panel title="Task health" subtitle="Completion across all projects">
          <div className="space-y-4">
            {[
              { label: "Completed", value: taskStats.completed, tone: "from-emerald-500 to-emerald-300" },
              { label: "Pending / active", value: taskStats.pending, tone: "from-indigo-500 to-cyan-300" },
              { label: "Blocked / failed", value: taskStats.blocked, tone: "from-rose-500 to-orange-300" },
            ].map((row) => {
              const percent = taskStats.total ? Math.round((row.value / taskStats.total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{row.label}</span>
                    <span className="tabular-nums text-zinc-200">
                      {row.value} <span className="text-zinc-600">(<NumberTicker value={percent} className="text-xs text-zinc-500" />%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
                    <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", row.tone)} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="border-t border-white/[0.06] pt-4 text-xs text-zinc-500">
              Overall completion <span className="font-semibold text-zinc-200">{completion}%</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
