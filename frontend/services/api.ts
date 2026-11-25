import type {
  Agent,
  Approval,
  Artifact,
  CreateProjectInput,
  CreateProjectResponse,
  DashboardData,
  FeedEvent,
  Health,
  Message,
  Project,
  Task,
  Usage,
} from "@/lib/types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");

export const streamUrl = (projectId: string): string =>
  `${API_BASE}/api/projects/${encodeURIComponent(projectId)}/stream`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "detail" in body) {
        const detailValue = (body as { detail: unknown }).detail;
        detail = typeof detailValue === "string" ? detailValue : detail;
      }
    } catch {
      // Non-JSON error response: keep the status-based message.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

const encodedPath = (path: string): string => path.split("/").map(encodeURIComponent).join("/");

export const api = {
  health: () => request<Health>("/api/health"),
  dashboard: () => request<DashboardData>("/api/dashboard"),
  usage: () => request<Usage>("/api/usage"),

  agents: () => request<Agent[]>("/api/agents"),

  projects: () => request<Project[]>("/api/projects"),
  project: (id: string) => request<Project>(`/api/projects/${encodeURIComponent(id)}`),
  createProject: (input: CreateProjectInput) =>
    request<CreateProjectResponse>("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        requirement: input.requirement,
        ...(input.name ? { name: input.name } : {}),
        auto_start: input.auto_start ?? true,
      }),
    }),
  startProject: (id: string) =>
    request<{ status: string; project_id?: string }>(`/api/projects/${encodeURIComponent(id)}/start`, {
      method: "POST",
    }),
  controlProject: (id: string, action: "pause" | "resume" | "stop") =>
    request<{ control: string; project_id?: string }>(
      `/api/projects/${encodeURIComponent(id)}/control`,
      { method: "POST", body: JSON.stringify({ action }) },
    ),

  tasks: (id: string) => request<Task[]>(`/api/projects/${encodeURIComponent(id)}/tasks`),
  updateTask: (id: string, taskId: string, body: { assigned_agent?: string; priority?: number }) =>
    request<{ id: string; assigned_agent: string; priority: number }>(
      `/api/projects/${encodeURIComponent(id)}/tasks/${encodeURIComponent(taskId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

  messages: (id: string) => request<Message[]>(`/api/projects/${encodeURIComponent(id)}/messages`),
  artifacts: (id: string) => request<Artifact[]>(`/api/projects/${encodeURIComponent(id)}/artifacts`),
  events: (id: string, limit = 200) =>
    request<FeedEvent[]>(`/api/projects/${encodeURIComponent(id)}/events?limit=${limit}`),
  files: (id: string) => request<string[]>(`/api/projects/${encodeURIComponent(id)}/files`),
  file: (id: string, path: string) =>
    request<{ path: string; content: string }>(
      `/api/projects/${encodeURIComponent(id)}/files/${encodedPath(path)}`,
    ),
  gitHistory: (id: string) => request<string[]>(`/api/projects/${encodeURIComponent(id)}/git-history`),

  approvals: (status?: string) =>
    request<Approval[]>(`/api/approvals${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  decideApproval: (id: string, approved: boolean) =>
    request<Approval>(`/api/approvals/${encodeURIComponent(id)}/decide`, {
      method: "POST",
      body: JSON.stringify({ approved, decided_by: "human" }),
    }),
};
