"use client";

import { useMemo, useState } from "react";
import { AlertIcon, CheckIcon, ChevronRightIcon, SearchIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { BlurFade } from "@/components/ui/blur-fade";
import { MagicCard } from "@/components/ui/magic-card";
import { usePolling } from "@/hooks/usePolling";
import type { Task } from "@/lib/types";
import { cn, shortId, statusTone, titleize, toneClasses } from "@/lib/utils";
import { api } from "@/services/api";

const COLUMNS = [
  { id: "pending", label: "Pending", tone: "amber" as const },
  { id: "in_progress", label: "In progress", tone: "indigo" as const },
  { id: "completed", label: "Completed", tone: "emerald" as const },
  { id: "blocked", label: "Blocked", tone: "rose" as const },
  { id: "failed", label: "Failed", tone: "rose" as const },
];

export function TaskBoardTab({ projectId }: { projectId: string }) {
  const tasksQuery = usePolling(() => api.tasks(projectId), 4000, `board-${projectId}`);
  const agentsQuery = usePolling(() => api.agents(), 10000, "board-agents");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string[]>([]);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const tasks = tasksQuery.data ?? [];
  const agents = agentsQuery.data ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? tasks.filter((task) => [task.title, task.phase, task.assigned_agent].some((f) => f.toLowerCase().includes(needle)))
      : tasks;
    return [...list].sort((a, b) => a.priority - b.priority);
  }, [tasks, query]);

  const grouped = useMemo(() => {
    const result: Record<string, Task[]> = {};
    for (const task of filtered) (result[task.status] ??= []).push(task);
    return result;
  }, [filtered]);

  const update = async (taskId: string, body: { assigned_agent?: string; priority?: number }) => {
    setBusy((current) => [...current, taskId]);
    setUpdateError(null);
    try {
      await api.updateTask(projectId, taskId, body);
      tasksQuery.refresh();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Unable to update task");
    } finally {
      setBusy((current) => current.filter((id) => id !== taskId));
    }
  };

  const agentName = (id: string) => agents.find((agent) => agent.id === id)?.name ?? id;

  return (
    <div>
      {tasksQuery.error && <div className="mb-4"><ErrorBanner message={tasksQuery.error} onRetry={tasksQuery.refresh} /></div>}
      {updateError && <div className="mb-4"><ErrorBanner message={updateError} /></div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span><span className="font-semibold text-foreground">{tasks.length}</span> tasks</span>
          <span className="text-muted-foreground">·</span>
          <span><span className="font-semibold text-muted-foreground">{tasks.filter((t) => t.status === "completed").length}</span> completed</span>
          <span className="text-muted-foreground">·</span>
          <span><span className="font-semibold text-muted-foreground">{tasks.filter((t) => t.status === "failed" || t.status === "blocked").length}</span> blocked/failed</span>
        </div>
        <label className="relative block w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter tasks…"
            className="h-9 bg-white pl-9 text-xs"
            aria-label="Filter tasks"
          />
        </label>
      </div>

      {tasksQuery.loading && tasks.length === 0 ? (
        <LoadingState label="Loading task board…" />
      ) : tasks.length === 0 ? (
        <EmptyState icon={<CheckIcon className="h-5 w-5" />} title="No tasks yet" description="Tasks appear here as the organization plans the work." />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {COLUMNS.map((column, columnIndex) => {
            const items = grouped[column.id] ?? [];
            const color = toneClasses[column.tone];
            return (
              <BlurFade key={column.id} delay={columnIndex * 0.05} offset={10} blur="5px">
              <div className="flex w-[270px] shrink-0 flex-col rounded-xl border border-black/[0.06] bg-gradient-to-b from-black/[0.025] to-transparent">
                <div className="flex items-center justify-between border-b border-line/70 px-3.5 py-3">
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <span className={cn("h-2 w-2 rounded-full", color.dot)} />
                    {column.label}
                  </span>
                  <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 p-2.5">
                  {items.length === 0 && <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">No tasks</p>}
                  {items.map((task) => (
                    <MagicCard key={task.id} gradientColor="rgba(0, 0, 0,0.10)" className="rounded-lg p-3 transition-transform duration-200 hover:-translate-y-px">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[12px] font-medium leading-snug text-foreground">{task.title}</h4>
                        <span className={cn("shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px]", toneClasses[statusTone(task.priority > 6 ? "blocked" : "running")].text, "bg-elevated")}>
                          P{task.priority}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{titleize(task.phase)}</span>
                        {task.retry_count > 0 && <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">retry {task.retry_count}</span>}
                        <span className="font-mono text-muted-foreground" title={task.id}>{shortId(task.id, 10)}</span>
                      </div>

                      <label className="mt-3 block">
                        <span className="mb-1 block text-[9px] uppercase tracking-wider text-muted-foreground">Assigned agent</span>
                        <select
                          value={task.assigned_agent}
                          disabled={busy.includes(task.id)}
                          onChange={(event) => void update(task.id, { assigned_agent: event.target.value })}
                          className="w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-[11px] text-foreground focus:border-border focus:outline-none disabled:opacity-50"
                        >
                          {!agents.some((agent) => agent.id === task.assigned_agent) && (
                            <option value={task.assigned_agent}>{task.assigned_agent}</option>
                          )}
                          {agents.map((agent) => (
                            <option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>
                          ))}
                        </select>
                      </label>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Priority</span>
                        <select
                          value={task.priority}
                          disabled={busy.includes(task.id)}
                          onChange={(event) => void update(task.id, { priority: Number(event.target.value) })}
                          className="rounded-md border border-line bg-canvas px-2 py-1 text-[11px] tabular-nums text-foreground focus:border-border focus:outline-none disabled:opacity-50"
                        >
                          {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>

                      {task.dependencies.length > 0 && (
                        <div className="mt-3 border-t border-line/70 pt-2">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Depends on</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {task.dependencies.map((dependency) => (
                              <span key={dependency} className="inline-flex items-center gap-0.5 rounded bg-elevated px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                                <ChevronRightIcon className="h-2.5 w-2.5 text-muted-foreground" />
                                {shortId(dependency, 10)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {task.error && <p className="mt-2 flex gap-1.5 text-[10px] leading-relaxed text-muted-foreground"><AlertIcon className="mt-0.5 h-3 w-3 shrink-0" /> {task.error}</p>}
                      {task.status === "completed" && task.result && (
                        <p className="mt-2 line-clamp-2 border-t border-line/70 pt-2 text-[10px] leading-relaxed text-muted-foreground">{task.result}</p>
                      )}
                      <p className="mt-2 truncate text-[9px] text-muted-foreground">
                        {agentName(task.assigned_agent)} · {task.logs.length} log entries
                      </p>
                    </MagicCard>
                  ))}
                </div>
              </div>
              </BlurFade>
            );
          })}
        </div>
      )}
    </div>
  );
}
