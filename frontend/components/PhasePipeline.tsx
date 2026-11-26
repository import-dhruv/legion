"use client";

import { cn, titleize } from "@/lib/utils";

export const PHASES = [
  "discovery",
  "planning",
  "development_plan",
  "implementation",
  "testing",
  "review",
  "debugging",
  "deployment",
  "maintenance",
  "completed",
];

export function PhasePipeline({
  currentPhase,
  counts,
}: {
  currentPhase?: string;
  counts?: Record<string, { done: number; total: number }>;
}) {
  const currentIndex = PHASES.indexOf(currentPhase ?? "");
  const isComplete = currentPhase === "completed" || currentPhase === "verified";

  return (
    <div className="no-scrollbar flex items-stretch gap-2 overflow-x-auto pb-2">
      {PHASES.map((phase, index) => {
        const done = isComplete || (currentIndex >= 0 && index < currentIndex);
        const active = !isComplete && (currentIndex === index || (currentIndex < 0 && index === 0));
        const count = counts?.[phase];
        return (
          <div key={phase} className="min-w-20 flex-1">
            <div
              className={cn(
                "relative h-1.5 overflow-hidden rounded-full transition-all duration-700",
                done ? "bg-muted" : active ? "bg-muted" : "bg-muted",
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-full rounded-full transition-transform duration-700",
                  done
                    ? "bg-gradient-to-r from-foreground/80 to-foreground/40 shadow-[0_0_12px_rgba(0, 0, 0,0.6)]"
                    : active
                      ? "bg-gradient-to-r from-foreground via-foreground/70 to-foreground shadow-[0_0_14px_rgba(0, 0, 0,0.7)] animate-pulse-soft"
                      : "bg-transparent",
                )}
              />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  done ? "bg-muted" : active ? "bg-muted shadow-[0_0_8px_rgba(0, 0, 0,0.9)]" : "bg-muted",
                )}
              />
              <p
                className={cn(
                  "truncate text-[10px] font-medium transition-colors",
                  active ? "text-muted-foreground" : done ? "text-muted-foreground" : "text-muted-foreground",
                )}
                title={titleize(phase)}
              >
                {titleize(phase)}
              </p>
            </div>
            {count && (
              <p className="mt-1 pl-3 text-[10px] tabular-nums text-muted-foreground">
                {count.done}/{count.total} tasks
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
