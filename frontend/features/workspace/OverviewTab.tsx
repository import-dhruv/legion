"use client";

import { DocIcon, LayersIcon, SparkIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, JsonBlock, LoadingState, StatusBadge } from "@/components/ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { PhasePipeline } from "@/components/PhasePipeline";
import { usePolling } from "@/hooks/usePolling";
import type { Project } from "@/lib/types";
import { formatDateTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";

export function OverviewTab({ projectId, project }: { projectId: string; project?: Project | null }) {
  const artifacts = usePolling(() => api.artifacts(projectId), 5000, `artifacts-${projectId}`);
  const items = artifacts.data ?? [];

  return (
    <div className="space-y-6">
      {artifacts.error && <ErrorBanner message={artifacts.error} onRetry={artifacts.refresh} />}

      <BlurFade delay={0.03} offset={8}>
        <div className="grid gap-3 sm:grid-cols-3">
          <MagicCard gradientColor="rgba(0, 0, 0,0.10)" className="rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current phase</p>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">{titleize(project?.phase ?? "—")}</p>
          </MagicCard>
          <MagicCard gradientColor="rgba(0, 0, 0,0.10)" className="rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Execution state</p>
            <div className="mt-2"><StatusBadge status={project?.status ?? "loading"} /></div>
          </MagicCard>
          <MagicCard gradientColor="rgba(0, 0, 0,0.10)" className="rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Control</p>
            <div className="mt-2"><StatusBadge status={project?.control ?? "loading"} /></div>
          </MagicCard>
        </div>
      </BlurFade>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
          <SparkIcon className="h-3.5 w-3.5 text-muted-foreground" /> Requirement
        </h3>
        <MagicCard gradientColor="rgba(0, 0, 0,0.10)" className="rounded-lg">
          <BorderBeam size={80} duration={10} borderWidth={1} colorFrom="#737373" colorTo="#171717" className="opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <p className="relative z-40 whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-foreground">
            {project?.requirement ?? "Loading requirement…"}
          </p>
        </MagicCard>
      </div>

      {project?.summary && (
        <BlurFade delay={0.08} offset={8}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
            <LayersIcon className="h-3.5 w-3.5 text-muted-foreground" /> Executive summary
          </h3>
          <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-4 text-[12px] leading-relaxed text-foreground">
            {project.summary}
          </p>
        </BlurFade>
      )}

      <div>
        <h3 className="mb-3 text-xs font-semibold text-foreground">Execution pipeline</h3>
        <PhasePipeline currentPhase={project?.phase} />
      </div>

      {project && Object.keys(project.config).length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-foreground">Configuration</h3>
          <JsonBlock value={project.config} />
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <DocIcon className="h-3.5 w-3.5 text-muted-foreground" /> Artifacts
            {items.length > 0 && <Badge variant="outline" className="h-auto px-1.5 py-0 text-[10px] tabular-nums text-muted-foreground">{items.length}</Badge>}
          </h3>
        </div>
        {artifacts.loading && items.length === 0 ? (
          <LoadingState label="Loading artifacts…" />
        ) : items.length === 0 ? (
          <EmptyState icon={<DocIcon className="h-5 w-5" />} title="No artifacts yet" description="Agents publish documents, plans and specifications here as they work." />
        ) : (
          <Accordion className="space-y-2">
            {items.map((artifact) => (
              <AccordionItem
                key={artifact.id}
                value={artifact.id}
                className="overflow-hidden rounded-lg border border-border bg-muted/20"
              >
                <AccordionTrigger className="gap-3 px-3.5 py-3 text-left hover:no-underline">
                  <DocIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">{artifact.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                      {titleize(artifact.kind)} · v{artifact.version} · {formatDateTime(artifact.created_at)}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <pre className="max-h-72 overflow-auto border-t border-border bg-background p-4 font-mono text-[11px] leading-relaxed text-foreground">
                    {artifact.content || "(empty artifact)"}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
