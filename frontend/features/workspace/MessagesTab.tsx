"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, MessageIcon, SearchIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, JsonBlock, LoadingState } from "@/components/ui";
import { usePolling } from "@/hooks/usePolling";
import type { Message } from "@/lib/types";
import { cn, formatTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";

export function MessagesTab({ projectId }: { projectId: string }) {
  const query = usePolling(() => api.messages(projectId), 5000, `messages-${projectId}`);
  const [queryText, setQueryText] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);

  const messages = query.data ?? [];
  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((message) =>
      [message.from_agent, message.to_agent, message.message_type, message.task_id, JSON.stringify(message.content)]
        .some((field) => field.toLowerCase().includes(needle)),
    );
  }, [messages, queryText]);

  return (
    <div>
      {query.error && <div className="mb-4"><ErrorBanner message={query.error} onRetry={query.refresh} /></div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-zinc-500">
          <span className="font-semibold text-zinc-200">{messages.length}</span> messages exchanged between agents
        </p>
        <label className="relative block w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Filter messages…"
            className="w-full rounded-lg border border-line bg-canvas/60 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500/60 focus:outline-none"
          />
        </label>
      </div>

      {query.loading && messages.length === 0 ? (
        <LoadingState label="Loading messages…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<MessageIcon className="h-5 w-5" />} title="No messages yet" description="Agent-to-agent requests, responses and failure reports appear here." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-line bg-elevated/50 text-[10px] uppercase tracking-wider text-zinc-600">
                <th className="px-3 py-2.5 font-medium">From</th>
                <th className="px-3 py-2.5 font-medium">To</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Task</th>
                <th className="px-3 py-2.5 font-medium">Content</th>
                <th className="px-3 py-2.5 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {filtered.map((message: Message) => {
                const open = expanded.includes(message.message_id);
                return (
                  <tr key={message.message_id} className="group align-top transition-colors hover:bg-white/[0.025]">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-indigo-300">{message.from_agent}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-cyan-300">{message.to_agent}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded border border-line bg-elevated px-1.5 py-0.5 text-[10px] text-zinc-300">{titleize(message.message_type)}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-zinc-600">{message.task_id ? message.task_id.slice(0, 12) : "—"}</td>
                    <td className="max-w-[260px] px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setExpanded((current) => (open ? current.filter((id) => id !== message.message_id) : [...current, message.message_id]))}
                        className="flex w-full items-start gap-1.5 text-left text-[11px] text-zinc-400 hover:text-zinc-100"
                      >
                        <span className="line-clamp-1 flex-1">{JSON.stringify(message.content)}</span>
                        <ChevronDownIcon className={cn("h-3 w-3 shrink-0 text-zinc-600 transition-transform", open && "rotate-180")} />
                      </button>
                      {open && <JsonBlock value={message.content} className="mt-2" />}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[10px] tabular-nums text-zinc-600">{formatTime(message.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
