"use client";

import { GitIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/ui";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/services/api";

export function GitHistoryTab({ projectId }: { projectId: string }) {
  const query = usePolling(() => api.gitHistory(projectId), 6000, `git-${projectId}`);
  const history = query.data ?? [];

  return (
    <div>
      {query.error && <div className="mb-4"><ErrorBanner message={query.error} onRetry={query.refresh} /></div>}
      {query.loading && history.length === 0 ? (
        <LoadingState label="Reading git history…" />
      ) : history.length === 0 ? (
        <EmptyState icon={<GitIcon className="h-5 w-5" />} title="No commits yet" description="Agent commits to the project workspace will appear here." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="flex items-center justify-between border-b border-line bg-elevated/40 px-4 py-2.5">
            <span className="text-[11px] font-medium text-zinc-300">{history.length} commits</span>
            <span className="font-mono text-[10px] text-zinc-600">git log --oneline</span>
          </div>
          <ul className="divide-y divide-line/60">
            {history.map((entry, index) => {
              const parts = entry.trim().split(/\s+/);
              const hash = /^[0-9a-f]{6,40}$/i.test(parts[0] ?? "") ? parts.shift() : null;
              return (
                <li key={`${entry}-${index}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line bg-elevated font-mono text-[9px] text-zinc-500">
                    {history.length - index}
                  </span>
                  <div className="min-w-0 flex-1">
                    {hash && <span className="mr-2 font-mono text-[11px] text-amber-300/90">{hash.slice(0, 8)}</span>}
                    <span className="break-words font-mono text-[11px] leading-relaxed text-zinc-300">{parts.join(" ") || entry}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
