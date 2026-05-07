"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approveApproval, cancelApproval, createApproval, rejectApproval } from "@/lib/approvals";
import { getCurrentOrganization } from "@/lib/auth";
import { approveFinanceRecord, rejectFinanceRecord } from "@/lib/finance/records";
import { extractErrorMessage, withErrorParam } from "@/lib/server/error";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApprovalRequest, RiskLevel } from "@/lib/types/core";

// 审批失败/成功统一回到治理页（用户最自然的位置看到结果）。
const APPROVAL_LIST_PATH = "/governance";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export async function createApprovalAction(formData: FormData) {
  const title = value(formData, "title");
  const related_module = value(formData, "related_module");
  const risk_level = (value(formData, "risk_level") ?? "medium") as RiskLevel;
  if (!title || !related_module) {
    redirect(withErrorParam(APPROVAL_LIST_PATH, "标题和模块不能为空。"));
  }
  try {
    await createApproval({
      title,
      related_module,
      description: value(formData, "description"),
      related_record_type: value(formData, "related_record_type"),
      related_record_id: value(formData, "related_record_id"),
      risk_level,
    });
  } catch (error) {
    console.error("[createApprovalAction] error:", error);
    redirect(withErrorParam(APPROVAL_LIST_PATH, extractErrorMessage(error)));
  }
  revalidateApprovalSurfaces(related_module);
  redirect(`${APPROVAL_LIST_PATH}?notice=${encodeURIComponent("审批已创建。")}`);
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
  if (!id) redirect(withErrorParam(APPROVAL_LIST_PATH, "缺少审批 ID。"));
  let approvalModule: string | null | undefined;
  try {
    const approval = await getApproval(id);
    approvalModule = approval?.related_module;
    const financeRecordId = getFinanceRecordId(approval);
    if (financeRecordId) {
      await approveFinanceRecord(financeRecordId);
    } else {
      await approveApproval(id);
    }
  } catch (error) {
    console.error("[approveApprovalAction] error:", error);
    redirect(withErrorParam(APPROVAL_LIST_PATH, extractErrorMessage(error)));
  }
  revalidateApprovalSurfaces(approvalModule);
  redirect(`${APPROVAL_LIST_PATH}?notice=${encodeURIComponent("已批准。")}`);
}

export async function rejectApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) redirect(withErrorParam(APPROVAL_LIST_PATH, "缺少审批 ID。"));
  let approvalModule: string | null | undefined;
  try {
    const approval = await getApproval(id);
    approvalModule = approval?.related_module;
    const financeRecordId = getFinanceRecordId(approval);
    if (financeRecordId) {
      await rejectFinanceRecord(financeRecordId, value(formData, "reason"));
    } else {
      await rejectApproval(id);
    }
  } catch (error) {
    console.error("[rejectApprovalAction] error:", error);
    redirect(withErrorParam(APPROVAL_LIST_PATH, extractErrorMessage(error)));
  }
  revalidateApprovalSurfaces(approvalModule);
  redirect(`${APPROVAL_LIST_PATH}?notice=${encodeURIComponent("已驳回。")}`);
}

export async function cancelApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) redirect(withErrorParam(APPROVAL_LIST_PATH, "缺少审批 ID。"));
  let approvalModule: string | null | undefined;
  try {
    const approval = await getApproval(id);
    approvalModule = approval?.related_module;
    await cancelApproval(id);
  } catch (error) {
    console.error("[cancelApprovalAction] error:", error);
    redirect(withErrorParam(APPROVAL_LIST_PATH, extractErrorMessage(error)));
  }
  revalidateApprovalSurfaces(approvalModule);
  redirect(`${APPROVAL_LIST_PATH}?notice=${encodeURIComponent("已撤销审批。")}`);
}
