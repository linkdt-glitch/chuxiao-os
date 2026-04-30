import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { logAction } from "@/lib/audit";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { canApproveFinance } from "@/lib/finance/permissions";
import { getFinanceRecords } from "@/lib/finance/records";
import type { FinanceCategory } from "@/lib/finance/types";
import { linkFileToRecord, uploadFile } from "@/lib/files";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { runAfter } from "@/lib/server/after";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "pending_manager"
  | "pending_finance"
  | "approved"
  | "paid"
  | "rejected"
  | "need_revision"
  | "withdrawn"
  | "cancelled";

export type ExpenseRiskSeverity = "warning" | "danger";

export type ExpenseRiskFlag = {
  key: string;
  severity: ExpenseRiskSeverity;
  message: string;
};

export type Department = {
  id: string;
  organization_id: string;
  name: string;
  code?: string | null;
  manager_member_id?: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ExpenseAttachment = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  asset_type?: string | null;
  summary?: string | null;
  created_at?: string;
};

export type ExpenseItem = {
  id: string;
  organization_id: string;
  expense_report_id: string;
  category_id?: string | null;
  amount: number;
  currency: string;
  occurred_at: string;
  merchant_name?: string | null;
  description: string;
  ocr_raw_data: Record<string, unknown>;
  risk_flags: ExpenseRiskFlag[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  category?: FinanceCategory | null;
};

export type ExpenseApprovalStep = {
  id: string;
  organization_id: string;
  expense_report_id: string;
  step_order: number;
  step_key: string;
  label: string;
  approver_role_key?: string | null;
  approver_member_id?: string | null;
  status: "pending" | "approved" | "rejected" | "need_revision" | "skipped";
  comment?: string | null;
  decided_at?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ExpenseReport = {
  id: string;
  organization_id: string;
  report_no: string;
  title: string;
  submitter_member_id: string;
  department_id?: string | null;
  status: ExpenseStatus;
  total_amount: number;
  currency: string;
  occurred_at: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  current_step?: string | null;
  current_approver_role?: string | null;
  finance_record_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  submitter?: { id: string; display_name: string; email?: string | null; avatar_url?: string | null } | null;
  department?: Department | null;
  items: ExpenseItem[];
  steps: ExpenseApprovalStep[];
  attachments: ExpenseAttachment[];
};

export type ExpenseApprovalRule = {
  id: string;
  organization_id: string;
  name: string;
  min_amount: number;
  max_amount?: number | null;
  steps: Array<{ step_key: string; label: string; approver_role_key?: string }>;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DepartmentBudget = {
  id: string;
  organization_id: string;
  department_id: string;
  budget_month: string;
  category_id?: string | null;
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
  department?: Department | null;
  category?: FinanceCategory | null;
};

export type ExpenseTemplate = {
  id: string;
  organization_id: string;
  owner_member_id: string;
  name: string;
  category_id?: string | null;
  amount?: number | null;
  merchant_name?: string | null;
  description?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  category?: FinanceCategory | null;
};

export type ExpenseReportInput = {
  title: string;
  department_id?: string | null;
  occurred_at: string;
  currency?: string;
  category_id?: string | null;
  amount: number;
  merchant_name?: string | null;
  description: string;
  files?: File[];
  save_as_template?: boolean;
  template_name?: string | null;
  metadata?: Record<string, unknown>;
};

export type ExpenseListFilters = {
  status?: ExpenseStatus | "all";
  department_id?: string;
  keyword?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
};

function isMissingTable(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message) : "";
  return code === "42P01" || code === "42703" || message.includes("does not exist") || message.includes("schema cache");
}

function asNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeRiskFlags(value: unknown): ExpenseRiskFlag[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is ExpenseRiskFlag => Boolean(item) && typeof item === "object" && "key" in item)
    .map((item) => ({
      key: String(item.key),
      severity: item.severity === "danger" ? "danger" : "warning",
      message: String(item.message ?? "")
    }));
}

function normalizeItem(row: Record<string, unknown>): ExpenseItem {
  return {
    ...(row as unknown as ExpenseItem),
    amount: asNumber(row.amount),
    ocr_raw_data: normalizeJsonObject(row.ocr_raw_data),
    metadata: normalizeJsonObject(row.metadata),
    risk_flags: normalizeRiskFlags(row.risk_flags),
    category: (row.category ?? null) as FinanceCategory | null
  };
}

function normalizeReport(row: Record<string, unknown>): ExpenseReport {
  const items = Array.isArray(row.items) ? row.items.map((item) => normalizeItem(item as Record<string, unknown>)) : [];
  const steps = Array.isArray(row.steps) ? (row.steps as ExpenseApprovalStep[]).sort((a, b) => a.step_order - b.step_order) : [];
  return {
    ...(row as unknown as ExpenseReport),
    total_amount: asNumber(row.total_amount),
    metadata: normalizeJsonObject(row.metadata),
    submitter: (row.submitter ?? null) as ExpenseReport["submitter"],
    department: (row.department ?? null) as ExpenseReport["department"],
    items,
    steps,
    attachments: []
  };
}

function normalizeRule(row: Record<string, unknown>): ExpenseApprovalRule {
  return {
    ...(row as unknown as ExpenseApprovalRule),
    min_amount: asNumber(row.min_amount),
    max_amount: row.max_amount == null ? null : asNumber(row.max_amount),
    steps: Array.isArray(row.steps) ? row.steps as ExpenseApprovalRule["steps"] : [],
    metadata: normalizeJsonObject(row.metadata)
  };
}

export function money(value: number, currency = "CNY") {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function expenseStatusLabel(status: ExpenseStatus) {
  const labels: Record<ExpenseStatus, string> = {
    draft: "草稿",
    submitted: "已提交",
    pending_manager: "待一级审批",
    pending_finance: "待财务复核",
    approved: "已批准待打款",
    paid: "已打款",
    rejected: "已驳回",
    need_revision: "需补充",
    withdrawn: "已撤回",
    cancelled: "已取消"
  };
  return labels[status] ?? status;
}

export function expenseStatusTone(status: ExpenseStatus) {
  if (status === "paid" || status === "approved") return "success";
  if (status === "pending_manager" || status === "pending_finance" || status === "submitted") return "warning";
  if (status === "rejected") return "danger";
  if (status === "need_revision") return "info";
  return "secondary";
}

export async function getDepartments() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [] as Department[];

  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .order("name");

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as Department[];
}

export async function getExpenseCategories() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [] as FinanceCategory[];

  const { data, error } = await supabase
    .from("finance_categories")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .eq("expense_enabled", true)
    .order("sort_order");

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as FinanceCategory[];
}

export async function getExpenseApprovalRules() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [] as ExpenseApprovalRule[];

  const { data, error } = await supabase
    .from("finance_expense_approval_rules")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .order("min_amount", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => normalizeRule(row as Record<string, unknown>));
}

export async function getDepartmentBudgets(budgetMonth?: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [] as DepartmentBudget[];
  const month = budgetMonth ?? new Date().toISOString().slice(0, 7) + "-01";

  const { data, error } = await supabase
    .from("finance_department_budgets")
    .select("*, department:departments(*), category:finance_categories(*)")
    .eq("organization_id", organization.id)
    .eq("budget_month", month)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((item) => ({
    ...(item as unknown as DepartmentBudget),
    amount: asNumber((item as Record<string, unknown>).amount),
    metadata: normalizeJsonObject((item as Record<string, unknown>).metadata)
  }));
}

async function hydrateAttachments(reports: ExpenseReport[]) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase || !reports.length) return reports;

  const reportIds = reports.map((report) => report.id);
  const { data, error } = await supabase
    .from("file_links")
    .select("record_id, file:files(id,file_name,mime_type,size_bytes,asset_type,summary,created_at)")
    .eq("organization_id", organization.id)
    .eq("module", "finance")
    .eq("record_type", "finance_expense_report")
    .in("record_id", reportIds);

  if (error) return reports;
  const byReport = new Map<string, ExpenseAttachment[]>();
  for (const link of data ?? []) {
    const file = Array.isArray(link.file) ? link.file[0] : link.file;
    if (!file) continue;
    const current = byReport.get(link.record_id) ?? [];
    current.push(file as ExpenseAttachment);
    byReport.set(link.record_id, current);
  }

  return reports.map((report) => ({ ...report, attachments: byReport.get(report.id) ?? [] }));
}

export async function getExpenseReports(filters?: ExpenseListFilters) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [] as ExpenseReport[];

  let query = supabase
    .from("finance_expense_reports")
    .select("*, submitter:organization_members!finance_expense_reports_submitter_member_id_fkey(id,display_name,email,avatar_url), department:departments(*), items:finance_expense_items(*, category:finance_categories(*)), steps:finance_expense_approval_steps(*)")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.department_id) query = query.eq("department_id", filters.department_id);
  if (filters?.date_from) query = query.gte("occurred_at", filters.date_from);
  if (filters?.date_to) query = query.lte("occurred_at", filters.date_to);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  let reports = (data ?? []).map((row) => normalizeReport(row as Record<string, unknown>));
  if (filters?.keyword) {
    const keyword = filters.keyword.toLowerCase();
    reports = reports.filter((report) => {
      const haystack = [
        report.report_no,
        report.title,
        report.submitter?.display_name,
        report.department?.name,
        ...report.items.flatMap((item) => [item.description, item.merchant_name, item.category?.name])
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }

  return hydrateAttachments(reports);
}

export async function getExpenseReport(id: string) {
  const reports = await getExpenseReports({ limit: 500 });
  return reports.find((report) => report.id === id) ?? null;
}

export async function getExpenseTemplates() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return [] as ExpenseTemplate[];

  const { data, error } = await supabase
    .from("finance_expense_templates")
    .select("*, category:finance_categories(*)")
    .eq("organization_id", organization.id)
    .eq("owner_member_id", member.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((item) => ({
    ...(item as unknown as ExpenseTemplate),
    amount: item.amount == null ? null : asNumber(item.amount),
    metadata: normalizeJsonObject((item as Record<string, unknown>).metadata)
  }));
}

async function nextExpenseReportNo() {
  const date = new Date();
  const month = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase().slice(-7);
  return `EXP-${month}-${suffix}`;
}

async function buildRiskFlags(input: ExpenseReportInput) {
  const flags: ExpenseRiskFlag[] = [];
  const today = new Date();
  const occurred = new Date(`${input.occurred_at}T00:00:00`);
  const daysAgo = Math.floor((today.getTime() - occurred.getTime()) / 86_400_000);

  if (!input.files?.length) {
    flags.push({ key: "missing_receipt", severity: "danger", message: "缺少发票或票据附件。" });
  }
  if (daysAgo > 90) {
    flags.push({ key: "older_than_90_days", severity: "warning", message: "发生日期超过 90 天，请确认是否仍可报销。" });
  }

  const duplicateCheck = async () => {
    if (!input.merchant_name) return false;
    const supabase = await createSupabaseServerClient();
    const organization = await getCurrentOrganization();
    if (!supabase) return false;
    const dateFrom = new Date(occurred);
    dateFrom.setDate(dateFrom.getDate() - 7);
    const dateTo = new Date(occurred);
    dateTo.setDate(dateTo.getDate() + 7);
    const { data } = await supabase
      .from("finance_expense_items")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("merchant_name", input.merchant_name)
      .eq("amount", input.amount)
      .gte("occurred_at", dateFrom.toISOString().slice(0, 10))
      .lte("occurred_at", dateTo.toISOString().slice(0, 10))
      .limit(1);
    return Boolean(data?.length);
  };

  const [categories, hasDuplicate] = await Promise.all([
    input.category_id ? getExpenseCategories() : Promise.resolve([] as FinanceCategory[]),
    duplicateCheck()
  ]);
  const category = categories.find((item) => item.id === input.category_id);
  const singleLimit = category && "single_amount_limit" in category ? asNumber((category as FinanceCategory & { single_amount_limit?: number }).single_amount_limit) : 0;
  if (singleLimit > 0 && input.amount > singleLimit) {
    flags.push({ key: "over_category_limit", severity: "warning", message: `超过该类别单笔参考标准 ${money(singleLimit)}。` });
  }
  if (hasDuplicate) {
    flags.push({ key: "duplicate_amount_merchant", severity: "danger", message: "7 天内存在同金额同商家的报销记录，请核对是否重复。" });
  }

  return flags;
}

async function linkExpenseFiles(reportId: string, files: File[]) {
  await Promise.all(files.map(async (file) => {
    const created = await uploadFile({
      file,
      file_name: file.name || "receipt",
      storage_path: `finance/expense-reports/${reportId}/${Date.now()}-${file.name || "receipt"}`,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      asset_type: "receipt",
      metadata: { asset_type: "receipt", module: "finance", record_type: "finance_expense_report" }
    });
    if ("id" in created) {
      await linkFileToRecord({
        file_id: created.id,
        module: "finance",
        record_type: "finance_expense_report",
        record_id: reportId
      });
    }
  }));
}

export async function createExpenseReport(input: ExpenseReportInput, submit = false) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  await requirePermission("finance.expense.create");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("报销金额必须大于 0。");
  if (!input.title.trim()) throw new Error("报销标题不能为空。");
  if (!input.description.trim()) throw new Error("报销说明不能为空。");

  const riskFlags = await buildRiskFlags(input);
  const { data: report, error: reportError } = await supabase
    .from("finance_expense_reports")
    .insert({
      organization_id: organization.id,
      report_no: await nextExpenseReportNo(),
      title: input.title.trim(),
      submitter_member_id: member.id,
      department_id: input.department_id || null,
      status: "draft",
      total_amount: input.amount,
      currency: (input.currency || "CNY").toUpperCase(),
      occurred_at: input.occurred_at,
      metadata: input.metadata ?? {}
    })
    .select()
    .single();

  if (reportError) throw reportError;

  const postCreateTasks: Promise<unknown>[] = [
    (async () => {
      const { error } = await supabase
        .from("finance_expense_items")
        .insert({
          organization_id: organization.id,
          expense_report_id: report.id,
          category_id: input.category_id || null,
          amount: input.amount,
          currency: (input.currency || "CNY").toUpperCase(),
          occurred_at: input.occurred_at,
          merchant_name: input.merchant_name || null,
          description: input.description.trim(),
          risk_flags: riskFlags,
          metadata: {}
        });
      if (error) throw error;
    })()
  ];

  if (input.files?.length) postCreateTasks.push(linkExpenseFiles(report.id, input.files));
  if (input.save_as_template && input.template_name?.trim()) {
    postCreateTasks.push(upsertExpenseTemplate({
      name: input.template_name.trim(),
      category_id: input.category_id,
      amount: input.amount,
      merchant_name: input.merchant_name,
      description: input.description
    }));
  }

  await Promise.all(postCreateTasks);

  runAfter("finance.expense.created", () =>
    Promise.all([
      logAction({
        event_key: "finance.expense.created",
        action: "create",
        module: "finance",
        related_record_type: "finance_expense_report",
        related_record_id: report.id,
        after_data: report
      }),
      emitEvent({
        event_key: "finance.expense.created",
        module: "finance",
        payload: { id: report.id, report_no: report.report_no, amount: input.amount }
      })
    ])
  );

  const result = submit ? await submitExpenseReport(report.id) : report;
  revalidateFinanceExpensePaths();
  return result as ExpenseReport;
}

export async function submitExpenseReport(id: string) {
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase.rpc("finance_submit_expense_report", {
    target_report_id: id,
    actor_member_id: member.id
  });
  if (error) throw error;
  revalidateFinanceExpensePaths();
  return data as ExpenseReport;
}

export async function withdrawExpenseReport(id: string) {
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase.rpc("finance_withdraw_expense_report", {
    target_report_id: id,
    actor_member_id: member.id
  });
  if (error) throw error;
  revalidateFinanceExpensePaths();
  return data as ExpenseReport;
}

export async function decideExpenseReport(id: string, decision: "approved" | "rejected" | "need_revision", comment?: string) {
  if (!(await canApproveFinance())) throw new Error("Missing permission: finance.expense.approve");
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };
  if ((decision === "rejected" || decision === "need_revision") && !comment?.trim()) {
    throw new Error("驳回或要求补充材料时必须填写原因。");
  }

  const { data, error } = await supabase.rpc("finance_decide_expense_report", {
    target_report_id: id,
    decision,
    decision_comment: comment ?? "",
    actor_member_id: member.id
  });
  if (error) throw error;
  revalidateFinanceExpensePaths();
  return data as ExpenseReport;
}

export async function markExpenseReportsPaid(ids: string[], input: { paid_at?: string; payment_reference?: string }) {
  await requirePermission("finance.expense.pay");
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };
  if (!ids.length) throw new Error("请选择至少一条已批准报销。");

  const { data, error } = await supabase.rpc("finance_mark_expense_reports_paid", {
    target_report_ids: ids,
    paid_on: input.paid_at || new Date().toISOString().slice(0, 10),
    payment_ref: input.payment_reference ?? "",
    actor_member_id: member.id
  });
  if (error) throw error;
  revalidateFinanceExpensePaths();
  return Number(data ?? 0);
}

export async function upsertExpenseTemplate(input: {
  name: string;
  category_id?: string | null;
  amount?: number | null;
  merchant_name?: string | null;
  description?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("finance_expense_templates")
    .upsert({
      organization_id: organization.id,
      owner_member_id: member.id,
      name: input.name,
      category_id: input.category_id || null,
      amount: input.amount ?? null,
      merchant_name: input.merchant_name || null,
      description: input.description || null
    }, { onConflict: "organization_id,owner_member_id,name" })
    .select()
    .single();
  if (error) throw error;
  revalidatePath("/finance/reimbursements/templates");
  return data as ExpenseTemplate;
}

export async function upsertDepartment(input: { id?: string; name: string; code?: string | null; manager_member_id?: string | null }) {
  await requirePermission("finance.expense.manage");
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const payload = {
    organization_id: organization.id,
    name: input.name.trim(),
    code: input.code || null,
    manager_member_id: input.manager_member_id || null
  };
  const query = input.id
    ? supabase.from("departments").update(payload).eq("organization_id", organization.id).eq("id", input.id)
    : supabase.from("departments").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  await logAction({ event_key: "finance.expense.department.updated", action: input.id ? "update" : "create", module: "finance", related_record_type: "department", related_record_id: data.id, after_data: data });
  revalidatePath("/finance/reimbursements/settings");
  return data as Department;
}

export async function upsertDepartmentBudget(input: {
  department_id: string;
  budget_month: string;
  amount: number;
  category_id?: string | null;
}) {
  await requirePermission("finance.expense.manage");
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("finance_department_budgets")
    .upsert({
      organization_id: organization.id,
      department_id: input.department_id,
      budget_month: `${input.budget_month.slice(0, 7)}-01`,
      amount: input.amount,
      currency: "CNY",
      category_id: input.category_id || null
    }, { onConflict: "organization_id,department_id,budget_month,category_id" })
    .select()
    .single();
  if (error) throw error;
  await logAction({ event_key: "finance.expense.budget.updated", action: "upsert", module: "finance", related_record_type: "finance_department_budget", related_record_id: data.id, after_data: data });
  revalidatePath("/finance/reimbursements/settings");
  return data as DepartmentBudget;
}

export async function createExpenseApprovalRule(input: {
  name: string;
  min_amount: number;
  max_amount?: number | null;
  steps: ExpenseApprovalRule["steps"];
}) {
  await requirePermission("finance.expense.manage");
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("finance_expense_approval_rules")
    .insert({
      organization_id: organization.id,
      name: input.name,
      min_amount: input.min_amount,
      max_amount: input.max_amount ?? null,
      steps: input.steps,
      is_active: true
    })
    .select()
    .single();
  if (error) throw error;
  await logAction({ event_key: "finance.expense.rule.created", action: "create", module: "finance", related_record_type: "finance_expense_approval_rule", related_record_id: data.id, after_data: data });
  revalidatePath("/finance/reimbursements/settings");
  return normalizeRule(data as Record<string, unknown>);
}

export async function getExpenseDashboard() {
  const [reports, financeRecords, budgets, canApprove, canManage, canPay] = await Promise.all([
    getExpenseReports({ limit: 300 }),
    getFinanceRecords({ status: "pending_approval", limit: 300, include_attachments: true }),
    getDepartmentBudgets(),
    hasPermission("finance.expense.approve"),
    hasPermission("finance.expense.manage"),
    hasPermission("finance.expense.pay")
  ]);
  const financeRecordApprovals = financeRecords.filter((record) =>
    record.status === "pending_approval" &&
    (record.reimbursement_required || record.record_type === "reimbursement" || record.record_type === "expense")
  );
  const pendingStatuses: ExpenseStatus[] = ["submitted", "pending_manager", "pending_finance"];
  const pending = reports.filter((report) => pendingStatuses.includes(report.status));
  const approved = reports.filter((report) => report.status === "approved");
  const paid = reports.filter((report) => report.status === "paid");
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = reports.filter((report) => report.occurred_at.startsWith(month));

  return {
    reports,
    financeRecordApprovals,
    budgets,
    canApprove,
    canManage,
    canPay,
    stats: {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, item) => sum + item.total_amount, 0),
      financeRecordPendingCount: financeRecordApprovals.length,
      financeRecordPendingAmount: financeRecordApprovals.reduce((sum, item) => sum + Number(item.amount), 0),
      totalPendingCount: pending.length + financeRecordApprovals.length,
      totalPendingAmount: pending.reduce((sum, item) => sum + item.total_amount, 0) + financeRecordApprovals.reduce((sum, item) => sum + Number(item.amount), 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, item) => sum + item.total_amount, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, item) => sum + item.total_amount, 0),
      monthAmount: thisMonth.reduce((sum, item) => sum + item.total_amount, 0)
    }
  };
}

export async function buildExpenseReconciliationWorkbook(input: { month?: string }) {
  await requirePermission("finance.expense.export");
  const month = input.month ?? new Date().toISOString().slice(0, 7);
  const reports = await getExpenseReports({
    date_from: `${month}-01`,
    date_to: `${month}-31`,
    limit: 1000
  });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "初晓 OS";
  workbook.created = new Date();

  const detail = workbook.addWorksheet("报销明细");
  detail.columns = [
    { header: "编号", key: "report_no", width: 18 },
    { header: "状态", key: "status", width: 14 },
    { header: "提交人", key: "submitter", width: 18 },
    { header: "部门", key: "department", width: 18 },
    { header: "日期", key: "occurred_at", width: 14 },
    { header: "类别", key: "category", width: 18 },
    { header: "商家", key: "merchant", width: 22 },
    { header: "说明", key: "description", width: 36 },
    { header: "金额", key: "amount", width: 14 },
    { header: "打款日期", key: "paid_at", width: 14 },
    { header: "流水号", key: "payment_reference", width: 22 }
  ];
  reports.forEach((report) => {
    const item = report.items[0];
    detail.addRow({
      report_no: report.report_no,
      status: expenseStatusLabel(report.status),
      submitter: report.submitter?.display_name ?? "-",
      department: report.department?.name ?? "-",
      occurred_at: report.occurred_at,
      category: item?.category?.name ?? "-",
      merchant: item?.merchant_name ?? "-",
      description: item?.description ?? report.title,
      amount: report.total_amount,
      paid_at: report.paid_at ?? "",
      payment_reference: report.payment_reference ?? ""
    });
  });

  const summary = workbook.addWorksheet("部门类别汇总");
  summary.columns = [
    { header: "部门", key: "department", width: 18 },
    { header: "类别", key: "category", width: 18 },
    { header: "金额", key: "amount", width: 14 }
  ];
  const buckets = new Map<string, { department: string; category: string; amount: number }>();
  reports.forEach((report) => {
    const item = report.items[0];
    const department = report.department?.name ?? "未分部门";
    const category = item?.category?.name ?? "未分类";
    const key = `${department}__${category}`;
    const current = buckets.get(key) ?? { department, category, amount: 0 };
    current.amount += report.total_amount;
    buckets.set(key, current);
  });
  Array.from(buckets.values()).forEach((item) => summary.addRow(item));

  for (const worksheet of workbook.worksheets) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.getColumn("amount").numFmt = '"¥"#,##0.00';
  }

  return workbook;
}

function revalidateFinanceExpensePaths() {
  runAfter("finance.expense.revalidate", () => {
    revalidatePath("/finance/reimbursements");
    revalidatePath("/finance/reimbursements/payments");
    revalidatePath("/finance/records");
  });
}
