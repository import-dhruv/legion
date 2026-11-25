"use client";

import { useEffect, useRef } from "react";
import { ActivityIcon } from "@/components/Icons";
import { AnimatedList } from "@/components/ui/animated-list";
import { EmptyState } from "@/components/ui";
import type { FeedEvent } from "@/lib/types";
import { cn, eventTone, formatTime, titleize, toneClasses } from "@/lib/utils";

export function ActivityFeed({
  events,
  emptyLabel = "Waiting for activity from the organization…",
  max = 12,
  animated = false,
}: {
  events: FeedEvent[];
  emptyLabel?: string;
  max?: number;
  animated?: boolean;
}) {
  const sorted = [...events].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, max);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastTopKey = useRef<string | null>(null);
  const topKey = sorted[0]?.key ?? null;

  // Newest events are rendered first. Only move the scroll position when a
  // genuinely new event arrives, not on every polling refresh.
  useEffect(() => {
    if (!topKey || lastTopKey.current === topKey) return;
    lastTopKey.current = topKey;
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [topKey]);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<ActivityIcon className="h-5 w-5" />}
        title="No activity yet"
        description={emptyLabel}
      />
    );
  }

  const Row = animated ? "div" : "li";
  const rows = sorted.map((event) => {
    const tone = toneClasses[eventTone(event.type)];
    return (
      <Row
        key={event.key}
        className={cn(
          "group relative flex items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-all",
          animated
            ? "bg-black/[0.015] hover:border-black/[0.07] hover:bg-black/[0.04]"
            : "hover:bg-black/[0.03]",
        )}
      >
        <div className="relative flex w-3 shrink-0 justify-center pt-1.5">
          {event.live && (
            <span aria-hidden="true" className={cn("absolute left-1/2 top-1.5 h-2 w-2 -translate-x-1/2 animate-pulse-ring rounded-full", tone.dot)} />
          )}
          <span className={cn("relative h-2 w-2 rounded-full ring-4 ring-background", tone.dot)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("text-[11px] font-semibold", tone.text)}>{titleize(event.type)}</span>
            <span className="truncate text-[11px] text-muted-foreground">{event.agent_id}</span>
            {event.live && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                live
              </span>
            )}
          </div>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-foreground">{event.message || "—"}</p>
        </div>
        <time className="shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatTime(event.timestamp)}
        </time>
      </Row>
    );
  });

  const content = animated ? <AnimatedList>{rows}</AnimatedList> : <ul className="space-y-0.5">{rows}</ul>;

  return (
    <div ref={scrollRef} className="max-h-[360px] overflow-y-auto overscroll-contain pr-0.5">
      {content}
    </div>
  );
}
