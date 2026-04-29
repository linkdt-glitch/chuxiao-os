import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAIWorkforceEvent } from "@/lib/ai-workforce/logging";
import { demoConfirmations } from "@/lib/ai-workforce/demo";
import type { AIConfirmationRequest } from "@/lib/ai-workforce/types";
import type { RiskLevel } from "@/lib/types/core";

async function attachConfirmationRelations(confirmations: AIConfirmationRequest[]) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase || confirmations.length === 0) return confirmations;

  const agentIds = Array.from(new Set(confirmations.map((item) => item.agent_id).filter(Boolean))) as string[];
  const promptIds = Array.from(new Set(confirmations.map((item) => item.prompt_template_id).filter(Boolean))) as string[];
  const [{ data: agents }, { data: prompts }] = await Promise.all([
    agentIds.length
      ? supabase.from("agents").select("*").eq("organization_id", organization.id).in("id", agentIds)
      : Promise.resolve({ data: [] }),
    promptIds.length
      ? supabase.from("prompt_templates").select("*").eq("organization_id", organization.id).in("id", promptIds)
      : Promise.resolve({ data: [] })
  ]);

  const agentMap = new Map((agents ?? []).map((agent) => [agent.id, agent]));
  const promptMap = new Map((prompts ?? []).map((prompt) => [prompt.id, prompt]));
  return confirmations.map((item) => ({
    ...item,
    agent: item.agent_id ? agentMap.get(item.agent_id) ?? null : null,
    prompt: item.prompt_template_id ? promptMap.get(item.prompt_template_id) ?? null : null
  })) as AIConfirmationRequest[];
}

export async function getConfirmations() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoConfirmations;

  const { data, error } = await supabase
    .from("ai_confirmation_requests")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachConfirmationRelations((data ?? []) as AIConfirmationRequest[]);
}

export async function createConfirmationRequest(input: {
  agent_id?: string | null;
  prompt_template_id?: string | null;
  requester_id?: string | null;
  requester_type?: "human" | "agent" | "system";
  related_module?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  action_type: string;
  risk_level: RiskLevel;
  title: string;
  description?: string | null;
  input_data?: Record<string, unknown>;
  proposed_output?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  let approvalRequestId: string | null = null;
  if (["high", "critical"].includes(input.risk_level)) {
    const { data: approval, error: approvalError } = await supabase
      .from("approval_requests")
      .insert({
        organization_id: organization.id,
        requester_id: input.requester_id ?? member.user_id ?? member.agent_id ?? member.id,
        requester_type: input.requester_type ?? member.member_type,
        title: input.title,
        description: input.description ?? null,
        related_module: input.related_module ?? "ai_workforce",
        related_record_type: input.related_record_type ?? "ai_confirmation_request",
        related_record_id: input.related_record_id ?? null,
        risk_level: input.risk_level,
        status: "pending",
        metadata: {
          source: "ai_workforce",
          action_type: input.action_type,
          agent_id: input.agent_id ?? null,
          prompt_template_id: input.prompt_template_id ?? null
        }
      })
      .select("id")
      .single();
    if (approvalError) throw approvalError;
    approvalRequestId = approval.id;
  }

  const { data, error } = await supabase
    .from("ai_confirmation_requests")
    .insert({
      organization_id: organization.id,
      agent_id: input.agent_id ?? null,
      prompt_template_id: input.prompt_template_id ?? null,
      requester_id: input.requester_id ?? member.user_id ?? member.agent_id ?? member.id,
      requester_type: input.requester_type ?? member.member_type,
      related_module: input.related_module ?? null,
      related_record_type: input.related_record_type ?? null,
      related_record_id: input.related_record_id ?? null,
      action_type: input.action_type,
      risk_level: input.risk_level,
      title: input.title,
      description: input.description ?? null,
      input_data: input.input_data ?? {},
      proposed_output: input.proposed_output ?? {},
      status: "pending",
      approval_request_id: approvalRequestId
    })
    .select()
    .single();

  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: "ai_workforce.confirmation.created",
    action: "create",
    related_record_type: "ai_confirmation_request",
    related_record_id: data.id,
    after_data: { title: input.title, risk_level: input.risk_level, approval_request_id: approvalRequestId }
  });
  return data as AIConfirmationRequest;
}

async function decideConfirmation(id: string, status: "approved" | "rejected", note?: string | null) {
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("ai_confirmation_requests")
    .update({
      status,
      decided_by: member.id,
      decided_at: new Date().toISOString(),
      decision_note: note ?? null
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  if (data.approval_request_id) {
    const { error: approvalError } = await supabase
      .from("approval_requests")
      .update({ status })
      .eq("id", data.approval_request_id);
    if (approvalError) {
      await recordAIWorkforceEvent({
        event_key: "ai_workforce.confirmation.sync_error",
        action: "sync_error",
        related_record_type: "ai_confirmation_request",
        related_record_id: id,
        after_data: { confirmation_status: status, approval_request_id: data.approval_request_id, error: approvalError.message }
      });
      throw new Error(`确认请求状态已更新，但审批单同步失败：${approvalError.message}`);
    }
  }

  await recordAIWorkforceEvent({
    event_key: status === "approved" ? "ai_workforce.confirmation.approved" : "ai_workforce.confirmation.rejected",
    action: status === "approved" ? "approve" : "reject",
    related_record_type: "ai_confirmation_request",
    related_record_id: id,
    after_data: { status, note: note ?? "" }
  });
  return data as AIConfirmationRequest;
}

export async function approveConfirmation(id: string, note?: string | null) {
  return decideConfirmation(id, "approved", note);
}

export async function rejectConfirmation(id: string, note?: string | null) {
  return decideConfirmation(id, "rejected", note);
}
