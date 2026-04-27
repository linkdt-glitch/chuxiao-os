export type ActorType = "human" | "agent" | "system";
export type ModuleStatus = "active" | "coming_soon" | "disabled";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
export type EventStatus = "new" | "processed" | "failed";
export type AgentPermissionLevel = "L1" | "L2" | "L3" | "L4" | "L5";
export type FeedbackType = "useful" | "not_useful" | "correct" | "incorrect" | "accepted" | "rejected" | "edited" | "other";
export type TargetType = "task" | "project" | "agent_output" | "prompt_run" | "approval" | "finance_record" | "file" | "sop" | "agent_run" | "prompt_test_run" | "confirmation_request" | "ai_invocation" | "other";
export type ReviewType = "project" | "task" | "agent" | "prompt" | "approval" | "finance" | "operation" | "other";
export type SopStatus = "draft" | "active" | "archived";
export type ImprovementStatus = "new" | "accepted" | "rejected" | "in_progress" | "done";

export type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  organization_id: string;
  key: string;
  name: string;
  description: string;
  is_system: boolean;
  risk_rank: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id?: string | null;
  agent_id?: string | null;
  role_id: string;
  member_type: ActorType;
  display_name: string;
  email?: string | null;
  status: "active" | "disabled" | "invited";
  owner_user_id?: string | null;
  created_at: string;
  updated_at: string;
  role?: Role;
};

export type Permission = {
  id: string;
  key: string;
  name: string;
  module: string;
  action: string;
  risk_level: RiskLevel;
  description: string;
};

export type ModuleDefinition = {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: "core" | "ai" | "future" | "system" | string;
  status: ModuleStatus;
  route: string;
  required_permission: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationModule = {
  id: string;
  organization_id: string;
  module_id: string;
  is_enabled: boolean;
  settings: Record<string, unknown>;
  module?: ModuleDefinition;
};

export type ApprovalRequest = {
  id: string;
  organization_id: string;
  requester_id?: string | null;
  requester_type: ActorType;
  title: string;
  description?: string | null;
  related_module: string;
  related_record_type?: string | null;
  related_record_id?: string | null;
  risk_level: RiskLevel;
  status: ApprovalStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  organization_id: string;
  actor_id?: string | null;
  actor_type: ActorType;
  event_key: string;
  action: string;
  module: string;
  related_record_type?: string | null;
  related_record_id?: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  created_at: string;
};

export type SystemEvent = {
  id: string;
  organization_id: string;
  event_key: string;
  event_source: ActorType;
  actor_id?: string | null;
  actor_type: ActorType;
  module: string;
  payload: Record<string, unknown>;
  status: EventStatus;
  created_at: string;
  updated_at: string;
};

export type CompanyFile = {
  id: string;
  organization_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  visibility: "organization" | "restricted";
  uploaded_by?: string | null;
  uploaded_by_type: ActorType;
  metadata: Record<string, unknown>;
  asset_type?: string | null;
  tags?: string[] | null;
  summary?: string | null;
  created_at: string;
  updated_at: string;
};

export type AIProvider = {
  id: string;
  organization_id: string;
  provider_name: "openai" | "anthropic" | "google" | "local" | "deepseek";
  label: string;
  base_url?: string | null;
  model_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AIInvocationLog = {
  id: string;
  organization_id: string;
  provider_id?: string | null;
  invoked_by?: string | null;
  invoked_by_type: ActorType;
  module: string;
  prompt_preview?: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  status: "success" | "failed";
  error_message?: string | null;
  created_at: string;
};

export type Agent = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  owner_user_id: string;
  permission_level: AgentPermissionLevel;
  allowed_modules: string[];
  allowed_tools: string[];
  default_provider_id?: string | null;
  config: Record<string, unknown>;
  status: "active" | "paused" | "archived";
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentRunLog = {
  id: string;
  organization_id: string;
  agent_id: string;
  run_type: string;
  related_module?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  status: "success" | "failed" | "running" | "pending_confirmation" | "cancelled";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error_message?: string | null;
  ai_invocation_log_id?: string | null;
  confirmation_request_id?: string | null;
  started_at: string;
  finished_at?: string | null;
  created_by?: string | null;
};

export type DashboardStats = {
  enabledModules: number;
  pendingApprovals: number;
  aiInvocations: number;
  agents: number;
};

export type FeedbackRecord = {
  id: string;
  organization_id: string;
  target_type: TargetType;
  target_id?: string | null;
  module?: string | null;
  rating?: number | null;
  feedback_type: FeedbackType;
  content?: string | null;
  created_by?: string | null;
  actor_type: ActorType;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ReviewRecord = {
  id: string;
  organization_id: string;
  review_type: ReviewType;
  related_module?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  title: string;
  summary?: string | null;
  what_worked?: string | null;
  what_failed?: string | null;
  lessons_learned?: string | null;
  next_actions?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type SopRecord = {
  id: string;
  organization_id: string;
  title: string;
  description?: string | null;
  scenario?: string | null;
  steps: Array<string | Record<string, unknown>>;
  related_module?: string | null;
  related_prompt_id?: string | null;
  related_agent_id?: string | null;
  version: string;
  status: SopStatus;
  owner_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ImprovementSuggestion = {
  id: string;
  organization_id: string;
  suggestion_type: "finance" | "project" | "agent" | "prompt" | "workflow" | "risk" | "knowledge" | "governance" | "other";
  source_event_id?: string | null;
  related_module?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  title: string;
  description?: string | null;
  impact_level: RiskLevel;
  status: ImprovementStatus;
  suggested_by_type: ActorType;
  suggested_by?: string | null;
  assigned_to?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
