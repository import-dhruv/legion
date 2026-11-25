"use client";

import { useState } from "react";
import { ChevronDownIcon, DocIcon, LayersIcon, SparkIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, JsonBlock, LoadingState, StatusBadge } from "@/components/ui";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { PhasePipeline } from "@/components/PhasePipeline";
import { usePolling } from "@/hooks/usePolling";
import type { Project } from "@/lib/types";
import { cn, formatDateTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";

export function OverviewTab({ projectId, project }: { projectId: string; project?: Project | null }) {
  const artifacts = usePolling(() => api.artifacts(projectId), 5000, `artifacts-${projectId}`);
  const [expanded, setExpanded] = useState<string | null>(null);
  const items = artifacts.data ?? [];

  return (
    <div className="space-y-6">
      {artifacts.error && <ErrorBanner message={artifacts.error} onRetry={artifacts.refresh} />}

      <BlurFade delay={0.03} offset={8}>
        <div className="grid gap-3 sm:grid-cols-3">
          <MagicCard gradientColor="rgba(129,140,248,0.10)" className="rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Current phase</p>
            <p className="mt-2 text-sm font-semibold text-indigo-200">{titleize(project?.phase ?? "—")}</p>
          </MagicCard>
          <MagicCard gradientColor="rgba(52,211,153,0.10)" className="rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Execution state</p>
            <div className="mt-2"><StatusBadge status={project?.status ?? "loading"} /></div>
          </MagicCard>
          <MagicCard gradientColor="rgba(34,211,238,0.10)" className="rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Control</p>
            <div className="mt-2"><StatusBadge status={project?.control ?? "loading"} /></div>
          </MagicCard>
        </div>
      </BlurFade>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <SparkIcon className="h-3.5 w-3.5 text-indigo-300" /> Requirement
        </h3>
        <MagicCard gradientColor="rgba(129,140,248,0.10)" className="rounded-lg">
          <BorderBeam size={80} duration={10} borderWidth={1} colorFrom="#a78bfa" colorTo="#22d3ee" className="opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="relative z-40 whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-zinc-300">
            {project?.requirement ?? "Loading requirement…"}
          </p>
        </MagicCard>
      </div>

      {project?.summary && (
        <BlurFade delay={0.08} offset={8}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <LayersIcon className="h-3.5 w-3.5 text-emerald-300" /> Executive summary
          </h3>
          <p className="whitespace-pre-wrap rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] p-4 text-[12px] leading-relaxed text-zinc-300">
            {project.summary}
          </p>
        </BlurFade>
      )}

      <div>
        <h3 className="mb-3 text-xs font-semibold text-zinc-200">Execution pipeline</h3>
        <PhasePipeline currentPhase={project?.phase} />
      </div>

      {project && Object.keys(project.config).length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-zinc-200">Configuration</h3>
          <JsonBlock value={project.config} />
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <DocIcon className="h-3.5 w-3.5 text-cyan-300" /> Artifacts
            {items.length > 0 && <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400">{items.length}</span>}
          </h3>
        </div>
        {artifacts.loading && items.length === 0 ? (
          <LoadingState label="Loading artifacts…" />
        ) : items.length === 0 ? (
          <EmptyState icon={<DocIcon className="h-5 w-5" />} title="No artifacts yet" description="Agents publish documents, plans and specifications here as they work." />
        ) : (
          <div className="space-y-2">
            {items.map((artifact) => {
              const open = expanded === artifact.id;
              return (
                <div key={artifact.id} className="overflow-hidden rounded-lg border border-line bg-canvas/40">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : artifact.id)}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.025]"
                  >
                    <DocIcon className="h-4 w-4 shrink-0 text-indigo-300" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-zinc-200">{artifact.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-zinc-600">
                        {titleize(artifact.kind)} · v{artifact.version} · {formatDateTime(artifact.created_at)}
                      </span>
                    </span>
                    <ChevronDownIcon className={cn("h-3.5 w-3.5 text-zinc-600 transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <pre className="max-h-72 overflow-auto border-t border-line bg-canvas/80 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
                      {artifact.content || "(empty artifact)"}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
