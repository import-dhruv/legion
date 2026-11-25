"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { FeedEvent } from "@/lib/types";
import { streamUrl } from "@/services/api";

/** Event names emitted by the control plane (plus a few defensive extras). */
const EVENT_TYPES = [
  "connected",
  "run_started",
  "run_failed",
  "phase_started",
  "phase_completed",
  "tasks_created",
  "task_started",
  "task_completed",
  "task_failed",
  "task_retry",
  "agent_started",
  "agent_finished",
  "message",
  "approval_requested",
  "approval_decided",
  "approval_timeout",
  "review_rejected",
  "bugs_fixed",
  "deployed",
  "deployment_started",
  "deployment_rejected",
  "execution_paused",
  "execution_resumed",
  "execution_stopped",
  "project_completed",
  "human_gate",
];

const stringField = (value: unknown): string => (typeof value === "string" ? value : "");

const objectField = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

let eventCounter = 0;

/** Opens one SSE connection per project and pushes normalized events into the Zustand store. */
export function useEventStream(projectIds: string | string[] | null): {
  connected: boolean;
  error: string | null;
} {
  const ids = projectIds === null ? [] : Array.isArray(projectIds) ? projectIds : [projectIds];
  const connectionKey = ids.join("|");
  const appendEvent = useAppStore((state) => state.appendEvent);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appendRef = useRef(appendEvent);
  appendRef.current = appendEvent;

  useEffect(() => {
    if (!connectionKey) {
      setConnected(false);
      return;
    }

    const sources: EventSource[] = [];
    let openCount = 0;
    let disposed = false;
    const projectList = connectionKey ? connectionKey.split("|") : [];

    projectList.forEach((projectId) => {
      if (!projectId) return;
      const source = new EventSource(streamUrl(projectId));
      sources.push(source);

      const onOpen = () => {
        if (disposed) return;
        openCount += 1;
        setConnected(true);
        setError(null);
      };
      const onError = () => {
        if (disposed) return;
        if (openCount === 0) setError("Live stream unavailable — retrying…");
        setConnected(false);
      };

      source.onopen = onOpen;
      source.onerror = onError;

      EVENT_TYPES.forEach((type) => {
        source.addEventListener(type, (event) => {
          if (disposed) return;
          const messageEvent = event as MessageEvent<string>;
          let payload: Record<string, unknown> = {};
          try {
            payload = objectField(JSON.parse(messageEvent.data) as unknown);
          } catch {
            payload = {};
          }

          eventCounter += 1;
          const feedEvent: FeedEvent = {
            key: `${projectId}-${Date.now()}-${eventCounter}`,
            project_id: projectId,
            type: stringField(payload.event_type) || type,
            message: stringField(payload.message),
            agent_id: stringField(payload.agent_id) || "orchestrator",
            task_id: stringField(payload.task_id),
            data: objectField(payload.data),
            timestamp: stringField(payload.timestamp) || new Date().toISOString(),
            live: true,
          };
          appendRef.current(projectId, feedEvent);
          if (type === "connected") {
            setConnected(true);
            setError(null);
          }
        });
      });
    });

    return () => {
      disposed = true;
      sources.forEach((source) => source.close());
      setConnected(false);
    };
  }, [connectionKey]);

  return { connected, error };
}
