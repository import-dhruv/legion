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
import { Reveal } from "@/components/Reveal";
import { EmptyState, ErrorBanner, KpiCard, LiveIndicator, LoadingState, Panel, StatusBadge } from "@/components/ui";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AuroraText } from "@/components/ui/aurora-text";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useEventStream } from "@/hooks/useEventStream";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import type { FeedEvent } from "@/lib/types";
import { stagger } from "@/lib/motion";
import { formatCompact, formatCurrency, formatNumber, relativeTime, titleize } from "@/lib/utils";
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
    ? activeProjects.map((project) => `Live · ${project.name} — ${titleize(project.phase)} phase`)
    : ["System idle", "Awaiting requirement", "Agents standing by"];

  return (
    <div className="space-y-5">
      <Reveal>
        <section className="relative overflow-hidden rounded-2xl border border-black/[0.07] bg-surface/50 p-6 shadow-panel sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <AnimatedGridPattern
              width={44}
              height={44}
              numSquares={6}
              maxOpacity={0.24}
              duration={9}
              className="text-muted-foreground/[0.08]"
            />
            <div className="absolute -left-24 -top-28 h-[420px] w-[520px] animate-glow-drift rounded-full bg-[radial-gradient(closest-side,rgba(0,0,0,0.09),rgba(0,0,0,0.03)_55%,transparent_100%)] blur-[90px]" />
            <div className="absolute inset-0 bg-[radial-gradient(70%_120%_at_0%_0%,rgba(0, 0, 0,0.06),transparent_70%)]" />
          </div>

          <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <AnimatedGradientText
                speed={1.1}
                colorFrom="#8a8a8a"
                colorTo="#171717"
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              >
                Command center · live overview
              </AnimatedGradientText>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                <AuroraText colors={["#171717", "#404040", "#737373", "#171717"]} speed={1}>
                  Good to see you.
                </AuroraText>
              </h1>
              <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                Real-time visibility into your autonomous engineering organization — projects, agents, approvals, and execution activity in one place.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <ShimmerButton
                  onClick={() => router.push("/projects/new")}
                  shimmerColor="#d4d4d4"
                  shimmerDuration="3.5s"
                  background="linear-gradient(135deg, #171717, #404040 55%, #a3a3a3)"
                  className="px-5 py-2.5 text-[13px] font-semibold shadow-[0_10px_30px_-12px_rgba(0, 0, 0,0.9)]"
                >
                  <PlusIcon className="mr-2 h-4 w-4" /> New project
                </ShimmerButton>
                <Link
                  href="/agents"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Explore the org <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex min-w-[220px] flex-1 flex-col items-end gap-3 sm:max-w-[280px]">
              <div className="w-full rounded-xl border border-black/[0.07] bg-panel/70 p-4 shadow-panel backdrop-blur-sm">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Overall completion</span>
                  <LiveIndicator connected={stream.connected} error={stream.error} />
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <NumberTicker key={completion} value={completion} duration={0.9} className="text-3xl font-semibold tabular-nums text-foreground" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <Progress
                  value={completion}
                  className="mt-3 flex-col gap-1.5"
                  aria-label="Overall task completion"
                />
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {formatNumber(taskStats.completed)} of {formatNumber(taskStats.total)} tasks complete
                </p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {dashboard.error && <div><ErrorBanner message={dashboard.error} onRetry={dashboard.refresh} /></div>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          <KpiCard key="active" label="Active projects" value={String(activeProjects.length)} tickerValue={activeProjects.length} hint={`${projects.length} total projects`} icon={<FolderIcon className="h-[18px] w-[18px]" />} tone="indigo" beam />,
          <KpiCard key="agents" label="Running agents" value={formatNumber(data?.running_agents ?? 0)} tickerValue={data?.running_agents ?? 0} hint="Executing tasks now" icon={<CpuIcon className="h-[18px] w-[18px]" />} tone="cyan" />,
          <KpiCard key="tasks" label="Completed tasks" value={formatNumber(taskStats.completed)} tickerValue={taskStats.completed} hint={`${taskStats.total} tasks overall`} icon={<BoltIcon className="h-[18px] w-[18px]" />} tone="emerald" beam />,
          <KpiCard key="approvals" label="Pending approvals" value={String(pendingCount)} tickerValue={pendingCount} hint="Require human decision" icon={<ShieldIcon className="h-[18px] w-[18px]" />} tone="amber" />,
          <KpiCard key="tokens" label="Tokens used" value={formatCompact(data?.tokens ?? 0)} hint={`${formatNumber(data?.llm_requests ?? 0)} LLM requests`} icon={<SparkIcon className="h-[18px] w-[18px]" />} tone="violet" />,
          <KpiCard key="cost" label="Est. cost" value={formatCurrency(data?.estimated_cost_usd ?? 0)} hint="Across all projects" icon={<CoinIcon className="h-[18px] w-[18px]" />} tone="emerald" />,
          <KpiCard key="requests" label="LLM requests" value={formatNumber(data?.llm_requests ?? 0)} tickerValue={data?.llm_requests ?? 0} hint="Gateway calls recorded" icon={<ActivityIcon className="h-[18px] w-[18px]" />} tone="cyan" beam />,
        ].map((card, index) => (
          <Reveal key={card.key} delay={index * stagger}>{card}</Reveal>
        ))}
      </div>

      <div className="marquee-mask overflow-hidden rounded-xl border border-black/[0.06] bg-surface/40">
        <Marquee repeat={4} pauseOnHover className="[--duration:66s] py-1.5">
          {signals.map((signal, index) => (
            <span key={`${signal}-${index}`} className="inline-flex items-center gap-2 whitespace-nowrap px-4 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-foreground/40" />
              {signal}
            </span>
          ))}
        </Marquee>
      </div>

      {pendingCount > 0 && (
        <Reveal delay={stagger * 2}>
          <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-xl border border-border bg-muted px-5 py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_0%_50%,rgba(0, 0, 0,0.12),transparent_70%)]" />
            <span className="relative flex items-center gap-3 text-[13px] text-muted-foreground">
              <ShieldIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{pendingCount} approval request{pendingCount === 1 ? "" : "s"} awaiting your decision</span>
              <span className="hidden text-muted-foreground sm:inline">The pipeline is paused until it is resolved.</span>
            </span>
            <ShimmerButton
              onClick={() => router.push("/approvals")}
              shimmerColor="#d4d4d4"
              shimmerDuration="4s"
              background="linear-gradient(135deg, #a3a3a3, #404040)"
              className="relative px-4 py-2 text-xs font-semibold"
            >
              Review approvals <ChevronRightIcon className="ml-1.5 h-3.5 w-3.5" />
            </ShimmerButton>
          </div>
        </Reveal>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Active projects"
          subtitle="Live execution across the organization"
          className="lg:col-span-2"
          beam
          action={
            <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-muted-foreground">
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
                  background="rgba(0, 0, 0,0.15)"
                  className="mt-1 border border-border px-3 py-2 text-xs font-medium"
                >
                  Create your first project
                </ShimmerButton>
              }
            />
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {projects.slice(0, 5).map((project) => (
                <li key={project.id}>
                  <Link href={`/projects/${project.id}`} className="group flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-black/[0.03]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors group-hover:border-foreground/30 group-hover:bg-accent">
                      <LayersIcon className="h-[17px] w-[17px]" />
                    </span>
                    <div className="min-w-[140px] flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground group-hover:text-primary-foreground">{project.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{project.requirement}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">{titleize(project.phase)}</span>
                      <StatusBadge status={project.control === "paused" ? "paused" : project.status} />
                    </div>
                    <span className="w-14 text-right text-[10px] text-muted-foreground">{relativeTime(project.updated_at)}</span>
                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
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
          bodyClassName="p-3"
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
                className="text-muted-foreground/[0.1]"
              />
              <div className="relative z-10">
                <PhasePipeline currentPhase={focusProject.phase} counts={phaseCounts} />
                {focusProject.summary && (
                  <p className="mt-5 line-clamp-2 border-t border-black/[0.06] pt-4 text-xs leading-relaxed text-muted-foreground">
                    {focusProject.summary}
                  </p>
                )}
                {focusProject.error && <p className="mt-3 text-xs text-muted-foreground">{focusProject.error}</p>}
              </div>
            </div>
          ) : (
            <EmptyState icon={<SparkIcon className="h-5 w-5" />} title="Pipeline idle" description="Create a project to start the agent workflow." />
          )}
        </Panel>

        <Panel title="Task health" subtitle="Completion across all projects">
          <div className="space-y-4">
            {[
              { label: "Completed", value: taskStats.completed },
              { label: "Pending / active", value: taskStats.pending },
              { label: "Blocked / failed", value: taskStats.blocked },
            ].map((row) => {
              const percent = taskStats.total ? Math.round((row.value / taskStats.total) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="tabular-nums text-foreground">
                      {row.value} <span className="text-muted-foreground">(<NumberTicker key={percent} value={percent} duration={0.9} className="text-xs tabular-nums text-muted-foreground" />%)</span>
                    </span>
                  </div>
                  <Progress value={percent} className="flex-col gap-0" aria-label={`${row.label} share`} />
                </div>
              );
            })}
            <div className="border-t border-black/[0.06] pt-4 text-xs text-muted-foreground">
              Overall completion <span className="font-semibold text-foreground">{completion}%</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
