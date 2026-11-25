/** Shared API domain types. All timestamps are ISO-8601 strings from the backend. */

export interface Health {
  status: string;
  agents: number;
  llm_provider: string;
  mock_mode: boolean;
}

export interface Project {
  id: string;
  name: string;
  requirement: string;
  status: string;
  phase: string;
  control: "running" | "paused" | "stopped" | string;
  config: Record<string, unknown>;
  summary: string;
  error: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  phase: string;
  title: string;
  assigned_agent: string;
  priority: number;
  status: string;
  dependencies: string[];
  retry_count: number;
  error: string;
  result: string;
  logs: unknown[];
  created_at?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  department: string;
  level: number;
  reports_to: string | null;
  model_tier: string;
  permissions: Record<string, unknown>;
  status: string;
  current_task_id: string | null;
  responsibilities: string[];
}

export interface Usage {
  requests: number;
  total_tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  estimated_cost_usd: number;
  failures?: number;
  cached_requests?: number;
  budgets?: Record<string, unknown>;
}

export interface Approval {
  id: string;
  project_id: string;
  request_type: string;
  description: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  requester?: string;
  decided_by?: string;
}

export interface Message {
  message_id: string;
  project_id?: string;
  from_agent: string;
  to_agent: string;
  message_type: string;
  task_id: string;
  content: Record<string, unknown>;
  timestamp: string;
}

export interface Artifact {
  id: string;
  name: string;
  content: string;
  kind: string;
  version: number;
  created_at: string;
}

/** Normalized event used by both the REST history and the SSE stream. */
export interface FeedEvent {
  key: string;
  project_id: string;
  type: string;
  message: string;
  agent_id: string;
  task_id: string;
  data: Record<string, unknown>;
  timestamp: string;
  live: boolean;
}

export interface DashboardData {
  projects: Project[];
  tasks: { total: number; completed: number; pending: number; blocked: number };
  running_agents: number;
  pending_approvals: Approval[];
  tokens: number;
  estimated_cost_usd: number;
  llm_requests: number;
}

export interface CreateProjectInput {
  requirement: string;
  name?: string;
  auto_start?: boolean;
}

export interface CreateProjectResponse extends Project {}
