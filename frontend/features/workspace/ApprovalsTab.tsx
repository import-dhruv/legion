"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon, ClockIcon, ShieldIcon, XIcon } from "@/components/Icons";
import { Button, EmptyState, ErrorBanner, JsonBlock, LoadingState, StatusBadge } from "@/components/ui";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { MagicCard } from "@/components/ui/magic-card";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import { cn, formatDateTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";

export function ApprovalsTab({ projectId, compact = false, global = false }: { projectId?: string; compact?: boolean; global?: boolean }) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busy, setBusy] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const approvalVersion = useAppStore((state) => state.approvalVersion);
  const bumpApprovals = useAppStore((state) => state.bumpApprovals);
  const status = global && filter === "all" ? undefined : "pending";

  const query = usePolling(() => api.approvals(status), 4000, `${global ? "global" : "project"}-${status ?? "all"}-${approvalVersion}`);
  const items = (query.data ?? []).filter((item) => (projectId ? item.project_id === projectId : true));

  const decide = async (id: string, approved: boolean) => {
    setBusy((current) => [...current, id]);
    setError(null);
    try {
      await api.decideApproval(id, approved);
      if (approved) {
        void confettiRef.current?.fire({
          particleCount: 80,
          spread: 68,
          startVelocity: 32,
          origin: { y: 0.65 },
          colors: ["#a78bfa", "#818cf8", "#67e8f9", "#fde68a"],
        });
      }
      bumpApprovals();
      query.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record decision");
    } finally {
      setBusy((current) => current.filter((value) => value !== id));
    }
  };

  return (
    <div className={cn(!compact && "space-y-4")}>
      <Confetti
        ref={confettiRef}
        manualstart
        className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
      />
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          {(["pending", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                filter === value
                  ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-200 shadow-[0_0_16px_-8px_rgba(129,140,248,0.9)]"
                  : "border-line bg-elevated text-zinc-500 hover:text-zinc-200",
              )}
            >
              {value} {value === "pending" && items.length > 0 ? `(${items.length})` : ""}
            </button>
          ))}
        </div>
      )}

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      {query.error && <div className="mb-4"><ErrorBanner message={query.error} onRetry={query.refresh} /></div>}

      {query.loading && items.length === 0 ? (
        <LoadingState label="Loading approvals…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShieldIcon className="h-5 w-5" />}
          title={filter === "pending" ? "Nothing needs approval" : "No approval requests"}
          description="Human gates appear here when agents require a decision before continuing."
        />
      ) : (
        <div className="space-y-3">
          {items.map((approval) => {
            const pending = approval.status === "pending";
            const locked = busy.includes(approval.id);
            return (
              <BlurFade key={approval.id} delay={0.03 + items.indexOf(approval) * 0.05} offset={10} blur="6px">
              <MagicCard
                gradientColor="rgba(251,191,36,0.10)"
                gradientFrom={pending ? "#fbbf24" : "#a78bfa"}
                gradientTo={pending ? "#f472b6" : "#22d3ee"}
                className="rounded-xl p-4 shadow-panel"
              >
                {pending && <BorderBeam size={90} duration={8} borderWidth={1} colorFrom="#fbbf24" colorTo="#f472b6" />}
                <ShineBorder
                  borderWidth={1}
                  duration={12}
                  shineColor={["#fbbf24", "#f472b6", "#a78bfa", "#fbbf24"]}
                  className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-500/10 text-amber-300">
                        <ShieldIcon className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="text-[13px] font-semibold text-zinc-100">{titleize(approval.request_type)}</h3>
                      <StatusBadge status={approval.status} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-300">{approval.description}</p>
                  </div>
                  {pending ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <ShimmerButton
                        disabled={locked}
                        onClick={() => void decide(approval.id, true)}
                        shimmerColor="#bbf7d0"
                        shimmerDuration="3s"
                        background="linear-gradient(135deg, #059669, #10b981)"
                        className="px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckIcon className="mr-1.5 h-3.5 w-3.5" /> Approve
                      </ShimmerButton>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={locked}
                        onClick={() => void decide(approval.id, false)}
                      >
                        <XIcon className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <ClockIcon className="h-3.5 w-3.5" />
                      Decided {approval.decided_by ? `by ${approval.decided_by}` : ""}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-600">
                  <span className="font-mono">{approval.id}</span>
                  <Link href={`/projects/${approval.project_id}`} className="font-mono text-indigo-300/80 hover:text-indigo-200">
                    {approval.project_id} →
                  </Link>
                  {approval.requester && <span>Requester: {approval.requester}</span>}
                  <span>{formatDateTime(approval.created_at)}</span>
                </div>

                {Object.keys(approval.payload).length > 0 && <JsonBlock value={approval.payload} className="mt-3" />}
              </MagicCard>
              </BlurFade>
            );
          })}
        </div>
      )}
    </div>
  );
}
