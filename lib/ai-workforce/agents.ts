import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAIWorkforceEvent } from "@/lib/ai-workforce/logging";
import { demoWorkforceData } from "@/lib/ai-workforce/demo";
import type { AgentPromptBinding, CreateAgentInput, WorkforceAgent } from "@/lib/ai-workforce/types";
import type { AgentPermissionLevel } from "@/lib/types/core";

type AgentPatch = Partial<Omit<CreateAgentInput, "permission_level">> & {
  permission_level?: AgentPermissionLevel;
};

async function attachAgentRelations(agents: WorkforceAgent[]) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase || agents.length === 0) return agents;

  const ownerIds = Array.from(new Set(agents.map((agent) => agent.owner_user_id).filter(Boolean)));
  const agentIds = agents.map((agent) => agent.id);
  const [{ data: owners }, { data: bindings }, { data: runs }, { data: aiLogs }, { data: feedback }] = await Promise.all([
    supabase.from("user_profiles").select("id, full_name, email").in("id", ownerIds),
    supabase
      .from("agent_prompt_bindings")
      .select("*, prompt_templates(*), prompt_versions(*)")
      .eq("organization_id", organization.id)
      .in("agent_id", agentIds)
      .eq("is_active", true),
    supabase
      .from("agent_run_logs")
      .select("*")
      .eq("organization_id", organization.id)
      .in("agent_id", agentIds)
      .order("started_at", { ascending: false }),
    supabase
      .from("ai_invocation_logs")
      .select("*")
      .eq("organization_id", organization.id)
      .in("invoked_by", agentIds)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("feedback_records")
      .select("*")
      .eq("organization_id", organization.id)
      .in("target_type", ["agent_run", "agent_output"])
      .order("created_at", { ascending: false })
  ]);

  const ownerMap = new Map((owners ?? []).map((owner) => [owner.id, owner]));
  const bindingRows = ((bindings ?? []) as Array<Record<string, unknown>>).map((binding) => ({
    ...binding,
    prompt: binding.prompt_templates,
    prompt_version: binding.prompt_versions
  })) as AgentPromptBinding[];
  const feedbackRows = feedback ?? [];

  return agents.map((agent) => ({
    ...agent,
    owner: ownerMap.get(agent.owner_user_id) ?? null,
    bindings: bindingRows.filter((binding) => binding.agent_id === agent.id),
    runs: (runs ?? []).filter((run) => run.agent_id === agent.id),
    ai_logs: (aiLogs ?? []).filter((log) => log.invoked_by === agent.id),
    feedback: feedbackRows.filter((item) => agent.id === item.target_id)
  }));
}

export async function getAgents() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoWorkforceData.agents;

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachAgentRelations((data ?? []) as WorkforceAgent[]);
}

export async function getAgentById(agentId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoWorkforceData.agents.find((agent) => agent.id === agentId) ?? null;

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", agentId)
    .single();

  if (error) throw error;
  const [agent] = await attachAgentRelations([data as WorkforceAgent]);
  return agent ?? null;
}

export async function createAgent(input: CreateAgentInput) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ...input, id: "demo_agent_created", organization_id: organization.id };

  const { data, error } = await supabase
    .from("agents")
    .insert({
      organization_id: organization.id,
      name: input.name,
      description: input.description ?? "",
      owner_user_id: input.owner_user_id,
      permission_level: input.permission_level,
      allowed_modules: input.allowed_modules ?? [],
      allowed_tools: input.allowed_tools ?? [],
      default_provider_id: input.default_provider_id || null,
      config: input.config ?? {},
      status: input.status ?? "active"
    })
    .select()
    .single();

  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: "ai_workforce.agent.created",
    action: "create",
    related_record_type: "agent",
    related_record_id: data.id,
    after_data: { name: input.name, permission_level: input.permission_level },
    payload: { id: data.id, name: input.name }
  });
  return data as WorkforceAgent;
}

export async function updateAgent(agentId: string, patch: AgentPatch) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { error } = await supabase.from("agents").update(patch).eq("id", agentId);
  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: "ai_workforce.agent.updated",
    action: "update",
    related_record_type: "agent",
    related_record_id: agentId,
    after_data: patch as Record<string, unknown>
  });
  return { ok: true };
}

async function setAgentStatus(agentId: string, status: "active" | "paused" | "archived", eventKey: string, action: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { error } = await supabase.from("agents").update({ status }).eq("id", agentId);
  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: eventKey,
    action,
    related_record_type: "agent",
    related_record_id: agentId,
    after_data: { status }
  });
  return { ok: true };
}

async function cancelAgentPendingWork(agentId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from("agent_run_logs")
      .update({ status: "cancelled", finished_at: now })
      .eq("agent_id", agentId)
      .in("status", ["running", "pending_confirmation"]),
    supabase
      .from("ai_confirmation_requests")
      .update({ status: "cancelled" })
      .eq("agent_id", agentId)
      .eq("status", "pending")
  ]);
}

export async function pauseAgent(agentId: string) {
  await cancelAgentPendingWork(agentId);
  return setAgentStatus(agentId, "paused", "ai_workforce.agent.paused", "pause");
}

export async function activateAgent(agentId: string) {
  return setAgentStatus(agentId, "active", "ai_workforce.agent.activated", "activate");
}

export async function archiveAgent(agentId: string) {
  await cancelAgentPendingWork(agentId);
  return setAgentStatus(agentId, "archived", "ai_workforce.agent.archived", "archive");
}

export async function bindPromptToAgent(input: {
  agent_id: string;
  prompt_template_id: string;
  prompt_version_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("agent_prompt_bindings")
    .insert({
      organization_id: organization.id,
      agent_id: input.agent_id,
      prompt_template_id: input.prompt_template_id,
      prompt_version_id: input.prompt_version_id || null,
      is_active: true,
      created_by: member.id
    })
    .select()
    .single();

  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: "ai_workforce.agent.updated",
    action: "bind_prompt",
    related_record_type: "agent",
    related_record_id: input.agent_id,
    after_data: { prompt_template_id: input.prompt_template_id, prompt_version_id: input.prompt_version_id ?? null }
  });
  return data as AgentPromptBinding;
}
