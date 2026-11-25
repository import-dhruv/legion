"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRightIcon, FolderIcon, LayersIcon, PlusIcon, SearchIcon, SparkIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { PhasePipeline, PHASES } from "@/components/PhasePipeline";
import { usePolling } from "@/hooks/usePolling";
import { cn, formatDateTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";

export default function ProjectsPage() {
  const projectsQuery = usePolling(() => api.projects(), 3000, "projects");
  const [query, setQuery] = useState("");
  const projects = projectsQuery.data ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) =>
      [project.name, project.requirement, project.status, project.phase].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    );
  }, [projects, query]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Every project is a self-contained run of the autonomous organization — from discovery to deployment."
        action={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/50 bg-indigo-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_22px_-8px_rgba(99,102,241,0.9)] hover:bg-indigo-400"
          >
            <PlusIcon className="h-4 w-4" /> New project
          </Link>
        }
      />

      {projectsQuery.error && <div className="mb-5"><ErrorBanner message={projectsQuery.error} onRetry={projectsQuery.refresh} /></div>}

      <Panel className="mb-5" bodyClassName="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="relative block min-w-[220px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects by name, requirement or phase…"
              className="w-full rounded-lg border border-line bg-canvas/60 py-2.5 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500/60 focus:outline-none"
            />
          </label>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="font-semibold text-zinc-200">{filtered.length}</span> of {projects.length} projects
          </div>
        </div>
      </Panel>

      {projectsQuery.loading && projects.length === 0 ? (
        <Panel><LoadingState label="Loading projects…" /></Panel>
      ) : filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<FolderIcon className="h-5 w-5" />}
            title={projects.length === 0 ? "No projects yet" : "No matching projects"}
            description={projects.length === 0 ? "Describe what you want to build and let the organization take it from there." : "Try a different search term."}
            action={
              projects.length === 0 ? (
                <Link href="/projects/new" className="mt-1 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20">
                  Start a project
                </Link>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((project) => {
            const active = project.control === "running";
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex flex-col rounded-xl border border-line bg-panel/80 p-5 shadow-panel transition-all hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-panel"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
                      <LayersIcon className="h-[17px] w-[17px]" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-zinc-100 group-hover:text-white">{project.name}</h2>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{project.requirement}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300" />
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={active ? project.status : project.control} />
                  <span className="rounded-full border border-line bg-elevated px-2.5 py-1 text-[10px] font-medium text-zinc-400">
                    Phase: {titleize(project.phase)}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-zinc-600">{project.id.slice(0, 14)}…</span>
                </div>

                <div className="mt-4 border-t border-line/70 pt-4">
                  <PhasePipeline currentPhase={project.phase} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-600">
                  <span>Created {formatDateTime(project.created_at)}</span>
                  <span>Updated {formatDateTime(project.updated_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-dashed border-line bg-surface/40 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <SparkIcon className="h-4 w-4 text-indigo-300" />
          <p className="flex-1 text-xs text-zinc-400">
            The organization runs {PHASES.length} phases — discovery through maintenance — assigning each task to a specialist agent.
          </p>
          <Link href="/agents" className={cn("text-xs font-medium text-indigo-300 hover:text-indigo-200")}>
            Meet the agents →
          </Link>
        </div>
      </div>
    </div>
  );
}
