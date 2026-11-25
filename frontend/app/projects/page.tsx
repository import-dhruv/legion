"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, FolderIcon, LayersIcon, PlusIcon, SearchIcon, SparkIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { SparklesText } from "@/components/ui/sparkles-text";
import { PhasePipeline, PHASES } from "@/components/PhasePipeline";
import { usePolling } from "@/hooks/usePolling";
import { cn, formatDateTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";

export default function ProjectsPage() {
  const router = useRouter();
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
        title={<SparklesText sparklesCount={5} colors={{ first: "#a78bfa", second: "#67e8f9" }} className="text-2xl font-semibold tracking-tight sm:text-[28px]">Projects</SparklesText>}
        description="Every project is a self-contained run of the autonomous organization — from discovery to deployment."
        action={
          <ShimmerButton
            onClick={() => router.push("/projects/new")}
            shimmerColor="#c7d2fe"
            background="linear-gradient(135deg, #4f46e5, #7c3aed 55%, #2563eb)"
            className="px-4 py-2.5 text-[13px] font-semibold shadow-[0_10px_30px_-12px_rgba(99,102,241,0.9)]"
          >
            <PlusIcon className="mr-2 h-4 w-4" /> New project
          </ShimmerButton>
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
            <span className="font-semibold text-zinc-200"><NumberTicker value={filtered.length} className="text-[11px] font-semibold text-zinc-200" /></span> of {projects.length} projects
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
                <ShimmerButton onClick={() => router.push("/projects/new")} background="rgba(99,102,241,0.15)" className="mt-1 border border-indigo-400/30 px-3 py-2 text-xs font-medium">
                  Start a project
                </ShimmerButton>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((project, index) => {
            const active = project.control === "running";
            return (
              <BlurFade key={project.id} delay={0.03 + index * 0.04} offset={10} blur="6px">
              <MagicCard
                gradientColor="rgba(129,140,248,0.12)"
                gradientFrom="#a78bfa"
                gradientTo="#22d3ee"
                className="group h-full rounded-xl p-5 shadow-panel transition-transform duration-300 hover:-translate-y-0.5"
              >
                <ShineBorder
                  borderWidth={1}
                  duration={10}
                  shineColor={["#a78bfa", "#22d3ee", "#818cf8", "#a78bfa"]}
                  className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <BorderBeam size={70} duration={9} borderWidth={1} colorFrom="#a78bfa" colorTo="#22d3ee" className="opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <Link href={`/projects/${project.id}`} className="relative z-40 flex h-full flex-col">
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
              </MagicCard>
              </BlurFade>
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
