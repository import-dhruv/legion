"use client";

import { create } from "zustand";
import type { FeedEvent } from "@/lib/types";

const MAX_EVENTS = 300;

interface AppState {
  selectedProjectId: string | null;
  eventsByProject: Record<string, FeedEvent[]>;
  liveEvents: FeedEvent[];
  approvalVersion: number;
  setSelectedProject: (projectId: string | null) => void;
  appendEvent: (projectId: string, event: FeedEvent) => void;
  clearEvents: (projectId?: string) => void;
  bumpApprovals: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedProjectId: null,
  eventsByProject: {},
  liveEvents: [],
  approvalVersion: 0,

  setSelectedProject: (projectId) => set({ selectedProjectId: projectId }),

  appendEvent: (projectId, event) =>
    set((state) => {
      const current = state.eventsByProject[projectId] ?? [];
      if (current.some((item) => item.key === event.key)) return state;
      const next = [...current, event].slice(-MAX_EVENTS);
      return {
        eventsByProject: { ...state.eventsByProject, [projectId]: next },
        liveEvents: [...state.liveEvents, event].slice(-MAX_EVENTS),
      };
    }),

  clearEvents: (projectId) =>
    set((state) =>
      projectId
        ? {
            eventsByProject: { ...state.eventsByProject, [projectId]: [] },
            liveEvents: state.liveEvents.filter((event) => event.project_id !== projectId),
          }
        : { eventsByProject: {}, liveEvents: [] },
    ),

  bumpApprovals: () => set((state) => ({ approvalVersion: state.approvalVersion + 1 })),
}));
