"use server";

import { revalidatePath } from "next/cache";
import { createApproval, approveApproval, rejectApproval } from "@/lib/approvals";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export async function createApprovalAction(formData: FormData) {
  const title = value(formData, "title");
  const related_module = value(formData, "related_module");
  if (!title || !related_module) throw new Error("标题和模块不能为空");
  await createApproval({
    title,
    related_module,
    description: value(formData, "description"),
    risk_level: "medium",
  });
  revalidatePath("/approvals");
}

export async function approveApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) throw new Error("缺少审批 ID");
  await approveApproval(id);
  revalidatePath("/approvals");
}

export async function rejectApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) throw new Error("缺少审批 ID");
  await rejectApproval(id);
  revalidatePath("/approvals");
}
