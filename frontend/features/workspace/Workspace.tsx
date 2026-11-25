"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ActivityIcon,
  ArrowLeftIcon,
  CheckIcon,
  FileIcon,
  GitIcon,
  LayersIcon,
  MessageIcon,
  PauseIcon,
  PlayIcon,
  ShieldIcon,
  StopIcon,
} from "@/components/Icons";
import { Button, ErrorBanner, LiveIndicator, Panel, StatusBadge } from "@/components/ui";
import { BlurFade } from "@/components/ui/blur-fade";
import { useEventStream } from "@/hooks/useEventStream";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import { cn, formatDateTime, titleize } from "@/lib/utils";
import { api } from "@/services/api";
import { ApprovalsTab } from "@/features/workspace/ApprovalsTab";
import { EventsTab } from "@/features/workspace/EventsTab";
import { FilesTab } from "@/features/workspace/FilesTab";
import { GitHistoryTab } from "@/features/workspace/GitHistoryTab";
import { MessagesTab } from "@/features/workspace/MessagesTab";
import { OverviewTab } from "@/features/workspace/OverviewTab";
import { TaskBoardTab } from "@/features/workspace/TaskBoardTab";

export type TabId = "overview" | "tasks" | "files" | "events" | "messages" | "approvals" | "git";

const TABS: Array<{ id: TabId; label: string; icon: typeof LayersIcon }> = [
  { id: "overview", label: "Overview", icon: LayersIcon },
  { id: "tasks", label: "Task board", icon: CheckIcon },
  { id: "files", label: "Files", icon: FileIcon },
  { id: "events", label: "Terminal / Events", icon: ActivityIcon },
  { id: "messages", label: "Messages", icon: MessageIcon },
  { id: "approvals", label: "Approvals", icon: ShieldIcon },
  { id: "git", label: "Git history", icon: GitIcon },
];

export function Workspace() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [tab, setTab] = useState<TabId>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const projectQuery = usePolling(() => api.project(projectId), 3000, `project-${projectId}`);
  const project = projectQuery.data;
  const stream = useEventStream(projectId);
  const events = useAppStore((state) => state.eventsByProject[projectId] ?? []);
  const setSelectedProject = useAppStore((state) => state.setSelectedProject);

  useEffect(() => {
    setSelectedProject(projectId);
    return () => setSelectedProject(null);
  }, [projectId, setSelectedProject]);

  const approvals = usePolling(async () => {
    const items = await api.approvals("pending");
    return items.filter((item) => item.project_id === projectId);
  }, 4000, `workspace-approvals-${projectId}`);
  const tasks = usePolling(() => api.tasks(projectId), 4000, `workspace-tasks-${projectId}`);

  const runControl = async (action: "pause" | "resume" | "stop") => {
    setBusy(action);
    setActionError(null);
    try {
      await api.controlProject(projectId, action);
      projectQuery.refresh();
      if (action === "stop") setConfirmStop(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Unable to ${action} project`);
    } finally {
      setBusy(null);
    }
  };

  const restart = async () => {
    setBusy("restart");
    setActionError(null);
    try {
      await api.controlProject(projectId, "resume");
      await api.startProject(projectId);
      projectQuery.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to restart project");
    } finally {
      setBusy(null);
    }
  };

  const activeTab = TABS.find((item) => item.id === tab);

  return (
    <div className="animate-fade-in">
      <Link href="/projects" className="mb-5 inline-flex items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-zinc-200">
        <ArrowLeftIcon className="h-3.5 w-3.5" /> All projects
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="bg-gradient-to-r from-violet-200 via-indigo-100 to-cyan-200 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">{project?.name ?? "Project workspace"}</h1>
            {project && <StatusBadge status={project.control === "paused" ? "paused" : project.status} />}
            <LiveIndicator connected={stream.connected} error={stream.error} />
          </div>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-zinc-400">{project?.requirement ?? "Loading requirement…"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-600">
            <span className="font-mono">{project?.id ?? projectId}</span>
            {project && <span>Phase: <span className="text-zinc-400">{titleize(project.phase)}</span></span>}
            {project && <span>Updated {formatDateTime(project.updated_at)}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {project?.control === "paused" && (
            <Button variant="primary" onClick={() => void runControl("resume")} disabled={busy !== null}>
              <PlayIcon className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
          {project?.control === "running" && (
            <Button onClick={() => void runControl("pause")} disabled={busy !== null}>
              <PauseIcon className="h-3.5 w-3.5" /> Pause
            </Button>
          )}
          {project?.control === "stopped" && (
            <Button variant="primary" onClick={() => void restart()} disabled={busy !== null}>
              <PlayIcon className="h-3.5 w-3.5" /> Restart
            </Button>
          )}
          {project && project.control !== "stopped" && (
            confirmStop ? (
              <div className="flex items-center gap-1.5">
                <Button variant="danger" size="sm" onClick={() => void runControl("stop")} disabled={busy !== null}>
                  Confirm stop
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmStop(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmStop(true)} disabled={busy !== null}>
                <StopIcon className="h-3.5 w-3.5" /> Stop
              </Button>
            )
          )}
          <Button variant="ghost" onClick={projectQuery.refresh} title="Refresh project">
            <span className={cn("inline-block", projectQuery.loading && "animate-spin")}>↻</span>
          </Button>
        </div>
      </div>

      {actionError && <div className="mb-4"><ErrorBanner message={actionError} /></div>}
      {projectQuery.error && <div className="mb-4"><ErrorBanner message={projectQuery.error} onRetry={projectQuery.refresh} /></div>}
      {project?.error && <div className="mb-4"><ErrorBanner message={project.error} /></div>}
      {stream.error && <div className="mb-4"><ErrorBanner message={stream.error} /></div>}

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-xs font-medium transition-colors",
                isActive ? "text-indigo-200" : "text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {item.id === "tasks" && tasks.data && tasks.data.length > 0 && (
                <span className="rounded bg-elevated px-1.5 py-0.5 text-[9px] tabular-nums text-zinc-400">{tasks.data.length}</span>
              )}
              {item.id === "approvals" && (approvals.data?.length ?? 0) > 0 && (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] tabular-nums text-amber-300">{approvals.data?.length}</span>
              )}
              {item.id === "events" && events.length > 0 && (
                <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] tabular-nums text-indigo-300">{events.length}</span>
              )}
              {isActive && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-300 shadow-[0_0_12px_rgba(129,140,248,0.9)]" />}
            </button>
          );
        })}
      </div>

      <Panel title={activeTab?.label} subtitle={tabDescription(tab)} bodyClassName="p-5 min-h-[320px]" beam>
        <BlurFade key={tab} delay={0.02} duration={0.3} offset={6} blur="4px">
          {tab === "overview" && <OverviewTab projectId={projectId} project={project} />}
          {tab === "tasks" && <TaskBoardTab projectId={projectId} />}
          {tab === "files" && <FilesTab projectId={projectId} />}
          {tab === "events" && <EventsTab projectId={projectId} connected={stream.connected} />}
          {tab === "messages" && <MessagesTab projectId={projectId} />}
          {tab === "approvals" && <ApprovalsTab projectId={projectId} compact />}
          {tab === "git" && <GitHistoryTab projectId={projectId} />}
        </BlurFade>
      </Panel>

      <p className="mt-4 text-center text-[10px] text-zinc-700">
        Data refreshes automatically every few seconds · live events via server-sent events
      </p>
    </div>
  );
}

const tabDescription = (tab: TabId): string => {
  switch (tab) {
    case "overview": return "Requirement, execution state and generated artifacts";
    case "tasks": return "Execution queue grouped by status — reassign agents or change priority";
    case "files": return "Generated workspace files and source viewer";
    case "events": return "Chronological event log with live streaming";
    case "messages": return "Agent-to-agent communication ledger";
    case "approvals": return "Human-in-the-loop approval gates";
    case "git": return "Commits recorded in the project workspace";
  }
};
