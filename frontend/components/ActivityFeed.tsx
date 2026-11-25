"use client";

import { ActivityIcon } from "@/components/Icons";
import { EmptyState } from "@/components/ui";
import type { FeedEvent } from "@/lib/types";
import { cn, eventTone, formatTime, titleize, toneClasses } from "@/lib/utils";

export function ActivityFeed({
  events,
  emptyLabel = "Waiting for activity from the organization…",
  max = 12,
}: {
  events: FeedEvent[];
  emptyLabel?: string;
  max?: number;
}) {
  const sorted = [...events].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, max);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<ActivityIcon className="h-5 w-5" />}
        title="No activity yet"
        description={emptyLabel}
      />
    );
  }

  return (
    <ul className="space-y-0.5">
      {sorted.map((event) => {
        const tone = toneClasses[eventTone(event.type)];
        return (
          <li
            key={event.key}
            className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
          >
            <div className="relative flex w-3 shrink-0 justify-center pt-1.5">
              <span className={cn("h-2 w-2 rounded-full ring-4 ring-panel", tone.dot)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn("text-[11px] font-semibold", tone.text)}>{titleize(event.type)}</span>
                <span className="truncate text-[11px] text-zinc-500">{event.agent_id}</span>
                {event.live && (
                  <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-300">
                    live
                  </span>
                )}
              </div>
              <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-300">{event.message || "—"}</p>
            </div>
            <time className="shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-zinc-600">
              {formatTime(event.timestamp)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
