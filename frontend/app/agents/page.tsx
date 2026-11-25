"use client";

import { useMemo, useState } from "react";
import {
  ActivityIcon,
  BoltIcon,
  CheckIcon,
  ChevronDownIcon,
  CpuIcon,
  DocIcon,
  LayersIcon,
  SearchIcon,
  ShieldIcon,
  SparkIcon,
  TerminalIcon,
  UsersIcon,
} from "@/components/Icons";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { BlurFade } from "@/components/ui/blur-fade";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { SparklesText } from "@/components/ui/sparkles-text";
import { usePolling } from "@/hooks/usePolling";
import type { Agent } from "@/lib/types";
import { cn, shortId, statusTone, titleize, toneClasses, type Tone } from "@/lib/utils";
import { api } from "@/services/api";

const DEPARTMENTS: Array<{ id: string; label: string; description: string; tone: Tone; icon: typeof CpuIcon }> = [
  { id: "executive", label: "Executive", description: "Strategy, orchestration and delivery leadership", tone: "violet", icon: SparkIcon },
  { id: "product", label: "Product", description: "Discovery, requirements and experience design", tone: "cyan", icon: LayersIcon },
  { id: "architecture", label: "Architecture", description: "System, data, API and infrastructure design", tone: "indigo", icon: CpuIcon },
  { id: "development", label: "Development", description: "Implementation across the full stack", tone: "emerald", icon: TerminalIcon },
  { id: "quality", label: "Quality", description: "Testing, review, debugging and verification", tone: "amber", icon: CheckIcon },
  { id: "security", label: "Security", description: "Application security and vulnerability audits", tone: "rose", icon: ShieldIcon },
  { id: "devops", label: "DevOps & SRE", description: "CI/CD, reliability and performance", tone: "cyan", icon: BoltIcon },
  { id: "documentation", label: "Documentation", description: "Docs, release management and independent audit", tone: "zinc", icon: DocIcon },
];

function permissionChips(permissions: Record<string, unknown>): string[] {
  const chips: string[] = [];
  for (const key of ["shell", "git", "browser", "write"]) {
    if (permissions[key] === true) chips.push(key);
  }
  const files = permissions.files;
  if (Array.isArray(files) && files.length > 0) chips.push(`${files.length} file rule${files.length > 1 ? "s" : ""}`);
  return chips.length ? chips : ["read only"];
}

function AgentCard({ agent, agents }: { agent: Agent; agents: Agent[] }) {
  const [expanded, setExpanded] = useState(false);
  const manager = agents.find((candidate) => candidate.id === agent.reports_to);
  const tone = toneClasses[statusTone(agent.status)];
  const initial = agent.name.charAt(0).toUpperCase();

  return (
    <MagicCard
      gradientColor="rgba(129,140,248,0.12)"
      gradientFrom="#a78bfa"
      gradientTo="#22d3ee"
      className="group flex h-full flex-col rounded-xl p-4 shadow-panel transition-transform duration-300 hover:-translate-y-0.5"
    >
      <ShineBorder
        borderWidth={1}
        duration={9}
        shineColor={["#a78bfa", "#22d3ee", "#818cf8", "#a78bfa"]}
        className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative z-40 flex flex-1 flex-col">
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/25 to-violet-600/10 text-sm font-bold text-indigo-200">
          {initial}
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel", tone.dot)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-100">{agent.name}</h3>
            <span className="rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">L{agent.level}</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-zinc-500">{agent.role}</p>
        </div>
        <StatusBadge status={agent.status} className="shrink-0" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] font-medium capitalize text-indigo-200">
          {agent.model_tier} model
        </span>
        {permissionChips(agent.permissions).slice(0, 4).map((chip) => (
          <span key={chip} className="rounded-md border border-line bg-elevated/70 px-2 py-1 text-[10px] text-zinc-400">
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-2 border-t border-line/70 pt-3 text-[11px]">
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-zinc-600">Reports to</span>
          <span className="truncate text-right text-zinc-300">
            {manager ? `${manager.name} · ${manager.role}` : "Human CTO"}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-zinc-600">Current task</span>
          <span className={cn("truncate text-right font-mono", agent.current_task_id ? "text-indigo-300" : "text-zinc-600")}>
            {agent.current_task_id ? shortId(agent.current_task_id, 14) : "unassigned"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex-1">
        <ul className="space-y-1.5">
          {(expanded ? agent.responsibilities : agent.responsibilities.slice(0, 2)).map((responsibility) => (
            <li key={responsibility} className="flex gap-2 text-[11px] leading-relaxed text-zinc-400">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
              {responsibility}
            </li>
          ))}
        </ul>
        {agent.responsibilities.length > 2 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-indigo-300 hover:text-indigo-200"
          >
            {expanded ? "Show less" : `+${agent.responsibilities.length - 2} more`}
            <ChevronDownIcon className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>

      <p className="mt-3 truncate border-t border-white/[0.06] pt-2 font-mono text-[10px] text-zinc-700" title={agent.id}>
        {agent.id}
      </p>
      </div>
    </MagicCard>
  );
}

function OrgTree({ agents }: { agents: Agent[] }) {
  const cto = agents.find((agent) => agent.id === "cto");
  const directReports = agents.filter((agent) => agent.reports_to === "cto");
  return (
    <Panel title="Reporting structure" subtitle="Human CTO → executive leadership → specialized departments" bodyClassName="p-6" beam>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-xs rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 to-violet-500/5 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-indigo-300/70">Human CTO</p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{cto ? `${cto.name} · ${cto.role}` : "Ada · Chief Technology Officer"}</p>
        </div>
        <div className="h-6 w-px bg-line" />
        <div className="relative h-px w-full max-w-3xl bg-line">
          <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-line" />
        </div>
        <div className="mt-3 grid w-full grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {(directReports.length ? directReports : []).map((agent) => (
            <div key={agent.id} className="relative rounded-lg border border-line bg-elevated/60 px-2.5 py-2 text-center">
              <span className="absolute left-1/2 -top-[13px] h-3 w-px -translate-x-1/2 bg-line" />
              <p className="truncate text-xs font-medium text-zinc-200">{agent.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-zinc-500">{agent.role}</p>
            </div>
          ))}
          {directReports.length === 0 && (
            <p className="col-span-full py-2 text-center text-xs text-zinc-600">Loading reporting lines…</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function AgentsPage() {
  const agentsQuery = usePolling(() => api.agents(), 5000, "agents");
  const [query, setQuery] = useState("");

  const agents = agentsQuery.data ?? [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return agents;
    return agents.filter((agent) =>
      [agent.name, agent.role, agent.department, agent.id].some((field) => field.toLowerCase().includes(needle)),
    );
  }, [agents, query]);

  const byDepartment = useMemo(() => {
    const result: Record<string, Agent[]> = {};
    for (const agent of filtered) {
      (result[agent.department] ??= []).push(agent);
    }
    return result;
  }, [filtered]);

  const working = agents.filter((agent) => agent.status === "working").length;
  const strong = agents.filter((agent) => agent.model_tier === "strong").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Organization"
        title={<SparklesText sparklesCount={6} colors={{ first: "#a78bfa", second: "#67e8f9" }} className="text-2xl font-semibold tracking-tight sm:text-[28px]">The agent org chart</SparklesText>}
        description="A hierarchical engineering organization — every specialist has a role, a reporting line, a model tier and a scoped set of tool permissions."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-zinc-400">
            <UsersIcon className="h-4 w-4 text-indigo-300" />
            <span className="font-semibold text-zinc-100">{agents.length || "—"}</span> agents ·{" "}
            <span className="font-semibold text-emerald-300">{working}</span> working
          </div>
        }
      />

      {agentsQuery.error && <div className="mb-5"><ErrorBanner message={agentsQuery.error} onRetry={agentsQuery.refresh} /></div>}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total agents", value: agents.length, icon: UsersIcon, tone: "indigo" as Tone },
          { label: "Working", value: working, icon: ActivityIcon, tone: "emerald" as Tone },
          { label: "Strong models", value: strong, icon: CpuIcon, tone: "violet" as Tone },
          { label: "Departments", value: DEPARTMENTS.length, icon: LayersIcon, tone: "cyan" as Tone },
        ].map((item) => {
          const Icon = item.icon;
          const color = toneClasses[item.tone];
          return (
            <div key={item.label} className="flex items-center justify-between rounded-xl border border-line bg-panel/80 p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{item.label}</p>
                <p className="mt-1.5 text-xl font-semibold tabular-nums text-zinc-50"><NumberTicker value={item.value} className="text-xl font-semibold tabular-nums text-zinc-50" /></p>
              </div>
              <Icon className={cn("h-5 w-5", color.text)} />
            </div>
          );
        })}
      </div>

      {agentsQuery.loading && agents.length === 0 ? (
        <Panel><LoadingState label="Loading organization…" /></Panel>
      ) : (
        <>
          <OrgTree agents={agents} />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Departments</h2>
              <p className="mt-1 text-xs text-muted">Grouped by function, ordered by reporting hierarchy.</p>
            </div>
            <label className="relative block w-full max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search agents or roles…"
                className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500/60 focus:outline-none"
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <Panel className="mt-4"><EmptyState icon={<SearchIcon className="h-5 w-5" />} title="No matching agents" description="Try a different name, role or department." /></Panel>
          ) : (
            <div className="mt-4 space-y-5">
              {DEPARTMENTS.map((department, index) => {
                const members = byDepartment[department.id] ?? [];
                if (members.length === 0) return null;
                const Icon = department.icon;
                const color = toneClasses[department.tone];
                return (
                  <BlurFade key={department.id} delay={0.04 + index * 0.05} offset={10} blur="6px">
                  <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-surface/60">
                    <header className="flex flex-wrap items-center gap-3 border-b border-line/70 bg-panel/40 px-4 py-3">
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", color.bg, color.border, color.text)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <h3 className="text-[13px] font-semibold text-zinc-100">{department.label}</h3>
                        <p className="text-[11px] text-zinc-500">{department.description}</p>
                      </div>
                      <span className="rounded-full border border-line bg-elevated px-2.5 py-1 text-[10px] font-medium text-zinc-400">
                        {members.length} {members.length === 1 ? "agent" : "agents"}
                      </span>
                    </header>
                    <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {members.map((agent) => <AgentCard key={agent.id} agent={agent} agents={agents} />)}
                    </div>
                  </section>
                  </BlurFade>
                );
              })}
              {Object.keys(byDepartment).some((key) => !DEPARTMENTS.some((department) => department.id === key)) && (
                <p className="text-xs text-amber-300">Some agents belong to an unrecognized department and are hidden by this view.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
