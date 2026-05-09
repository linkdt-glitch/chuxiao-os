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
import { extractErrorMessage, withErrorParam } from "@/lib/server/error";

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

  // Pre-validate so user gets a friendly redirect instead of a generic
  // "页面加载失败" from the page error boundary.
  const amountValue = numberValue(formData, "amount");
  if (!amountValue || isNaN(amountValue) || amountValue <= 0) {
    redirect(`/finance/reimbursements/new?error=${encodeURIComponent("报销金额必须是大于 0 的数字。")}`);
  }
  const description = value(formData, "description") ?? "";
  if (!description.trim()) {
    redirect(`/finance/reimbursements/new?error=${encodeURIComponent("请填写报销说明。")}`);
  }

  let createdId = "";
  try {
    const report = await createExpenseReport({
      title: value(formData, "title") ?? "报销申请",
      department_id: value(formData, "department_id") ?? null,
      occurred_at: value(formData, "occurred_at") ?? new Date().toISOString().slice(0, 10),
      currency: value(formData, "currency") ?? "CNY",
      category_id: value(formData, "category_id") ?? null,
      amount: amountValue,
      merchant_name: value(formData, "merchant_name") ?? null,
      description,
      files: files(formData),
      save_as_template: bool(formData, "save_as_template"),
      template_name: value(formData, "template_name") ?? null,
      metadata: {
        payment_method: value(formData, "payment_method") ?? "",
        notes: value(formData, "notes") ?? ""
      }
    }, intent === "submit");
    createdId = "id" in report ? report.id : "";
  } catch (error) {
    console.error("[createExpenseReportAction] error:", error);
    redirect(withErrorParam("/finance/reimbursements/new", extractErrorMessage(error, "报销创建失败，请检查必填项后重试。")));
  }
  redirect(`/finance/reimbursements?created=${createdId}`);
}

export async function submitExpenseReportAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/finance/reimbursements", "缺少报销单 ID。"));
  try {
    await submitExpenseReport(id);
  } catch (error) {
    console.error("[submitExpenseReportAction] error:", error);
    redirect(withErrorParam("/finance/reimbursements", extractErrorMessage(error)));
  }
  revalidatePath("/finance/reimbursements");
  redirect(`/finance/reimbursements?notice=${encodeURIComponent("已提交审批。")}`);
}

export async function withdrawExpenseReportAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/finance/reimbursements", "缺少报销单 ID。"));
  try {
    await withdrawExpenseReport(id);
  } catch (error) {
    console.error("[withdrawExpenseReportAction] error:", error);
    redirect(withErrorParam("/finance/reimbursements", extractErrorMessage(error)));
  }
  revalidatePath("/finance/reimbursements");
  redirect(`/finance/reimbursements?notice=${encodeURIComponent("已撤回。")}`);
}

export async function approveExpenseReportAction(formData: FormData) {
  const ids = values(formData, "id");
  if (!ids.length) redirect(withErrorParam("/finance/reimbursements", "请选择至少一条报销单。"));

  // 一条失败不应该让其余 N-1 条回退 —— 用 allSettled 逐个跑，
  // 最后告诉用户：成功 X / 失败 Y / 第一个失败原因
  const comment = value(formData, "comment") ?? "";
  const results = await Promise.allSettled(
    ids.map((id) => decideExpenseReport(id, "approved", comment))
  );
  const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  const succeeded = results.length - failed.length;

  if (failed.length) {
    console.error("[approveExpenseReportAction] partial failure:", failed.map((r) => r.reason));
    const firstReason = extractErrorMessage(failed[0].reason);
    revalidatePath("/finance/reimbursements");
    revalidatePath("/finance/reimbursements/payments");
    redirect(
      withErrorParam(
        "/finance/reimbursements",
        succeeded > 0
          ? `成功批准 ${succeeded} 条，${failed.length} 条失败：${firstReason}`
          : `批准失败：${firstReason}`
      )
    );
  }

  revalidatePath("/finance/reimbursements");
  revalidatePath("/finance/reimbursements/payments");
  redirect(`/finance/reimbursements?notice=${encodeURIComponent(`已批准 ${ids.length} 条报销单。`)}`);
}

export async function rejectExpenseReportAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/finance/reimbursements", "缺少报销单 ID。"));
  try {
    await decideExpenseReport(id, "rejected", value(formData, "comment") ?? "");
  } catch (error) {
    console.error("[rejectExpenseReportAction] error:", error);
    redirect(withErrorParam("/finance/reimbursements", extractErrorMessage(error)));
  }
  revalidatePath("/finance/reimbursements");
  redirect(`/finance/reimbursements?notice=${encodeURIComponent("已驳回。")}`);
}

export async function requestExpenseRevisionAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/finance/reimbursements", "缺少报销单 ID。"));
  try {
    await decideExpenseReport(id, "need_revision", value(formData, "comment") ?? "");
  } catch (error) {
    console.error("[requestExpenseRevisionAction] error:", error);
    redirect(withErrorParam("/finance/reimbursements", extractErrorMessage(error)));
  }
  revalidatePath("/finance/reimbursements");
  redirect(`/finance/reimbursements?notice=${encodeURIComponent("已请求修改。")}`);
}

export async function markExpenseReportsPaidAction(formData: FormData) {
  const ids = values(formData, "id");
  if (!ids.length) redirect(withErrorParam("/finance/reimbursements/payments", "请选择至少一条报销单。"));
  try {
    await markExpenseReportsPaid(ids, {
      paid_at: value(formData, "paid_at"),
      payment_reference: value(formData, "payment_reference")
    });
  } catch (error) {
    console.error("[markExpenseReportsPaidAction] error:", error);
    redirect(withErrorParam("/finance/reimbursements/payments", extractErrorMessage(error)));
  }
  revalidatePath("/finance/reimbursements");
  revalidatePath("/finance/reimbursements/payments");
  redirect(`/finance/reimbursements/payments?notice=${encodeURIComponent(`已标记 ${ids.length} 条为已支付。`)}`);
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
