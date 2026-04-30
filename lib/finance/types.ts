import type { RiskLevel } from "@/lib/types/core";

export type FinanceRecordType = "income" | "expense" | "reimbursement" | "transfer" | "refund" | "adjustment";
export type FinanceRecordStatus = "draft" | "pending_approval" | "approved" | "rejected" | "paid" | "cancelled";
export type FinanceCategoryType = "income" | "expense" | "both";
export type FinanceAccountType = "bank" | "cash" | "paypal" | "stripe" | "amazon" | "shopify" | "alipay" | "wechat" | "other";
export type FinanceRecordSource = "manual" | "ai_parse" | "import" | "agent";
export type FinanceExportType = "expense" | "income" | "reimbursement" | "all";

export type FinanceReceiptAttachment = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  asset_type?: string | null;
  summary?: string | null;
  created_at?: string | null;
};

export type FinanceCategory = {
  id: string;
  organization_id: string;
  parent_id?: string | null;
  name: string;
  type: FinanceCategoryType;
  code?: string | null;
  description: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: FinanceCategory[];
};

export type FinanceAccount = {
  id: string;
  organization_id: string;
  name: string;
  account_type: FinanceAccountType;
  currency: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type FinanceRecord = {
  id: string;
  organization_id: string;
  record_no: string;
  record_type: FinanceRecordType;
  status: FinanceRecordStatus;
  amount: number;
  currency: string;
  occurred_at: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  account_id?: string | null;
  payment_method?: string | null;
  counterparty_name?: string | null;
  description: string;
  quantity: number;
  project_id?: string | null;
  project_name?: string | null;
  department_id?: string | null;
  member_id?: string | null;
  submitted_by?: string | null;
  approved_by?: string | null;
  approval_request_id?: string | null;
  reimbursement_required: boolean;
  reimbursed: boolean;
  risk_level: RiskLevel;
  source: FinanceRecordSource;
  related_module?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  category?: FinanceCategory | null;
  subcategory?: FinanceCategory | null;
  account?: FinanceAccount | null;
  submitter?: { id: string; display_name: string; email?: string | null } | null;
  approver?: { id: string; display_name: string; email?: string | null } | null;
  attachments?: FinanceReceiptAttachment[];
};

export type ParsedFinanceRecord = {
  record_type: FinanceRecordType;
  amount: number | null;
  currency: string;
  occurred_at: string;
  category_name?: string;
  subcategory_name?: string;
  account_name?: string;
  payment_method?: string;
  counterparty_name?: string;
  project_name?: string;
  description: string;
  quantity: number;
  reimbursement_required: boolean;
  need_approval: boolean;
  risk_level: RiskLevel;
  confidence: number;
  missing_fields: string[];
  notes?: string;
};

export type FinanceRecordInput = {
  record_type: FinanceRecordType;
  status?: FinanceRecordStatus;
  amount: number;
  currency?: string;
  occurred_at?: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  account_id?: string | null;
  payment_method?: string | null;
  counterparty_name?: string | null;
  description: string;
  quantity?: number;
  project_name?: string | null;
  member_id?: string | null;
  reimbursement_required?: boolean;
  reimbursed?: boolean;
  risk_level?: RiskLevel;
  source?: FinanceRecordSource;
  metadata?: Record<string, unknown>;
  submit_for_approval?: boolean;
};
