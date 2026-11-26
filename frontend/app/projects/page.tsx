"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, FolderIcon, LayersIcon, PlusIcon, SearchIcon, SparkIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, LoadingState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/Reveal";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { SparklesText } from "@/components/ui/sparkles-text";
import { PhasePipeline, PHASES } from "@/components/PhasePipeline";
import { usePolling } from "@/hooks/usePolling";
import { stagger } from "@/lib/motion";
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
        title={<SparklesText sparklesCount={5} colors={{ first: "#737373", second: "#525252" }} className="text-2xl font-semibold tracking-tight sm:text-[28px]">Projects</SparklesText>}
        description="Every project is a self-contained run of the autonomous organization — from discovery to deployment."
        action={
          <ShimmerButton
            onClick={() => router.push("/projects/new")}
            shimmerColor="#d4d4d4"
            background="linear-gradient(135deg, #171717, #404040 55%, #a3a3a3)"
            className="w-full px-4 py-2.5 text-[13px] font-semibold shadow-[0_10px_30px_-12px_rgba(0, 0, 0,0.9)] sm:w-auto"
          >
            <PlusIcon className="mr-2 h-4 w-4" /> New project
          </ShimmerButton>
        }
      />

      {projectsQuery.error && <div className="mb-4"><ErrorBanner message={projectsQuery.error} onRetry={projectsQuery.refresh} /></div>}

      <Panel className="mb-4" bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label className="relative block w-full flex-1 sm:min-w-56">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects by name, requirement or phase…"
              className="h-9 bg-white pl-9 text-xs"
              aria-label="Search projects"
            />
          </label>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground"><NumberTicker value={filtered.length} className="text-[11px] font-semibold text-foreground" /></span> of {projects.length} projects
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
                <ShimmerButton onClick={() => router.push("/projects/new")} background="rgba(0, 0, 0,0.15)" className="mt-1 border border-border px-3 py-2 text-xs font-medium">
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
              <Reveal key={project.id} delay={index * stagger}>
              <MagicCard
                gradientColor="rgba(0, 0, 0,0.12)"
                gradientFrom="#737373"
                gradientTo="#171717"
                className="group h-full rounded-xl p-4 shadow-panel transition-transform duration-300 hover:-translate-y-0.5 sm:p-5"
              >
                <ShineBorder
                  borderWidth={1}
                  duration={10}
                  shineColor={["#737373", "#171717", "#525252", "#737373"]}
                  className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <BorderBeam size={70} duration={9} borderWidth={1} colorFrom="#737373" colorTo="#171717" className="opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <Link href={`/projects/${project.id}`} className="relative z-40 flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                      <LayersIcon className="h-[17px] w-[17px]" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground group-hover:text-primary-foreground">{project.name}</h2>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{project.requirement}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge status={active ? project.status : project.control} />
                  <span className="rounded-full border border-line bg-elevated px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                    Phase: {titleize(project.phase)}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{project.id.slice(0, 14)}…</span>
                </div>

                <div className="mt-4 border-t border-line/70 pt-3">
                  <PhasePipeline currentPhase={project.phase} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Created {formatDateTime(project.created_at)}</span>
                  <span>Updated {formatDateTime(project.updated_at)}</span>
                </div>
                </Link>
              </MagicCard>
              </Reveal>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-dashed border-line bg-surface/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SparkIcon className="h-4 w-4 text-muted-foreground" />
          <p className="flex-1 text-xs text-muted-foreground">
            The organization runs {PHASES.length} phases — discovery through maintenance — assigning each task to a specialist agent.
          </p>
          <Link href="/agents" className={cn("text-xs font-medium text-muted-foreground hover:text-muted-foreground")}>
            Meet the agents →
          </Link>
        </div>
      </div>
    </div>
  );
}
