"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
  RefreshIcon,
  ShieldIcon,
  StopIcon,
} from "@/components/Icons";
import { Button, ErrorBanner, LiveIndicator, Panel, StatusBadge } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Reveal } from "@/components/Reveal";
import { ease } from "@/lib/motion";
import { useEventStream } from "@/hooks/useEventStream";
import { usePolling } from "@/hooks/usePolling";
import { useAppStore } from "@/lib/store";
import type { FeedEvent } from "@/lib/types";
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

// Stable empty snapshot: avoids returning a fresh [] to zustand's selector on every render.
const EMPTY_EVENTS: FeedEvent[] = [];

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
  const events = useAppStore((state) => state.eventsByProject[projectId] ?? EMPTY_EVENTS);
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
    <div>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeftIcon className="h-3.5 w-3.5" /> All projects
      </Link>

      <Reveal className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="bg-gradient-to-r from-foreground via-foreground/70 to-foreground bg-clip-text text-2xl font-semibold tracking-tight text-transparent">{project?.name ?? "Project workspace"}</h1>
            {project && <StatusBadge status={project.control === "paused" ? "paused" : project.status} />}
            <LiveIndicator connected={stream.connected} error={stream.error} />
          </div>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">{project?.requirement ?? "Loading requirement…"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-mono">{project?.id ?? projectId}</span>
            {project && <span>Phase: <span className="text-muted-foreground">{titleize(project.phase)}</span></span>}
            {project && <span>Updated {formatDateTime(project.updated_at)}</span>}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground")}
              aria-label="Project actions"
              title="Project actions"
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Run controls</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => projectQuery.refresh()}>
                <RefreshIcon className={cn("h-3.5 w-3.5", projectQuery.loading && "animate-spin")} />
                Refresh project
              </DropdownMenuItem>
              {project?.control === "paused" && (
                <DropdownMenuItem onSelect={() => void runControl("resume")} disabled={busy !== null}>
                  <PlayIcon className="h-3.5 w-3.5" /> Resume run
                </DropdownMenuItem>
              )}
              {project?.control === "running" && (
                <DropdownMenuItem onSelect={() => void runControl("pause")} disabled={busy !== null}>
                  <PauseIcon className="h-3.5 w-3.5" /> Pause run
                </DropdownMenuItem>
              )}
              {project?.control === "stopped" && (
                <DropdownMenuItem onSelect={() => void restart()} disabled={busy !== null}>
                  <PlayIcon className="h-3.5 w-3.5" /> Restart run
                </DropdownMenuItem>
              )}
              {project && project.control !== "stopped" && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    setConfirmStop(true);
                  }}
                  disabled={busy !== null}
                >
                  <StopIcon className="h-3.5 w-3.5" /> Stop run
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </Reveal>

      {actionError && <div className="mb-4"><ErrorBanner message={actionError} /></div>}
      {projectQuery.error && <div className="mb-4"><ErrorBanner message={projectQuery.error} onRetry={projectQuery.refresh} /></div>}
      {project?.error && <div className="mb-4"><ErrorBanner message={project.error} /></div>}
      {stream.error && <div className="mb-4"><ErrorBanner message={stream.error} /></div>}

      <Reveal delay={0.06}>
      <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)} className="gap-0">
        <TabsList
          variant="line"
          className="no-scrollbar mb-4 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border p-0"
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="shrink-0 gap-2 rounded-none px-3 py-2 text-xs font-medium data-[active]:bg-transparent data-[active]:text-foreground data-[active]:after:opacity-0"
              >
                {item.id === tab && (
                  <motion.span
                    layoutId="workspace-tab-indicator"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground"
                    transition={{ duration: 0.32, ease }}
                  />
                )}
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {item.id === "tasks" && tasks.data && tasks.data.length > 0 && (
                  <Badge variant="secondary" className="h-auto px-1.5 py-0 text-[9px] tabular-nums">{tasks.data.length}</Badge>
                )}
                {item.id === "approvals" && (approvals.data?.length ?? 0) > 0 && (
                  <Badge variant="outline" className="h-auto px-1.5 py-0 text-[9px] tabular-nums">{approvals.data?.length}</Badge>
                )}
                {item.id === "events" && events.length > 0 && (
                  <Badge variant="outline" className="h-auto px-1.5 py-0 text-[9px] tabular-nums">{events.length}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <Panel title={activeTab?.label} subtitle={tabDescription(tab)} bodyClassName="min-h-80 p-4 sm:p-5" beam>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease }}
            >
              <TabsContent value="overview"><OverviewTab projectId={projectId} project={project} /></TabsContent>
              <TabsContent value="tasks"><TaskBoardTab projectId={projectId} /></TabsContent>
              <TabsContent value="files"><FilesTab projectId={projectId} /></TabsContent>
              <TabsContent value="events"><EventsTab projectId={projectId} connected={stream.connected} /></TabsContent>
              <TabsContent value="messages"><MessagesTab projectId={projectId} /></TabsContent>
              <TabsContent value="approvals"><ApprovalsTab projectId={projectId} compact /></TabsContent>
              <TabsContent value="git"><GitHistoryTab projectId={projectId} /></TabsContent>
            </motion.div>
          </AnimatePresence>
        </Panel>
      </Tabs>
      </Reveal>

      <p className="mt-4 text-center text-[10px] text-muted-foreground">
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
