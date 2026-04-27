import type { Agent, AgentPermissionLevel, AIInvocationLog, RiskLevel } from "@/lib/types/core";

export type PromptStatus = "draft" | "published" | "archived";
export type ConfirmationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type AgentRunStatus = "success" | "failed" | "running" | "pending_confirmation" | "cancelled";
export type AgentRunType = "manual" | "task_assist" | "finance_analysis" | "prompt_test" | "other" | string;

export type OwnerProfile = {
  id: string;
  full_name: string;
  email?: string | null;
};

export type PromptTemplate = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  scenario: string;
  module: string;
  tags: string[];
  input_variables: Array<Record<string, unknown>>;
  output_format: string;
  quality_criteria: string;
  current_version: string;
  status: PromptStatus;
  owner_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  owner?: OwnerProfile | null;
  versions?: PromptVersion[];
  bindings?: AgentPromptBinding[];
  test_runs?: PromptTestRun[];
  feedback?: AIFeedbackRecord[];
};

export type PromptVersion = {
  id: string;
  organization_id: string;
  prompt_template_id: string;
  version: string;
  content: string;
  change_note?: string | null;
  created_by?: string | null;
  created_at: string;
};

export type AgentPromptBinding = {
  id: string;
  organization_id: string;
  agent_id: string;
  prompt_template_id: string;
  prompt_version_id?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  prompt?: PromptTemplate | null;
  prompt_version?: PromptVersion | null;
  agent?: WorkforceAgent | null;
};

export type WorkforceAgent = Agent & {
  default_provider_id?: string | null;
  last_run_at?: string | null;
  owner?: OwnerProfile | null;
  bindings?: AgentPromptBinding[];
  runs?: AgentRunLog[];
  ai_logs?: AIInvocationLog[];
  feedback?: AIFeedbackRecord[];
};

export type AIConfirmationRequest = {
  id: string;
  organization_id: string;
  agent_id?: string | null;
  prompt_template_id?: string | null;
  requester_id?: string | null;
  requester_type: "human" | "agent" | "system";
  related_module?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  action_type: string;
  risk_level: RiskLevel;
  title: string;
  description?: string | null;
  input_data: Record<string, unknown>;
  proposed_output: Record<string, unknown>;
  status: ConfirmationStatus;
  approval_request_id?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
  created_at: string;
  updated_at: string;
  agent?: WorkforceAgent | null;
  prompt?: PromptTemplate | null;
};

export type AgentRunLog = {
  id: string;
  organization_id: string;
  agent_id: string;
  run_type: AgentRunType;
  related_module?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  status: AgentRunStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error_message?: string | null;
  ai_invocation_log_id?: string | null;
  confirmation_request_id?: string | null;
  started_at: string;
  finished_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  agent?: WorkforceAgent | null;
  feedback?: AIFeedbackRecord[];
};

export type PromptTestRun = {
  id: string;
  organization_id: string;
  prompt_template_id: string;
  prompt_version_id?: string | null;
  tested_by?: string | null;
  test_input: Record<string, unknown>;
  test_output: string;
  ai_invocation_log_id?: string | null;
  rating?: number | null;
  notes?: string | null;
  created_at: string;
};

export type AIFeedbackRecord = {
  id: string;
  organization_id: string;
  target_type: "agent_run" | "prompt_test_run" | "confirmation_request" | "ai_invocation" | "agent_output" | "prompt_run" | "other" | string;
  target_id?: string | null;
  module?: string | null;
  rating?: number | null;
  feedback_type: string;
  content?: string | null;
  created_by?: string | null;
  actor_type: "human" | "agent" | "system";
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CreateAgentInput = {
  name: string;
  description?: string;
  owner_user_id: string;
  permission_level: AgentPermissionLevel;
  allowed_modules?: string[];
  allowed_tools?: string[];
  default_provider_id?: string | null;
  status?: "active" | "paused" | "archived";
  config?: Record<string, unknown>;
};
