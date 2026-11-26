"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Reveal } from "@/components/Reveal";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { SparklesText } from "@/components/ui/sparkles-text";
import { usePolling } from "@/hooks/usePolling";
import type { Agent } from "@/lib/types";
import { stagger } from "@/lib/motion";
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
      gradientColor="rgba(0, 0, 0,0.12)"
      gradientFrom="#737373"
      gradientTo="#171717"
      className="group interactive-surface flex h-full flex-col rounded-xl shadow-panel"
    >
      <ShineBorder
        borderWidth={1}
        duration={14}
        shineColor={["#a3a3a3", "#737373", "#a3a3a3", "#525252"]}
        className="opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100"
      />
      <div className="relative z-40 flex flex-1 flex-col p-4">
      <div className="flex items-start gap-2.5">
        <div className="relative shrink-0">
          <Avatar className="size-10 rounded-xl border border-border bg-gradient-to-br from-muted to-accent">
            <AvatarFallback className="rounded-xl bg-transparent text-sm font-bold text-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", tone.dot)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{agent.name}</h3>
            <Badge variant="outline" className="h-auto rounded px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">L{agent.level}</Badge>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{agent.role}</p>
        </div>
        <StatusBadge status={agent.status} className="shrink-0" />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-border bg-muted px-2 py-1 text-[10px] font-medium capitalize text-muted-foreground">
          {agent.model_tier} model
        </span>
        {permissionChips(agent.permissions).slice(0, 4).map((chip) => (
          <span key={chip} className="rounded-md border border-line bg-elevated/70 px-2 py-1 text-[10px] text-muted-foreground">
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-2.5 space-y-1.5 border-t border-line/70 pt-2.5 text-[11px]">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-muted-foreground">Reports to</span>
          <span className="min-w-0 flex-1 break-words text-right leading-snug text-foreground">
            {manager ? `${manager.name} · ${manager.role}` : "Human CTO"}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-muted-foreground">Current task</span>
          <span className="min-w-0 flex-1 break-words text-right font-mono leading-snug text-muted-foreground">
            {agent.current_task_id ? shortId(agent.current_task_id, 14) : "unassigned"}
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex-1">
        <ul className="space-y-1.5">
          {(expanded ? agent.responsibilities : agent.responsibilities.slice(0, 2)).map((responsibility) => (
            <li key={responsibility} className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
              {responsibility}
            </li>
          ))}
        </ul>
        {agent.responsibilities.length > 2 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-muted-foreground"
          >
            {expanded ? "Show less" : `+${agent.responsibilities.length - 2} more`}
            <ChevronDownIcon className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>

      <p className="mt-2.5 truncate border-t border-black/[0.06] pt-2 font-mono text-[10px] text-muted-foreground" title={agent.id}>
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
    <Panel title="Reporting structure" subtitle="Human CTO → executive leadership → specialized departments" bodyClassName="p-4 sm:p-5" beam>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-xs rounded-xl border border-border bg-gradient-to-br from-muted to-background px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Human CTO</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{cto ? `${cto.name} · ${cto.role}` : "Ada · Chief Technology Officer"}</p>
        </div>
        <div className="h-4 w-px bg-line" />
        <div className="relative h-px w-full max-w-3xl bg-line">
          <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-line" />
        </div>
        <div className="mt-2 grid w-full grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {(directReports.length ? directReports : []).map((agent) => (
            <div key={agent.id} className="relative rounded-lg border border-line bg-elevated/60 px-2.5 py-2 text-center">
              <span className="absolute left-1/2 -top-[13px] h-3 w-px -translate-x-1/2 bg-line" />
              <p className="truncate text-xs font-medium text-foreground">{agent.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{agent.role}</p>
            </div>
          ))}
          {directReports.length === 0 && (
            <p className="col-span-full py-2 text-center text-xs text-muted-foreground">Loading reporting lines…</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function AgentsPage() {
  const agentsQuery = usePolling(() => api.agents(), 5000, "agents");
  const [query, setQuery] = useState("");
  // Start with a few sections open so the org reads as groups, not one wall.
  const [openDepartments, setOpenDepartments] = useState<string[]>(
    DEPARTMENTS.slice(0, 3).map((department) => department.id),
  );

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

  // A search should never hide a match behind a collapsed section.
  useEffect(() => {
    if (!query.trim()) return;
    setOpenDepartments(
      DEPARTMENTS.filter((department) => (byDepartment[department.id] ?? []).length > 0).map(
        (department) => department.id,
      ),
    );
  // Deliberately keyed on the query only: a 5s poll must not undo a manual collapse.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const working = agents.filter((agent) => agent.status === "working").length;
  const strong = agents.filter((agent) => agent.model_tier === "strong").length;

  return (
    <div>
      <Reveal>
      <PageHeader
        eyebrow="Organization"
        title={<SparklesText sparklesCount={4} colors={{ first: "#737373", second: "#525252" }} className="text-2xl font-semibold tracking-tight sm:text-[28px]">The agent org chart</SparklesText>}
        description="A hierarchical engineering organization — every specialist has a role, a reporting line, a model tier and a scoped set of tool permissions."
        action={
          <div className="flex w-full items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-muted-foreground sm:w-auto sm:self-start">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">{agents.length || "—"}</span> agents ·{" "}
            <span className="font-semibold text-muted-foreground">{working}</span> working
          </div>
        }
      />
      </Reveal>

      {agentsQuery.error && <div className="mb-4"><ErrorBanner message={agentsQuery.error} onRetry={agentsQuery.refresh} /></div>}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total agents", value: agents.length, icon: UsersIcon, tone: "indigo" as Tone },
          { label: "Working", value: working, icon: ActivityIcon, tone: "emerald" as Tone },
          { label: "Strong models", value: strong, icon: CpuIcon, tone: "violet" as Tone },
          { label: "Departments", value: DEPARTMENTS.length, icon: LayersIcon, tone: "cyan" as Tone },
        ].map((item, index) => {
          const Icon = item.icon;
          const color = toneClasses[item.tone];
          return (
            <Reveal key={item.label} delay={index * stagger}>
              <Card size="sm" className="interactive-surface shadow-panel">
                <CardContent className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</p>
                    <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
                      <NumberTicker key={item.value} value={item.value} duration={0.9} className="text-xl font-semibold tabular-nums text-foreground" />
                    </p>
                  </div>
                  <Icon className={cn("h-4 w-4 shrink-0", color.text)} />
                </CardContent>
              </Card>
            </Reveal>
          );
        })}
      </div>

      {agentsQuery.loading && agents.length === 0 ? (
        <Panel><LoadingState label="Loading organization…" /></Panel>
      ) : (
        <>
          <Reveal><OrgTree agents={agents} /></Reveal>

          <Reveal className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Departments</h2>
              <p className="mt-1 text-xs text-muted-foreground">Grouped by function, ordered by reporting hierarchy.</p>
            </div>
            <label className="relative block w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search agents or roles…"
                className="h-9 bg-white pl-9 text-xs"
                aria-label="Search agents"
              />
            </label>
          </Reveal>

          {filtered.length === 0 ? (
            <Panel className="mt-4"><EmptyState icon={<SearchIcon className="h-5 w-5" />} title="No matching agents" description="Try a different name, role or department." /></Panel>
          ) : (
            <div className="mt-4 space-y-3">
              <Accordion
                multiple
                value={openDepartments}
                onValueChange={(value) => setOpenDepartments(value.map(String))}
              >
                {DEPARTMENTS.map((department, index) => {
                  const members = byDepartment[department.id] ?? [];
                  if (members.length === 0) return null;
                  const Icon = department.icon;
                  const color = toneClasses[department.tone];
                  return (
                    <Reveal key={department.id} delay={Math.min(index, 8) * stagger}>
                      <AccordionItem
                        value={department.id}
                        className="overflow-hidden rounded-xl border border-black/[0.06] bg-surface/60"
                      >
                        <AccordionTrigger className="w-full gap-3 border-b border-line/70 bg-panel/40 px-4 py-3 text-left hover:no-underline">
                          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", color.bg, color.border, color.text)}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-semibold text-foreground">{department.label}</span>
                              <span className="block text-[11px] text-muted-foreground">{department.description}</span>
                            </span>
                            <span className="rounded-full border border-line bg-elevated px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                              {members.length} {members.length === 1 ? "agent" : "agents"}
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                            {members.map((agent) => <AgentCard key={agent.id} agent={agent} agents={agents} />)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Reveal>
                  );
                })}
              </Accordion>
              {Object.keys(byDepartment).some((key) => !DEPARTMENTS.some((department) => department.id === key)) && (
                <p className="text-xs text-muted-foreground">Some agents belong to an unrecognized department and are hidden by this view.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
