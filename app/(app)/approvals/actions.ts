"use server";

import { revalidatePath } from "next/cache";
import { approveApproval, cancelApproval, createApproval, rejectApproval } from "@/lib/approvals";
import { getCurrentOrganization } from "@/lib/auth";
import { approveFinanceRecord, rejectFinanceRecord } from "@/lib/finance/records";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApprovalRequest, RiskLevel } from "@/lib/types/core";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export async function createApprovalAction(formData: FormData) {
  const title = value(formData, "title");
  const related_module = value(formData, "related_module");
  const risk_level = (value(formData, "risk_level") ?? "medium") as RiskLevel;
  if (!title || !related_module) throw new Error("标题和模块不能为空");
  await createApproval({
    title,
    related_module,
    description: value(formData, "description"),
    related_record_type: value(formData, "related_record_type"),
    related_record_id: value(formData, "related_record_id"),
    risk_level,
  });
  revalidateApprovalSurfaces(related_module);
}

async function getApproval(approvalId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", approvalId)
    .single();

  if (error) throw error;
  return data as ApprovalRequest;
}

function revalidateApprovalSurfaces(moduleKey?: string | null) {
  revalidatePath("/governance");
  revalidatePath("/finance");
  revalidatePath("/finance/records");
  revalidatePath("/finance/reimbursements");
  revalidatePath("/ai-workforce");
  revalidatePath("/ai-workforce/confirmations");
  revalidatePath("/projects");
  revalidatePath("/projects/tasks");
  revalidatePath("/dashboard");
  if (moduleKey === "finance") revalidatePath("/finance/records");
  if (moduleKey === "ai_workforce") revalidatePath("/ai-workforce/confirmations");
  if (moduleKey === "tasks" || moduleKey === "projects") revalidatePath("/projects/tasks");
}

function getFinanceRecordId(approval: ApprovalRequest | null) {
  if (!approval) return null;
  if (approval.related_module !== "finance" || approval.related_record_type !== "finance_record") return null;
  return approval.related_record_id ?? null;
}

export async function approveApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) throw new Error("缺少审批 ID");
  const approval = await getApproval(id);
  const financeRecordId = getFinanceRecordId(approval);
  if (financeRecordId) {
    await approveFinanceRecord(financeRecordId);
  } else {
    await approveApproval(id);
  }
  revalidateApprovalSurfaces(approval?.related_module);
}

export async function rejectApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) throw new Error("缺少审批 ID");
  const approval = await getApproval(id);
  const financeRecordId = getFinanceRecordId(approval);
  if (financeRecordId) {
    await rejectFinanceRecord(financeRecordId, value(formData, "reason"));
  } else {
    await rejectApproval(id);
  }
  revalidateApprovalSurfaces(approval?.related_module);
}

export async function cancelApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) throw new Error("缺少审批 ID");
  const approval = await getApproval(id);
  await cancelApproval(id);
  revalidateApprovalSurfaces(approval?.related_module);
}
