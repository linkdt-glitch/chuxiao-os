import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { logAction } from "@/lib/audit";
import type { ApprovalStatus, RiskLevel } from "@/lib/types/core";

export async function createApproval(input: {
  title: string;
  description?: string;
  related_module: string;
  related_record_type?: string;
  related_record_id?: string;
  risk_level: RiskLevel;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();

  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("approval_requests")
    .insert({
      organization_id: organization.id,
      requester_id: member.user_id ?? member.agent_id ?? member.id,
      requester_type: member.member_type,
      title: input.title,
      description: input.description,
      related_module: input.related_module,
      related_record_type: input.related_record_type,
      related_record_id: input.related_record_id,
      risk_level: input.risk_level,
      status: "pending",
      metadata: input.metadata ?? {}
    })
    .select()
    .single();

  if (error) throw error;
  await emitEvent({ event_key: "approval.created", module: "approvals", payload: { id: data.id } });
  await logAction({ event_key: "approval.created", action: "create", module: "approvals", related_record_type: "approval_request", related_record_id: data.id });
  return data;
}

async function setApprovalStatus(id: string, status: ApprovalStatus) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { error } = await supabase
    .from("approval_requests")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  await logAction({ event_key: `approval.${status}`, action: status, module: "approvals", related_record_type: "approval_request", related_record_id: id });
  return { ok: true };
}

export function approveApproval(id: string) {
  return setApprovalStatus(id, "approved");
}

export function rejectApproval(id: string) {
  return setApprovalStatus(id, "rejected");
}

export function cancelApproval(id: string) {
  return setApprovalStatus(id, "cancelled");
}
