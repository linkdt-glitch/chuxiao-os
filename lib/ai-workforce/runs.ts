import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAIWorkforceEvent } from "@/lib/ai-workforce/logging";
import { demoWorkforceRuns } from "@/lib/ai-workforce/demo";
import type { AgentRunLog, AgentRunStatus } from "@/lib/ai-workforce/types";

async function attachRunRelations(runs: AgentRunLog[]) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase || runs.length === 0) return runs;

  const agentIds = Array.from(new Set(runs.map((run) => run.agent_id)));
  const runIds = runs.map((run) => run.id);
  const [{ data: agents }, { data: feedback }] = await Promise.all([
    supabase.from("agents").select("*").eq("organization_id", organization.id).in("id", agentIds),
    supabase
      .from("feedback_records")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("target_type", "agent_run")
      .in("target_id", runIds)
      .order("created_at", { ascending: false })
  ]);

  const agentMap = new Map((agents ?? []).map((agent) => [agent.id, agent]));
  return runs.map((run) => ({
    ...run,
    agent: agentMap.get(run.agent_id) ?? null,
    feedback: (feedback ?? []).filter((item) => item.target_id === run.id)
  })) as AgentRunLog[];
}

export async function getAgentRuns(filter?: { agent_id?: string; status?: string }) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoWorkforceRuns;

  let query = supabase
    .from("agent_run_logs")
    .select("*")
    .eq("organization_id", organization.id)
    .order("started_at", { ascending: false });

  if (filter?.agent_id) query = query.eq("agent_id", filter.agent_id);
  if (filter?.status && filter.status !== "all") query = query.eq("status", filter.status);

  const { data, error } = await query;
  if (error) throw error;
  return attachRunRelations((data ?? []) as AgentRunLog[]);
}

export async function createAgentRun(input: {
  agent_id: string;
  run_type: string;
  related_module?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  status?: AgentRunStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_message?: string | null;
  ai_invocation_log_id?: string | null;
  confirmation_request_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const now = new Date().toISOString();
  const status = input.status ?? "success";
  const { data, error } = await supabase
    .from("agent_run_logs")
    .insert({
      organization_id: organization.id,
      agent_id: input.agent_id,
      run_type: input.run_type,
      related_module: input.related_module ?? null,
      related_record_type: input.related_record_type ?? null,
      related_record_id: input.related_record_id ?? null,
      status,
      input: input.input ?? {},
      output: input.output ?? {},
      error_message: input.error_message ?? null,
      ai_invocation_log_id: input.ai_invocation_log_id ?? null,
      confirmation_request_id: input.confirmation_request_id ?? null,
      started_at: now,
      finished_at: status === "running" ? null : now,
      created_by: member.id
    })
    .select()
    .single();

  if (error) throw error;
  await supabase.from("agents").update({ last_run_at: now }).eq("id", input.agent_id);
  await recordAIWorkforceEvent({
    event_key: "ai_workforce.agent_run.created",
    action: "create",
    related_record_type: "agent_run_log",
    related_record_id: data.id,
    after_data: { agent_id: input.agent_id, status }
  });
  if (status === "success" || status === "failed") {
    await recordAIWorkforceEvent({
      event_key: status === "success" ? "ai_workforce.agent_run.completed" : "ai_workforce.agent_run.failed",
      action: status === "success" ? "complete" : "fail",
      related_record_type: "agent_run_log",
      related_record_id: data.id,
      after_data: { status, error_message: input.error_message ?? null }
    });
  }
  return data as AgentRunLog;
}

export async function updateAgentRun(runId: string, patch: {
  status?: AgentRunStatus;
  output?: Record<string, unknown>;
  error_message?: string | null;
  ai_invocation_log_id?: string | null;
  confirmation_request_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const finished = patch.status && patch.status !== "running" ? new Date().toISOString() : undefined;
  const { data, error } = await supabase
    .from("agent_run_logs")
    .update({ ...patch, finished_at: finished })
    .eq("id", runId)
    .select()
    .single();

  if (error) throw error;
  if (patch.status === "success" || patch.status === "failed") {
    await recordAIWorkforceEvent({
      event_key: patch.status === "success" ? "ai_workforce.agent_run.completed" : "ai_workforce.agent_run.failed",
      action: patch.status === "success" ? "complete" : "fail",
      related_record_type: "agent_run_log",
      related_record_id: runId,
      after_data: patch as Record<string, unknown>
    });
  }
  return data as AgentRunLog;
}
