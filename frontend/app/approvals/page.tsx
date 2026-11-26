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
        title={<SparklesText sparklesCount={6} colors={{ first: "#a3a3a3", second: "#525252" }} className="text-2xl font-semibold tracking-tight sm:text-[28px]">Approvals</SparklesText>}
        description="The organization pauses at critical gates. Review requests from every project and decide whether execution continues."
        action={
          <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground shadow-[0_0_24px_-14px_rgba(0, 0, 0,0.9)] sm:w-auto sm:justify-start">
            <ShieldIcon className="h-4 w-4" />
            Decisions are recorded in the audit log
          </div>
        }
      />

      <BlurFade delay={0.08} offset={10}>
        <div className="relative mb-4 overflow-hidden rounded-xl border border-border bg-muted p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_0%_50%,rgba(0, 0, 0,0.12),transparent_70%)]" />
          <p className="relative text-[13px] font-medium text-muted-foreground">
            <AuroraText colors={["#171717", "#525252", "#737373", "#171717"]} speed={0.7}>
              Approval gates keep autonomy accountable.
            </AuroraText>
          </p>
          <p className="relative mt-1 text-xs text-muted-foreground">
            Approved requests resume the pipeline immediately; rejections are recorded and surfaced to the requesting agent.
          </p>
        </div>
      </BlurFade>

      <Panel title="Approval queue" subtitle="Across all projects" bodyClassName="p-3 sm:p-4" beam>
        <ApprovalsTab global />
      </Panel>
    </div>
  );
}
