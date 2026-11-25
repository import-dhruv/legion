"use client";

import { ShieldIcon } from "@/components/Icons";
import { PageHeader, Panel } from "@/components/ui";
import { AuroraText } from "@/components/ui/aurora-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { SparklesText } from "@/components/ui/sparkles-text";
import { ApprovalsTab } from "@/features/workspace/ApprovalsTab";

export default function ApprovalsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Human in the loop"
        title={<SparklesText sparklesCount={6} colors={{ first: "#fbbf24", second: "#67e8f9" }} className="text-2xl font-semibold tracking-tight sm:text-[28px]">Approvals</SparklesText>}
        description="The organization pauses at critical gates. Review requests from every project and decide whether execution continues."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 shadow-[0_0_24px_-14px_rgba(251,191,36,0.9)]">
            <ShieldIcon className="h-4 w-4" />
            Decisions are recorded in the audit log
          </div>
        }
      />

      <BlurFade delay={0.08} offset={10}>
        <div className="relative mb-5 overflow-hidden rounded-xl border border-amber-400/15 bg-amber-500/[0.04] px-5 py-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_0%_50%,rgba(251,191,36,0.12),transparent_70%)]" />
          <p className="relative text-[13px] font-medium text-amber-100">
            <AuroraText colors={["#fde68a", "#fca5a5", "#67e8f9", "#fde68a"]} speed={0.7}>
              Approval gates keep autonomy accountable.
            </AuroraText>
          </p>
          <p className="relative mt-1 text-xs text-amber-200/60">
            Approved requests resume the pipeline immediately; rejections are recorded and surfaced to the requesting agent.
          </p>
        </div>
      </BlurFade>

      <Panel title="Approval queue" subtitle="Across all projects" bodyClassName="p-5" beam>
        <ApprovalsTab global />
      </Panel>
    </div>
  );
}
