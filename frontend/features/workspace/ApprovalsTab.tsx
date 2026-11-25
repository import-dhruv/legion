"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon, ClockIcon, ShieldIcon, XIcon } from "@/components/Icons";
import { Button, EmptyState, ErrorBanner, JsonBlock, LoadingState, StatusBadge } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { BorderBeam } from "@/components/ui/border-beam";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { MagicCard } from "@/components/ui/magic-card";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import { stagger } from "@/lib/motion";
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
          particleCount: 45,
          spread: 55,
          startVelocity: 26,
          ticks: 72,
          scalar: 0.8,
          shapes: ["square"],
          origin: { y: 0.65 },
          colors: ["#171717", "#525252", "#a3a3a3", "#d4d4d4"],
          disableForReducedMotion: true,
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
                  ? "border-border bg-muted text-muted-foreground shadow-[0_0_16px_-8px_rgba(0, 0, 0,0.9)]"
                  : "border-line bg-elevated text-muted-foreground hover:text-foreground",
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
                gradientColor="rgba(0, 0, 0,0.10)"
                gradientFrom={pending ? "#a3a3a3" : "#737373"}
                gradientTo={pending ? "#a3a3a3" : "#171717"}
                className="rounded-xl p-4 shadow-panel"
              >
                {pending && (
                  <BorderBeam
                    size={90}
                    duration={12}
                    borderWidth={1}
                    colorFrom="#a3a3a3"
                    colorTo="#737373"
                    className="opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100"
                  />
                )}
                <ShineBorder
                  borderWidth={1}
                  duration={14}
                  shineColor={["#a3a3a3", "#d4d4d4", "#737373", "#a3a3a3"]}
                  className="opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100"
                />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                        <ShieldIcon className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="text-[13px] font-semibold text-foreground">{titleize(approval.request_type)}</h3>
                      <StatusBadge status={approval.status} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-foreground">{approval.description}</p>
                  </div>
                  {pending ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <ShimmerButton
                        disabled={locked}
                        onClick={() => void decide(approval.id, true)}
                        shimmerColor="#d4d4d4"
                        shimmerDuration="3s"
                        background="linear-gradient(135deg, #171717, #404040)"
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
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ClockIcon className="h-3.5 w-3.5" />
                      Decided {approval.decided_by ? `by ${approval.decided_by}` : ""}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span className="font-mono">{approval.id}</span>
                  <Link href={`/projects/${approval.project_id}`} className="font-mono text-muted-foreground hover:text-muted-foreground">
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
