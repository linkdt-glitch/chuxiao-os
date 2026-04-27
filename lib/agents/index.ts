import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { logAction } from "@/lib/audit";
import type { AgentPermissionLevel } from "@/lib/types/core";

export async function createAgent(input: {
  name: string;
  description?: string;
  owner_user_id: string;
  permission_level: AgentPermissionLevel;
  allowed_modules?: string[];
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("agents")
    .insert({
      organization_id: organization.id,
      name: input.name,
      description: input.description ?? "",
      owner_user_id: input.owner_user_id,
      permission_level: input.permission_level,
      allowed_modules: input.allowed_modules ?? [],
      allowed_tools: [],
      config: {},
      status: "active"
    })
    .select()
    .single();

  if (error) throw error;
  await emitEvent({ event_key: "agent.created", module: "agents", payload: { id: data.id } });
  await logAction({ event_key: "agent.created", action: "create", module: "agents", related_record_type: "agent", related_record_id: data.id });
  return data;
}

export async function updateAgent(agentId: string, patch: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { error } = await supabase.from("agents").update(patch).eq("id", agentId);
  if (error) throw error;
  await logAction({ event_key: "agent.updated", action: "update", module: "agents", related_record_type: "agent", related_record_id: agentId, after_data: patch });
  return { ok: true };
}

export async function logAgentRun(input: {
  agent_id: string;
  run_type: string;
  status: "success" | "failed" | "running";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_message?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { error } = await supabase.from("agent_run_logs").insert({
    organization_id: organization.id,
    agent_id: input.agent_id,
    run_type: input.run_type,
    status: input.status,
    input: input.input ?? {},
    output: input.output ?? {},
    error_message: input.error_message,
    started_at: new Date().toISOString(),
    finished_at: input.status === "running" ? null : new Date().toISOString()
  });

  if (error) throw error;
  return { ok: true };
}
