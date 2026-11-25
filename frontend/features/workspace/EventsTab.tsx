"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIcon, SearchIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, LiveIndicator, LoadingState } from "@/components/ui";
import { AnimatedSpan, Terminal } from "@/components/ui/terminal";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import type { FeedEvent } from "@/lib/types";
import { cn, eventTone, formatTime, safeJson, titleize, toneClasses } from "@/lib/utils";
import { api } from "@/services/api";

export function EventsTab({ projectId, connected }: { projectId: string; connected: boolean }) {
  const history = usePolling(() => api.events(projectId, 200), 4000, `events-${projectId}`);
  const live = useAppStore((state) => state.eventsByProject[projectId] ?? []);
  const [query, setQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <LiveIndicator connected={connected} />
          <span>· {events.length} events</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoScroll((value) => !value)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors",
              autoScroll ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-200" : "border-line bg-elevated text-zinc-500",
            )}
          >
            Auto-scroll {autoScroll ? "on" : "off"}
          </button>
          <label className="relative block w-full max-w-[220px]">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter events…"
              className="w-full rounded-lg border border-line bg-canvas/60 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500/60 focus:outline-none"
            />
          </label>
        </div>
      </div>

      {history.error && <div className="mb-4"><ErrorBanner message={history.error} onRetry={history.refresh} /></div>}

      <div ref={scrollRef} className="max-h-[520px] min-h-[300px] overflow-y-auto rounded-xl">
        <Terminal
          sequence={false}
          className="max-w-none rounded-xl border-white/[0.07] bg-[#07080b] shadow-panel"
        >
          <AnimatedSpan className="mb-1 font-mono text-[10px] text-zinc-500">
            organization://{projectId.slice(0, 12)}/events · {events.length} records
          </AnimatedSpan>
          {history.loading && events.length === 0 ? (
            <AnimatedSpan><LoadingState label="Loading event history…" /></AnimatedSpan>
          ) : filtered.length === 0 ? (
            <AnimatedSpan>
              <EmptyState icon={<ActivityIcon className="h-5 w-5" />} title={query ? "No matching events" : "No events yet"} description="Agent activity streams here in real time." />
            </AnimatedSpan>
          ) : (
            filtered.map((event) => {
              const tone = toneClasses[eventTone(event.type)];
              const dataEntries = Object.entries(event.data);
              return (
                <AnimatedSpan
                  key={event.key}
                  className="grid grid-cols-[auto_1fr] gap-x-3 rounded px-2 py-1.5 font-mono hover:bg-white/[0.03]"
                >
                  <time className="text-[10px] tabular-nums text-zinc-700">{formatTime(event.timestamp)}</time>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("text-[10px] font-semibold uppercase tracking-wider", tone.text)}>[{titleize(event.type)}]</span>
                      <span className="text-[10px] text-cyan-400/80">{event.agent_id}</span>
                      {event.task_id && <span className="text-[9px] text-zinc-700">{event.task_id.slice(0, 10)}</span>}
                      {event.live && <span className="rounded bg-indigo-500/15 px-1 text-[8px] uppercase text-indigo-300">live</span>}
                    </span>
                    <span className="mt-0.5 block break-words text-[11px] leading-relaxed text-zinc-300">{event.message || "—"}</span>
                    {dataEntries.length > 0 && (
                      <span className="mt-0.5 block break-all text-[10px] text-zinc-600">{safeJson(event.data)}</span>
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
