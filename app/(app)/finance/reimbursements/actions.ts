"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createExpenseApprovalRule,
  createExpenseReport,
  decideExpenseReport,
  markExpenseReportsPaid,
  submitExpenseReport,
  upsertDepartment,
  upsertDepartmentBudget,
  upsertExpenseTemplate,
  withdrawExpenseReport
} from "@/lib/finance/expenses";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function values(formData: FormData, key: string) {
  return formData.getAll(key).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function files(formData: FormData) {
  return formData.getAll("receipt_files").filter((item): item is File => item instanceof File && item.size > 0);
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const numeric = Number(value(formData, key) ?? fallback);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export async function createExpenseReportAction(formData: FormData) {
  const intent = value(formData, "intent") ?? "draft";
  const report = await createExpenseReport({
    title: value(formData, "title") ?? "报销申请",
    department_id: value(formData, "department_id") ?? null,
    occurred_at: value(formData, "occurred_at") ?? new Date().toISOString().slice(0, 10),
    currency: value(formData, "currency") ?? "CNY",
    category_id: value(formData, "category_id") ?? null,
    amount: numberValue(formData, "amount"),
    merchant_name: value(formData, "merchant_name") ?? null,
    description: value(formData, "description") ?? "报销说明",
    files: files(formData),
    save_as_template: bool(formData, "save_as_template"),
    template_name: value(formData, "template_name") ?? null,
    metadata: {
      payment_method: value(formData, "payment_method") ?? "",
      notes: value(formData, "notes") ?? ""
    }
  }, intent === "submit");

  const createdId = "id" in report ? report.id : "";
  redirect(`/finance/reimbursements?created=${createdId}`);
}

export async function submitExpenseReportAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing expense report id");
  await submitExpenseReport(id);
  revalidatePath("/finance/reimbursements");
}

export async function withdrawExpenseReportAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing expense report id");
  await withdrawExpenseReport(id);
  revalidatePath("/finance/reimbursements");
}

export async function approveExpenseReportAction(formData: FormData) {
  const ids = values(formData, "id");
  if (!ids.length) throw new Error("请选择至少一条报销单。");
  await Promise.all(ids.map((id) => decideExpenseReport(id, "approved", value(formData, "comment") ?? "")));
  revalidatePath("/finance/reimbursements");
  revalidatePath("/finance/reimbursements/payments");
}

export async function rejectExpenseReportAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing expense report id");
  await decideExpenseReport(id, "rejected", value(formData, "comment") ?? "");
  revalidatePath("/finance/reimbursements");
}

export async function requestExpenseRevisionAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing expense report id");
  await decideExpenseReport(id, "need_revision", value(formData, "comment") ?? "");
  revalidatePath("/finance/reimbursements");
}

export async function markExpenseReportsPaidAction(formData: FormData) {
  const ids = values(formData, "id");
  await markExpenseReportsPaid(ids, {
    paid_at: value(formData, "paid_at"),
    payment_reference: value(formData, "payment_reference")
  });
  revalidatePath("/finance/reimbursements");
  revalidatePath("/finance/reimbursements/payments");
}

export async function createExpenseTemplateAction(formData: FormData) {
  await upsertExpenseTemplate({
    name: value(formData, "name") ?? "常用报销模板",
    category_id: value(formData, "category_id") ?? null,
    amount: value(formData, "amount") ? numberValue(formData, "amount") : null,
    merchant_name: value(formData, "merchant_name") ?? null,
    description: value(formData, "description") ?? null
  });
  redirect("/finance/reimbursements/templates?created=1");
}

export async function upsertDepartmentAction(formData: FormData) {
  await upsertDepartment({
    id: value(formData, "id"),
    name: value(formData, "name") ?? "新部门",
    code: value(formData, "code") ?? null,
    manager_member_id: value(formData, "manager_member_id") ?? null
  });
}

export async function upsertDepartmentBudgetAction(formData: FormData) {
  await upsertDepartmentBudget({
    department_id: value(formData, "department_id") ?? "",
    budget_month: value(formData, "budget_month") ?? new Date().toISOString().slice(0, 7),
    category_id: value(formData, "category_id") ?? null,
    amount: numberValue(formData, "amount")
  });
}

export async function createExpenseApprovalRuleAction(formData: FormData) {
  const maxAmount = value(formData, "max_amount");
  const stepPreset = value(formData, "step_preset") ?? "manager";
  const steps = stepPreset === "full"
    ? [
        { step_key: "manager_review", label: "一级审批", approver_role_key: "admin" },
        { step_key: "finance_review", label: "财务复核", approver_role_key: "admin" },
        { step_key: "owner_review", label: "Owner 复核", approver_role_key: "owner" }
      ]
    : stepPreset === "finance"
      ? [
          { step_key: "manager_review", label: "一级审批", approver_role_key: "admin" },
          { step_key: "finance_review", label: "财务复核", approver_role_key: "admin" }
        ]
      : [{ step_key: "manager_review", label: "一级审批", approver_role_key: "admin" }];

  await createExpenseApprovalRule({
    name: value(formData, "name") ?? "新审批规则",
    min_amount: numberValue(formData, "min_amount"),
    max_amount: maxAmount ? Number(maxAmount) : null,
    steps
  });
}
