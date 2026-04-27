import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { getCurrentOrganization, getCurrentUser } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { createFinanceRecord } from "@/lib/finance/records";
import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceCategories } from "@/lib/finance/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { invokeAI } from "@/lib/ai";
import type { FinanceRecordInput, ParsedFinanceRecord } from "@/lib/finance/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(text: string) {
  const match = text.match(/(\d+(?:\.\d{1,2})?)\s*(元|块|人民币|cny|CNY|美元|usd|USD)?/);
  return match ? Number(match[1]) : null;
}

function parseDate(text: string) {
  const explicit = text.match(/(20\d{2})[-年\/.](\d{1,2})[-月\/.](\d{1,2})/);
  if (explicit) return `${explicit[1]}-${explicit[2].padStart(2, "0")}-${explicit[3].padStart(2, "0")}`;
  if (text.includes("昨天")) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }
  return today();
}

function inferParsedText(text: string): ParsedFinanceRecord {
  const amount = parseAmount(text);
  const isIncome = /收入|收款|到账|销售|客户付款|回款/.test(text);
  const reimbursement = /报销|垫付/.test(text);
  const recordType = reimbursement ? "reimbursement" : isIncome ? "income" : "expense";
  const category = /打样|样品/.test(text)
    ? { parent: "产品成本", child: "打样费" }
    : /广告|推广|投流/.test(text)
      ? { parent: "广告推广", child: "平台广告" }
      : /运费|物流|快递/.test(text)
        ? { parent: "物流仓储", child: "运费" }
        : /AI|SaaS|软件|云/.test(text)
          ? { parent: "软件与 AI 成本", child: "AI 工具" }
          : isIncome
            ? { parent: "销售收入", child: undefined }
            : { parent: "其他支出", child: undefined };
  const account = /微信/.test(text) ? "微信支付" : /支付宝/.test(text) ? "支付宝" : /PayPal/i.test(text) ? "PayPal" : /Stripe/i.test(text) ? "Stripe" : /银行|转账/.test(text) ? "公司银行账户" : undefined;
  const currency = /美元|USD|usd/.test(text) ? "USD" : "CNY";
  const missing = [];
  if (!amount) missing.push("amount");
  if (!text.trim()) missing.push("description");

  return {
    record_type: recordType,
    amount,
    currency,
    occurred_at: parseDate(text),
    category_name: category.parent,
    subcategory_name: category.child,
    account_name: account,
    payment_method: account,
    counterparty_name: /供应商/.test(text) ? "供应商" : /客户/.test(text) ? "客户" : undefined,
    project_name: /用于(.+?)(，|,|。|$)/.exec(text)?.[1],
    description: text.replace(/需要报销|报销/g, "").trim() || "财务记录",
    quantity: 1,
    reimbursement_required: reimbursement,
    need_approval: reimbursement || amount !== null && amount >= 500,
    risk_level: amount !== null && amount >= 10000 ? "high" : amount !== null && amount >= 3000 ? "medium" : "low",
    confidence: missing.length ? 0.55 : 0.9,
    missing_fields: missing,
    notes: ""
  };
}

export async function parseFinanceText(rawText: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getCurrentUser();
  const prompt = `Parse this finance bookkeeping text as strict JSON. Text: ${rawText}`;
  const ai = await invokeAI({ module: "finance", prompt });
  const parsed = inferParsedText(rawText);

  if (!supabase) {
    await emitEvent({ event_key: "finance.ai_parsed", module: "finance", payload: { raw_text: rawText, parsed } });
    return { id: "demo_ai_parse", parsed };
  }

  const { data, error } = await supabase
    .from("finance_ai_parse_logs")
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      raw_text: rawText,
      parsed_result: parsed,
      ai_invocation_log_id: ai.invocationLogId ?? null,
      status: parsed.missing_fields.length ? "failed" : "parsed",
      error_message: parsed.missing_fields.length ? `缺少关键字段：${parsed.missing_fields.join(", ")}` : null
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({ event_key: "finance.ai_parsed", action: "ai_parse", module: "finance", related_record_type: "finance_ai_parse_log", related_record_id: data.id, after_data: parsed });
  await emitEvent({ event_key: "finance.ai_parsed", module: "finance", payload: { id: data.id, confidence: parsed.confidence } });
  revalidatePath("/finance/ai-bookkeeping");
  return { id: data.id as string, parsed };
}

export async function confirmParsedFinanceRecord(parseLogId: string, input: FinanceRecordInput) {
  const supabase = await createSupabaseServerClient();
  const record = await createFinanceRecord({ ...input, source: "ai_parse" });

  if (supabase && parseLogId !== "demo_ai_parse") {
    const { error } = await supabase
      .from("finance_ai_parse_logs")
      .update({
        confirmed_result: record,
        status: "confirmed",
        confirmed_at: new Date().toISOString()
      })
      .eq("id", parseLogId);
    if (error) throw error;
  }

  await logAction({ event_key: "finance.ai_confirmed", action: "confirm", module: "finance", related_record_type: "finance_record", related_record_id: "id" in record ? record.id : null, after_data: record as unknown as Record<string, unknown> });
  await emitEvent({ event_key: "finance.ai_confirmed", module: "finance", payload: { parse_log_id: parseLogId, record_id: "id" in record ? record.id : null } });
  revalidatePath("/finance");
  revalidatePath("/finance/records");
  return record;
}

export async function mapParsedToInput(parsed: ParsedFinanceRecord): Promise<FinanceRecordInput> {
  const [categories, accounts] = await Promise.all([getFinanceCategories("all"), getFinanceAccounts()]);
  const flattened = categories.flatMap((category) => [category, ...(category.children ?? [])]);
  const category = flattened.find((item) => item.name === parsed.category_name);
  const subcategory = flattened.find((item) => item.name === parsed.subcategory_name);
  const account = accounts.find((item) => item.name === parsed.account_name);

  return {
    record_type: parsed.record_type,
    amount: parsed.amount ?? 0,
    currency: parsed.currency || "CNY",
    occurred_at: parsed.occurred_at || today(),
    category_id: category?.id,
    subcategory_id: subcategory?.id,
    account_id: account?.id,
    payment_method: parsed.payment_method,
    counterparty_name: parsed.counterparty_name,
    description: parsed.description,
    quantity: parsed.quantity || 1,
    project_name: parsed.project_name,
    reimbursement_required: parsed.reimbursement_required,
    risk_level: parsed.risk_level,
    submit_for_approval: parsed.need_approval,
    metadata: { notes: parsed.notes ?? "", ai_confidence: parsed.confidence }
  };
}
