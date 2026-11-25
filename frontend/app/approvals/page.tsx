"use client";

import { ShieldIcon } from "@/components/Icons";
import { PageHeader, Panel } from "@/components/ui";
import { ApprovalsTab } from "@/features/workspace/ApprovalsTab";

export default function ApprovalsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Human in the loop"
        title="Approvals"
        description="The organization pauses at critical gates. Review requests from every project and decide whether execution continues."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <ShieldIcon className="h-4 w-4" />
            Decisions are recorded in the audit log
          </div>
        }
      />
      <Panel title="Approval queue" subtitle="Across all projects" bodyClassName="p-5">
        <ApprovalsTab global />
      </Panel>
    </div>
  );
}
