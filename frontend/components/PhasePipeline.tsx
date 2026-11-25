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
    <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
      {PHASES.map((phase, index) => {
        const done = isComplete || (currentIndex >= 0 && index < currentIndex);
        const active = !isComplete && (currentIndex === index || (currentIndex < 0 && index === 0));
        const tone = done ? "bg-emerald-400" : active ? "bg-indigo-400 animate-pulse-soft" : "bg-zinc-800";
        const count = counts?.[phase];
        return (
          <div key={phase} className="min-w-[86px] flex-1">
            <div className={cn("h-1.5 rounded-full transition-colors duration-500", tone)} />
            <div className="mt-2.5 flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  done ? "bg-emerald-400" : active ? "bg-indigo-400" : "bg-zinc-700",
                )}
              />
              <p
                className={cn(
                  "truncate text-[10px] font-medium",
                  active ? "text-indigo-200" : done ? "text-zinc-400" : "text-zinc-600",
                )}
                title={titleize(phase)}
              >
                {titleize(phase)}
              </p>
            </div>
            {count && (
              <p className="mt-1 pl-3 text-[10px] tabular-nums text-zinc-600">
                {count.done}/{count.total} tasks
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
