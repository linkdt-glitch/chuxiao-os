"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { confirmParsedFinanceRecord, mapParsedToInput, parseFinanceText } from "@/lib/finance/ai-parse";
import { createFinanceAccount } from "@/lib/finance/accounts";
import { createFinanceCategory } from "@/lib/finance/categories";
import { approveFinanceRecord, createFinanceRecord, rejectFinanceRecord, updateFinanceRecord } from "@/lib/finance/records";
import { linkFileToRecord, uploadFile } from "@/lib/files";
import type { FinanceAccountType, FinanceCategoryType, FinanceRecordType, ParsedFinanceRecord } from "@/lib/finance/types";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

async function attachReceiptFiles(formData: FormData, recordId?: string) {
  if (!recordId) return;
  const files = formData.getAll("receipt_files").filter((item): item is File => item instanceof File && item.size > 0);
  for (const file of files) {
    const created = await uploadFile({
      file_name: file.name,
      storage_path: `finance/receipts/${recordId}/${Date.now()}-${file.name}`,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size
    });
    if ("id" in created) {
      await linkFileToRecord({
        file_id: created.id,
        module: "finance",
        record_type: "finance_record",
        record_id: recordId
      });
    }
  }
}

export async function createFinanceRecordAction(formData: FormData) {
  const record = await createFinanceRecord({
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
    submit_for_approval: bool(formData, "submit_for_approval"),
    metadata: { notes: value(formData, "notes") ?? "" }
  });
  await attachReceiptFiles(formData, "id" in record ? record.id : undefined);
  redirect("/finance/records");
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
  const id = value(formData, "id");
  if (!id) throw new Error("Missing record id");
  await approveFinanceRecord(id);
}

export async function rejectFinanceRecordAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing record id");
  await rejectFinanceRecord(id, value(formData, "reason"));
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
  error?: string;
  success?: string;
};

export async function parseFinanceTextAction(_: AIParseState, formData: FormData): Promise<AIParseState> {
  const rawText = value(formData, "raw_text");
  if (!rawText) return { error: "请输入一句话记账内容。" };
  const result = await parseFinanceText(rawText);
  return { parseLogId: result.id, parsed: result.parsed };
}

export async function confirmParsedFinanceRecordAction(_: AIParseState, formData: FormData): Promise<AIParseState> {
  const parseLogId = value(formData, "parse_log_id");
  if (!parseLogId) return { error: "缺少 AI 解析记录。" };
  const intent = value(formData, "intent");
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
  await attachReceiptFiles(formData, "id" in record ? record.id : undefined);
  return { success: "已确认并创建财务记录。" };
}

export async function parsedToRecordInputAction(parsed: ParsedFinanceRecord) {
  return mapParsedToInput(parsed);
}
