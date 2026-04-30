import type { FinanceCategory } from "@/lib/finance/types";

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
