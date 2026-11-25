"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIcon, SearchIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, LiveIndicator, LoadingState } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AnimatedSpan, Terminal } from "@/components/ui/terminal";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import type { FeedEvent } from "@/lib/types";

const EMPTY_EVENTS: FeedEvent[] = [];
import { cn, eventTone, formatTime, safeJson, titleize, toneClasses } from "@/lib/utils";
import { api } from "@/services/api";

export function EventsTab({ projectId, connected }: { projectId: string; connected: boolean }) {
  const history = usePolling(() => api.events(projectId, 200), 4000, `events-${projectId}`);
  const live = useAppStore((state) => state.eventsByProject[projectId] ?? EMPTY_EVENTS);
  const [query, setQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const knownKeys = useRef<Set<string> | null>(null);
  const lastCount = useRef(0);

  const events = useMemo(() => {
    const merged = new Map<string, FeedEvent>();
    for (const event of [...(history.data ?? []), ...live]) {
      const key = `${event.type}|${event.message}|${event.agent_id}|${event.timestamp}`;
      const existing = merged.get(key);
      if (!existing || (event.live && !existing.live)) merged.set(key, event);
    }
    return [...merged.values()].sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
  }, [history.data, live]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((event) =>
      [event.type, event.message, event.agent_id, event.task_id].some((field) => field.toLowerCase().includes(needle)),
    );
  }, [events, query]);

  // Remember which lines were already on screen; only appended lines slide in.
  const rows = useMemo(
    () =>
      filtered.map((event) => ({
        event,
        isNew: knownKeys.current !== null && !knownKeys.current.has(event.key),
      })),
    [filtered]
  );

  useEffect(() => {
    knownKeys.current = new Set(filtered.map((event) => event.key));
  }, [filtered]);

  useEffect(() => {
    if (!autoScroll || !scrollRef.current || filtered.length === lastCount.current) return;
    lastCount.current = filtered.length;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [filtered.length, autoScroll]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <LiveIndicator connected={connected} />
          <span>· {events.length} events</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground">
            <Switch
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
              aria-label="Auto-scroll events"
              className="bg-input data-[checked]:bg-foreground"
            />
            Auto-scroll {autoScroll ? "on" : "off"}
          </label>
          <label className="relative block w-full max-w-[220px]">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter events…"
              className="h-9 bg-white pl-9 text-xs"
              aria-label="Filter events"
            />
          </label>
        </div>
      </div>

      {history.error && <div className="mb-4"><ErrorBanner message={history.error} onRetry={history.refresh} /></div>}

      <div ref={scrollRef} className="max-h-[520px] min-h-[300px] overflow-y-auto rounded-xl">
        <Terminal
          sequence={false}
          showCaret
          className="max-w-none rounded-xl border-black/[0.07] bg-[#fafafa] shadow-panel"
        >
          <AnimatedSpan className="mb-1 font-mono text-[10px] text-muted-foreground">
            organization://{projectId.slice(0, 12)}/events · {events.length} records
          </AnimatedSpan>
          {history.loading && events.length === 0 ? (
            <AnimatedSpan><LoadingState label="Loading event history…" /></AnimatedSpan>
          ) : filtered.length === 0 ? (
            <AnimatedSpan>
              <EmptyState icon={<ActivityIcon className="h-5 w-5" />} title={query ? "No matching events" : "No events yet"} description="Agent activity streams here in real time." />
            </AnimatedSpan>
          ) : (
            rows.map(({ event, isNew }) => {
              const tone = toneClasses[eventTone(event.type)];
              const dataEntries = Object.entries(event.data);
              return (
                <AnimatedSpan
                  key={event.key}
                  animateOnMount={isNew}
                  className="grid grid-cols-[auto_1fr] gap-x-3 rounded px-2 py-1.5 font-mono hover:bg-black/[0.03]"
                >
                  <time className="text-[10px] tabular-nums text-muted-foreground">{formatTime(event.timestamp)}</time>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("text-[10px] font-semibold uppercase tracking-wider", tone.text)}>[{titleize(event.type)}]</span>
                      <span className="text-[10px] text-muted-foreground">{event.agent_id}</span>
                      {event.task_id && <span className="text-[9px] text-muted-foreground">{event.task_id.slice(0, 10)}</span>}
                      {event.live && <span className="rounded bg-muted px-1 text-[8px] uppercase text-muted-foreground">live</span>}
                    </span>
                    <span className="mt-0.5 block break-words text-[11px] leading-relaxed text-foreground">{event.message || "—"}</span>
                    {dataEntries.length > 0 && (
                      <span className="mt-0.5 block break-all text-[10px] text-muted-foreground">{safeJson(event.data)}</span>
                    )}
                  </span>
                </AnimatedSpan>
              );
            })
          )}
        </Terminal>
      </div>
    </div>
  );
}
