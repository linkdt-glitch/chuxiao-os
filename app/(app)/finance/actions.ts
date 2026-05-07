"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { confirmParsedFinanceRecord, mapParsedToInput, parseFinanceText } from "@/lib/finance/ai-parse";
import { createFinanceAccount } from "@/lib/finance/accounts";
import { createFinanceCategory } from "@/lib/finance/categories";
import { approveFinanceRecord, createFinanceRecord, rejectFinanceRecord, updateFinanceRecord } from "@/lib/finance/records";
import { linkFileToRecord, uploadFile } from "@/lib/files";
import { runAfter } from "@/lib/server/after";
import type { FinanceAccountType, FinanceCategoryType, FinanceRecordType, ParsedFinanceRecord } from "@/lib/finance/types";

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

async function attachReceiptFiles(formData: FormData, recordId?: string) {
  if (!recordId) return;
  const files = receiptFiles(formData);
  await Promise.all(files.map(async (file) => {
    const created = await uploadFile({
      file,
      file_name: file.name,
      storage_path: `finance/receipts/${recordId}/${Date.now()}-${file.name}`,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      asset_type: "receipt",
      metadata: { asset_type: "receipt", module: "finance" }
    });
    if ("id" in created) {
      await linkFileToRecord({
        file_id: created.id,
        module: "finance",
        record_type: "finance_record",
        record_id: recordId
      });
    }
  }));
}

function receiptFiles(formData: FormData) {
  return formData.getAll("receipt_files").filter((item): item is File => item instanceof File && item.size > 0);
}

async function uploadPendingReceiptFiles(files: File[]) {
  const fileIds = await Promise.all(files.map(async (file) => {
    const created = await uploadFile({
      file,
      file_name: file.name || "receipt",
      storage_path: `finance/receipts/pending/${Date.now()}-${file.name || "receipt"}`,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      asset_type: "receipt",
      metadata: { asset_type: "receipt", module: "finance", status: "pending_ai_parse" }
    });
    return "id" in created ? created.id : null;
  }));
  return fileIds.filter((id): id is string => Boolean(id));
}

async function linkPendingReceiptFiles(formData: FormData, recordId?: string) {
  if (!recordId) return;
  const fileIds = formData.getAll("pending_file_id").filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  await Promise.all(fileIds.map((fileId) =>
    linkFileToRecord({
      file_id: fileId,
      module: "finance",
      record_type: "finance_record",
      record_id: recordId
    })
  ));
}

export async function createFinanceRecordAction(formData: FormData) {
  // Validate amount before hitting DB so user gets a friendly message,
  // not a vague "页面加载失败" from page-level error boundary.
  const rawAmount = value(formData, "amount");
  const amount = Number(rawAmount ?? 0);
  if (!rawAmount || isNaN(amount) || amount <= 0) {
    redirect(`/finance/records/new?error=${encodeURIComponent("金额必须是大于 0 的数字。")}`);
  }
  const description = value(formData, "description") ?? "";
  if (!description.trim()) {
    redirect(`/finance/records/new?error=${encodeURIComponent("请填写说明 / 备注。")}`);
  }
  const occurred_at = value(formData, "occurred_at");
  if (!occurred_at) {
    redirect(`/finance/records/new?error=${encodeURIComponent("请选择发生日期。")}`);
  }

  let recordId: string | undefined;
  try {
    const record = await createFinanceRecord({
      record_type: (value(formData, "record_type") ?? "expense") as FinanceRecordType,
      amount,
      currency: value(formData, "currency") ?? "CNY",
      occurred_at,
      category_id: value(formData, "category_id") ?? null,
      subcategory_id: value(formData, "subcategory_id") ?? null,
      account_id: value(formData, "account_id") ?? null,
      payment_method: value(formData, "payment_method") ?? null,
      counterparty_name: value(formData, "counterparty_name") ?? null,
      description,
      quantity: Number(value(formData, "quantity") ?? 1),
      project_name: value(formData, "project_name") ?? null,
      reimbursement_required: bool(formData, "reimbursement_required"),
      submit_for_approval: bool(formData, "submit_for_approval"),
      metadata: { notes: value(formData, "notes") ?? "" }
    });
    recordId = "id" in record ? record.id : undefined;
    // 票据上传到 Supabase Storage 较慢（5MB 图可能 2-5s）。
    // 用 runAfter 让它在响应送出后台跑，redirect 立刻返回给用户。
    // 用户跳到流水列表时记录已存在，几秒后票据会自动出现（页面下次访问 SSR 时拉到）。
    const pendingFiles = recordId ? receiptFiles(formData) : [];
    if (recordId && pendingFiles.length > 0) {
      const id = recordId;
      runAfter("finance.attach_receipts", () => attachUploadedFiles(pendingFiles, id));
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "保存失败，请检查必填项后重试。";
    redirect(`/finance/records/new?error=${encodeURIComponent(msg)}`);
  }
  redirect(`/finance/records?created=1${recordId ? `&highlight=${recordId}` : ""}`);
}

/**
 * 把 File[] 上传到 Storage 并 link 到 record。
 * 跟 attachReceiptFiles(formData,recordId) 行为一致，但接收已经从 formData
 * 提取出的 File 数组，方便在 runAfter 闭包中调用。
 */
async function attachUploadedFiles(files: File[], recordId: string) {
  await Promise.all(
    files.map(async (file) => {
      const created = await uploadFile({
        file,
        file_name: file.name,
        storage_path: `finance/receipts/${recordId}/${Date.now()}-${file.name}`,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        asset_type: "receipt",
        metadata: { asset_type: "receipt", module: "finance" }
      });
      if ("id" in created) {
        await linkFileToRecord({
          file_id: created.id,
          module: "finance",
          record_type: "finance_record",
          record_id: recordId
        });
      }
    })
  );
}

export async function updateFinanceRecordAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing record id");
  await updateFinanceRecord(id, {
    status: value(formData, "status") as never
  });
  revalidatePath("/finance/records");
}

export async function approveFinanceRecordAction(formData: FormData) {
  const ids = values(formData, "id");
  if (!ids.length) throw new Error("Missing record id");
  await Promise.all(ids.map((id) => approveFinanceRecord(id)));
  revalidatePath("/finance/records");
  revalidatePath("/finance/reimbursements");
}

export async function rejectFinanceRecordAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing record id");
  await rejectFinanceRecord(id, value(formData, "reason"));
  revalidatePath("/finance/records");
  revalidatePath("/finance/reimbursements");
}

export async function createFinanceCategoryAction(formData: FormData) {
  await createFinanceCategory({
    name: value(formData, "name") ?? "新类目",
    type: (value(formData, "type") ?? "expense") as FinanceCategoryType,
    parent_id: value(formData, "parent_id") ?? null,
    code: value(formData, "code") ?? null,
    description: value(formData, "description") ?? ""
  });
  revalidatePath("/finance/categories");
}

export async function createFinanceAccountAction(formData: FormData) {
  await createFinanceAccount({
    name: value(formData, "name") ?? "新账户",
    account_type: (value(formData, "account_type") ?? "bank") as FinanceAccountType,
    currency: value(formData, "currency") ?? "CNY",
    opening_balance: Number(value(formData, "opening_balance") ?? 0),
    current_balance: Number(value(formData, "current_balance") ?? value(formData, "opening_balance") ?? 0)
  });
  revalidatePath("/finance/accounts");
}

export type AIParseState = {
  parseLogId?: string;
  parsed?: ParsedFinanceRecord;
  pendingFileIds?: string[];
  recordId?: string;
  error?: string;
  success?: string;
};

export async function parseFinanceTextAction(_: AIParseState, formData: FormData): Promise<AIParseState> {
  const rawText = value(formData, "raw_text");
  const files = receiptFiles(formData);
  if (!rawText && !files.length) return { error: "请输入一句话记账内容，或拍照上传一张票据。" };
  try {
    const result = await parseFinanceText(rawText ?? "", files);
    const pendingFileIds = await uploadPendingReceiptFiles(files);
    return { parseLogId: result.id, parsed: result.parsed, pendingFileIds };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI 解析失败，请稍后重试。" };
  }
}

export async function confirmParsedFinanceRecordAction(_: AIParseState, formData: FormData): Promise<AIParseState> {
  const parseLogId = value(formData, "parse_log_id");
  if (!parseLogId) return { error: "缺少 AI 解析记录。" };
  const intent = value(formData, "intent");
  try {
    const record = await confirmParsedFinanceRecord(parseLogId, {
      record_type: (value(formData, "record_type") ?? "expense") as FinanceRecordType,
      amount: Number(value(formData, "amount") ?? 0),
      currency: value(formData, "currency") ?? "CNY",
      occurred_at: value(formData, "occurred_at"),
      category_id: value(formData, "category_id") ?? null,
      subcategory_id: value(formData, "subcategory_id") ?? null,
      account_id: value(formData, "account_id") ?? null,
      payment_method: value(formData, "payment_method") ?? null,
      counterparty_name: value(formData, "counterparty_name") ?? null,
      description: value(formData, "description") ?? "财务记录",
      quantity: Number(value(formData, "quantity") ?? 1),
      project_name: value(formData, "project_name") ?? null,
      reimbursement_required: bool(formData, "reimbursement_required"),
      submit_for_approval: intent === "draft" ? false : bool(formData, "submit_for_approval"),
      metadata: { notes: value(formData, "notes") ?? "" }
    });
    const recordId = "id" in record ? record.id : undefined;
    await Promise.all([
      linkPendingReceiptFiles(formData, recordId),
      attachReceiptFiles(formData, recordId)
    ]);
    return {
      recordId,
      success: intent === "draft" ? "草稿已保存，正在返回财务流水。" : "财务记录已保存，正在返回财务流水。"
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "保存失败，请检查金额、说明和必填字段。" };
  }
}

export async function parsedToRecordInputAction(parsed: ParsedFinanceRecord) {
  return mapParsedToInput(parsed);
}
