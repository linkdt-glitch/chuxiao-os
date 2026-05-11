import { revalidatePath } from "next/cache";
import { approveApproval, createApproval, rejectApproval } from "@/lib/approvals";
import { logAction } from "@/lib/audit";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { canApproveFinance, canRecordCompanyIncome, getFinanceScope } from "@/lib/finance/permissions";
import { demoFinanceAccounts } from "@/lib/finance/accounts";
import { demoFinanceCategories } from "@/lib/finance/categories";
import { runAfter } from "@/lib/server/after";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinanceRecord, FinanceRecordInput, FinanceRecordStatus, FinanceRecordType } from "@/lib/finance/types";

const now = new Date("2026-04-25T10:00:00.000Z").toISOString();

export const demoFinanceRecords: FinanceRecord[] = [
  {
    id: "fin_001",
    organization_id: "org_qiming",
    record_no: "FIN-202604-0001",
    record_type: "expense",
    status: "approved",
    amount: 680,
    currency: "CNY",
    occurred_at: "2026-04-25",
    category_id: "cat_product",
    subcategory_id: "cat_sample",
    account_id: "acc_wechat",
    payment_method: "微信支付",
    counterparty_name: "供应商",
    description: "支付供应商打样费",
    quantity: 1,
    project_name: "新款产品开发",
    submitted_by: "mem_founder",
    member_id: "mem_founder",
    reimbursement_required: true,
    reimbursed: false,
    risk_level: "low",
    source: "ai_parse",
    metadata: { notes: "演示数据" },
    created_at: now,
    updated_at: now,
    category: demoFinanceCategories[2],
    subcategory: demoFinanceCategories[2].children?.[0],
    account: demoFinanceAccounts[2],
    submitter: { id: "mem_founder", display_name: "创始人" }
  },
  {
    id: "fin_002",
    organization_id: "org_qiming",
    record_no: "FIN-202604-0002",
    record_type: "income",
    status: "approved",
    amount: 16800,
    currency: "CNY",
    occurred_at: "2026-04-22",
    category_id: "cat_sales",
    account_id: "acc_bank",
    payment_method: "银行转账",
    counterparty_name: "客户 A",
    description: "产品销售收入",
    quantity: 1,
    submitted_by: "mem_founder",
    member_id: "mem_founder",
    reimbursement_required: false,
    reimbursed: false,
    risk_level: "low",
    source: "manual",
    metadata: {},
    created_at: now,
    updated_at: now,
    category: demoFinanceCategories[0],
    account: demoFinanceAccounts[1],
    submitter: { id: "mem_founder", display_name: "创始人" }
  }
];

function normalizeRecord(row: Record<string, unknown>): FinanceRecord {
  return {
    ...(row as unknown as FinanceRecord),
    category: (row.category ?? null) as FinanceRecord["category"],
    subcategory: (row.subcategory ?? null) as FinanceRecord["subcategory"],
    account: (row.account ?? null) as FinanceRecord["account"],
    submitter: (row.submitter ?? null) as FinanceRecord["submitter"],
    approver: (row.approver ?? null) as FinanceRecord["approver"],
    attachments: Array.isArray(row.attachments) ? row.attachments as FinanceRecord["attachments"] : []
  };
}

async function hydrateFinanceRecordAttachments(records: FinanceRecord[]) {
  if (!records.length) return records;
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return records;

  const { data, error } = await supabase
    .from("file_links")
    .select("record_id, file:files(id,file_name,mime_type,size_bytes,asset_type,summary,created_at)")
    .eq("organization_id", organization.id)
    .eq("module", "finance")
    .eq("record_type", "finance_record")
    .in("record_id", records.map((record) => record.id));

  if (error) return records;

  const byRecord = new Map<string, NonNullable<FinanceRecord["attachments"]>>();
  for (const link of data ?? []) {
    const file = Array.isArray(link.file) ? link.file[0] : link.file;
    if (!file) continue;
    const current = byRecord.get(link.record_id) ?? [];
    current.push(file as NonNullable<FinanceRecord["attachments"]>[number]);
    byRecord.set(link.record_id, current);
  }

  return records.map((record) => ({ ...record, attachments: byRecord.get(record.id) ?? [] }));
}

async function nextRecordNo() {
  const date = new Date();
  const month = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase().slice(-7);

  return `FIN-${month}-${suffix}`;
}

function writeFinanceRecordTrace(input: {
  event_key: string;
  action: string;
  related_record_id: string;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  payload?: Record<string, unknown>;
}) {
  runAfter(input.event_key, () =>
    Promise.all([
      logAction({
        event_key: input.event_key,
        action: input.action,
        module: "finance",
        related_record_type: "finance_record",
        related_record_id: input.related_record_id,
        before_data: input.before_data,
        after_data: input.after_data
      }),
      emitEvent({
        event_key: input.event_key,
        module: "finance",
        payload: input.payload ?? { id: input.related_record_id }
      })
    ])
  );
}

function revalidateFinanceRecordPaths(...paths: string[]) {
  // ⚠️ revalidatePath 必须同步调用（响应送出前），否则客户端 router cache
  // (staleTimes 120s) 在用户保存后跳转列表时仍返回旧数据，新记录看不到。
  // revalidatePath 是纯内存操作（毫秒级），不需要异步化。
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.warn(`[revalidateFinanceRecordPaths] failed for ${path}:`, error);
    }
  }
}

export async function getFinanceRecords(filters?: {
  record_type?: FinanceRecordType | "all";
  status?: FinanceRecordStatus | "all";
  date_from?: string;
  date_to?: string;
  category_id?: string;
  member_id?: string;
  limit?: number;
  include_attachments?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const scope = await getFinanceScope();
  if (!supabase) return demoFinanceRecords.slice(0, filters?.limit ?? demoFinanceRecords.length);

  let query = supabase
    .from("finance_records")
    .select("*, category:finance_categories!finance_records_category_id_fkey(*), subcategory:finance_categories!finance_records_subcategory_id_fkey(*), account:finance_accounts(*), submitter:organization_members!finance_records_submitted_by_fkey(id,display_name,email), approver:organization_members!finance_records_approved_by_fkey(id,display_name,email)")
    .eq("organization_id", organization.id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (scope.scope === "own") query = query.or(`submitted_by.eq.${scope.member.id},member_id.eq.${scope.member.id}`);
  if (filters?.record_type && filters.record_type !== "all") query = query.eq("record_type", filters.record_type);
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.date_from) query = query.gte("occurred_at", filters.date_from);
  if (filters?.date_to) query = query.lte("occurred_at", filters.date_to);
  if (filters?.category_id) query = query.eq("category_id", filters.category_id);
  if (filters?.member_id) query = query.eq("submitted_by", filters.member_id);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  const records = (data ?? []).map((item) => normalizeRecord(item));
  return filters?.include_attachments ? hydrateFinanceRecordAttachments(records) : records;
}

export async function getFinanceRecord(id: string) {
  const records = await getFinanceRecords();
  return records.find((record) => record.id === id) ?? null;
}

export async function createFinanceRecord(input: FinanceRecordInput) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("财务记录金额必须大于 0。");
  }
  if (!input.description.trim()) {
    throw new Error("财务记录说明不能为空。");
  }
  // 服务端兜底：非 owner/admin 不能直接记录公司「收入」类型。
  // 公司收款入账由 owner/admin 登记，员工只记自己花的钱。
  if (input.record_type === "income" && !(await canRecordCompanyIncome())) {
    throw new Error("你没有权限直接记录公司收入。公司收款入账请由创始人 / 管理员登记。");
  }
  // 创始人记账自动入账规则：
  //   owner 提交的非报销类支出 / 收入 → 直接 approved（自己批自己的日常没意义）
  //   报销类（reimbursement_required / record_type=reimbursement）仍走原审批流程
  //   非 owner → 维持原 draft / pending_approval 逻辑
  //
  // 注意：Supabase nested join 偶尔会把 roles(*) 当数组返回（FK shape 不确定时），
  // 所以这里要兼容 role = Role 和 role = [Role] 两种形态，且任何异常都 fallback 到
  // 原审批流程，确保保存动作不会因为角色解析失败而 crash。
  let isOwner = false;
  try {
    const rawRole = (member as { role?: unknown }).role;
    const roleKey = Array.isArray(rawRole)
      ? ((rawRole[0] as { key?: string } | undefined)?.key)
      : ((rawRole as { key?: string } | null | undefined)?.key);
    isOwner = roleKey === "owner";
  } catch {
    isOwner = false;
  }
  const isReimbursement = Boolean(input.reimbursement_required) || input.record_type === "reimbursement";
  const ownerAutoApprove = isOwner && !isReimbursement;

  // 终态：决定提交后该是什么状态
  const targetStatus: FinanceRecordStatus = ownerAutoApprove
    ? "approved"
    : input.submit_for_approval || input.status === "pending_approval"
      ? "pending_approval"
      : input.status ?? "draft";

  // ⭐ 关键修复 (RLS bug)：UPDATE 策略要求 status in ('draft', 'rejected') 才能让
  // submitter 自己更新。如果 INSERT 直接写 'pending_approval'，后续 submitFinanceRecord
  // 想 UPDATE 加 approval_request_id 时 RLS 拒绝 → 错误 PGRST116 "0 rows"。
  //
  // 解决：INSERT 一律先用 'draft'，再让 submitFinanceRecord 做合法的状态转移
  // （draft → pending_approval）。owner 自动入账走另一条 fast path（直接 approved）。
  const insertStatus: FinanceRecordStatus = ownerAutoApprove ? "approved" : "draft";

  const payload = {
    organization_id: organization.id,
    record_no: await nextRecordNo(),
    record_type: input.record_type,
    status: insertStatus,
    amount: input.amount,
    currency: (input.currency || "CNY").toUpperCase(),
    occurred_at: input.occurred_at || new Date().toISOString().slice(0, 10),
    category_id: input.category_id || null,
    subcategory_id: input.subcategory_id || null,
    account_id: input.account_id || null,
    payment_method: input.payment_method || null,
    counterparty_name: input.counterparty_name || null,
    description: input.description,
    quantity: input.quantity ?? 1,
    project_name: input.project_name || null,
    member_id: input.member_id || member.id,
    submitted_by: member.id,
    // owner 自动入账时，approved_by 也记录 owner 自己，审计可追溯
    approved_by: ownerAutoApprove ? member.id : null,
    reimbursement_required: Boolean(input.reimbursement_required),
    reimbursed: Boolean(input.reimbursed),
    risk_level: input.risk_level || "low",
    source: input.source || "manual",
    metadata: input.metadata ?? {}
  };

  if (!supabase) return { ...payload, id: "demo_created", created_at: now, updated_at: now } as FinanceRecord;

  const { data, error } = await supabase.from("finance_records").insert(payload).select().single();
  if (error) {
    // 详细日志：让 Render Logs 能看到 RLS / FK / constraint 等具体错因
    console.error("[createFinanceRecord] INSERT failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      payload_summary: {
        org: payload.organization_id,
        member: payload.member_id,
        submitted_by: payload.submitted_by,
        status: payload.status,
        record_type: payload.record_type,
        amount: payload.amount
      }
    });
    // 把错误码也带到用户错误信息里，方便老板转发给我修
    const msg = error.code
      ? `${error.message} (code: ${error.code}${error.hint ? `, hint: ${error.hint}` : ""})`
      : error.message;
    throw new Error(msg);
  }

  let record = data as FinanceRecord;
  if (targetStatus === "pending_approval") {
    // 从 draft → pending_approval 的合法状态机转移（RLS 允许）
    // 同时关联新建的 approval_request
    try {
      record = await submitFinanceRecord(record.id, record);
    } catch (submitError) {
      // 转移失败：草稿已落库但没提审，给用户明确提示而不是吞错误
      console.error("[createFinanceRecord] submit step failed (draft saved OK):", submitError);
      // 不抛 —— 草稿已经保存了，重要的是不让用户重复提交，提示状态即可
      // 让 UI 显示「草稿已保存，但自动提交审批失败，请进流水列表手动点提交」
      throw new Error(
        `记录已保存为草稿，但自动提交审批失败：${submitError instanceof Error ? submitError.message : "未知错误"}。请进流水列表手动提交。`
      );
    }
  } else {
    writeFinanceRecordTrace({
      event_key: ownerAutoApprove ? "finance.record.owner_auto_approved" : "finance.record.created",
      action: ownerAutoApprove ? "approve" : "create",
      related_record_id: record.id,
      after_data: record as unknown as Record<string, unknown>,
      payload: {
        id: record.id,
        record_no: record.record_no,
        amount: record.amount,
        ...(ownerAutoApprove ? { auto_approve_reason: "owner_non_reimbursement" } : {})
      }
    });
  }

  revalidateFinanceRecordPaths("/finance/records");
  return record;
}

export async function updateFinanceRecord(id: string, input: Partial<FinanceRecordInput>) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  if (input.status === "paid") {
    return markFinanceRecordPaid(id);
  }

  const { data: before } = await supabase.from("finance_records").select("*").eq("organization_id", organization.id).eq("id", id).single();
  const { data, error } = await supabase.from("finance_records").update(input).eq("organization_id", organization.id).eq("id", id).select().single();
  if (error) throw error;

  writeFinanceRecordTrace({
    event_key: "finance.record.updated",
    action: "update",
    related_record_id: id,
    before_data: before,
    after_data: data,
    payload: { id }
  });
  revalidateFinanceRecordPaths("/finance/records");
  return data as FinanceRecord;
}

export async function markFinanceRecordPaid(id: string) {
  if (!(await canApproveFinance())) throw new Error("Missing permission: finance.approve");
  const supabase = await createSupabaseServerClient();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data: before, error: readError } = await supabase.from("finance_records").select("*").eq("id", id).single();
  if (readError) throw readError;

  const { data, error } = await supabase.rpc("finance_settle_record", {
    target_record_id: id,
    actor_member_id: member.id
  });
  if (error) throw error;

  writeFinanceRecordTrace({
    event_key: "finance.record.paid",
    action: "paid",
    related_record_id: id,
    before_data: before,
    after_data: data as Record<string, unknown>,
    payload: { id, amount: (data as FinanceRecord).amount }
  });
  revalidateFinanceRecordPaths("/finance/records", "/finance/reimbursements");
  return data as FinanceRecord;
}

export async function submitFinanceRecord(
  id: string,
  /**
   * 可选：调用方刚 insert/select 拿到的完整 record。
   * 传了就跳过这里的 SELECT *，省一次远程往返（约 150-300ms）。
   */
  prefetchedRecord?: FinanceRecord
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoFinanceRecords[0];

  let record: FinanceRecord;
  if (prefetchedRecord) {
    record = prefetchedRecord;
  } else {
    const { data, error: readError } = await supabase
      .from("finance_records")
      .select("*")
      .eq("id", id)
      .single();
    if (readError) throw readError;
    record = data as FinanceRecord;
  }

  const approval = await createApproval({
    title: `财务审批 ${record.record_no}`,
    description: `${record.description}，金额 ${record.amount} ${record.currency}`,
    related_module: "finance",
    related_record_type: "finance_record",
    related_record_id: record.id,
    risk_level: record.risk_level,
    metadata: { amount: record.amount, currency: record.currency, record_type: record.record_type }
  });

  const { data, error } = await supabase
    .from("finance_records")
    .update({ status: "pending_approval", approval_request_id: "id" in approval ? approval.id : null })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  writeFinanceRecordTrace({
    event_key: "finance.record.submitted",
    action: "submit",
    related_record_id: id,
    before_data: record,
    after_data: data,
    payload: { id, approval_request_id: data.approval_request_id }
  });
  revalidateFinanceRecordPaths("/finance/reimbursements");
  return data as FinanceRecord;
}

export async function approveFinanceRecord(id: string) {
  if (!(await canApproveFinance())) throw new Error("Missing permission: finance.approve");
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const { data: before, error: readError } = await supabase.from("finance_records").select("*").eq("organization_id", organization.id).eq("id", id).single();
  if (readError) throw readError;
  if (before.approval_request_id) await approveApproval(before.approval_request_id);

  const { data, error } = await supabase.from("finance_records").update({ status: "approved", approved_by: member.id }).eq("organization_id", organization.id).eq("id", id).select().single();
  if (error) throw error;
  writeFinanceRecordTrace({
    event_key: "finance.record.approved",
    action: "approve",
    related_record_id: id,
    before_data: before,
    after_data: data,
    payload: { id }
  });
  revalidateFinanceRecordPaths("/finance/reimbursements");
  return data as FinanceRecord;
}

export async function rejectFinanceRecord(id: string, reason?: string) {
  if (!(await canApproveFinance())) throw new Error("Missing permission: finance.approve");
  // 服务端兜底：客户端 required 可被 DevTools 绕过，这里强制非空 + 至少 2 个字
  const trimmed = (reason ?? "").trim();
  if (trimmed.length < 2) {
    throw new Error("驳回必须填写原因，至少 2 个字");
  }
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data: before, error: readError } = await supabase.from("finance_records").select("*").eq("organization_id", organization.id).eq("id", id).single();
  if (readError) throw readError;
  if (before.approval_request_id) await rejectApproval(before.approval_request_id);

  const metadata = { ...(before.metadata ?? {}), reject_reason: trimmed };
  const { data, error } = await supabase.from("finance_records").update({ status: "rejected", metadata }).eq("organization_id", organization.id).eq("id", id).select().single();
  if (error) throw error;
  writeFinanceRecordTrace({
    event_key: "finance.record.rejected",
    action: "reject",
    related_record_id: id,
    before_data: before,
    after_data: data,
    payload: { id, reason: trimmed }
  });
  revalidateFinanceRecordPaths("/finance/reimbursements");
  return data as FinanceRecord;
}
