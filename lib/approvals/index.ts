import { revalidatePath } from "next/cache";
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

  const { data: approval, error: readError } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (readError) throw readError;

  const { error } = await supabase
    .from("approval_requests")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  await logAction({ event_key: `approval.${status}`, action: status, module: "approvals", related_record_type: "approval_request", related_record_id: id });

  if (
    status === "approved" &&
    approval.related_module === "tasks" &&
    approval.related_record_type === "task" &&
    approval.related_record_id &&
    approval.metadata?.action === "archive_task"
  ) {
    const { data: before, error: taskReadError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", approval.related_record_id)
      .single();

    if (taskReadError) throw taskReadError;

    const { data: archivedTask, error: taskUpdateError } = await supabase
      .rpc("apply_task_archive_approval", { target_approval_id: approval.id })
      .single();

    if (taskUpdateError) throw taskUpdateError;
    const task = archivedTask as {
      id: string;
      project_id: string;
      [key: string]: unknown;
    };

    await logAction({
      event_key: "tasks.updated",
      action: "archive",
      module: "tasks",
      related_record_type: "task",
      related_record_id: task.id,
      before_data: before,
      after_data: { ...task, approval_request_id: approval.id }
    });
    await emitEvent({
      event_key: "tasks.updated",
      module: "tasks",
      payload: { id: task.id, project_id: task.project_id, status: "archived", approval_request_id: approval.id }
    });
    revalidatePath(`/projects/${task.project_id}`);
    revalidatePath(`/projects/${task.project_id}/tasks`);
    revalidatePath(`/projects/${task.project_id}/tasks/${task.id}`);
  }

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
