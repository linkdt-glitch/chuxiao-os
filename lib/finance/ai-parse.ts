import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentOrganization, getCurrentUser } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { createFinanceRecord } from "@/lib/finance/records";
import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceCategories } from "@/lib/finance/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { invokeAI, invokeAIWithImages, type AIImageInput } from "@/lib/ai";
import type { FinanceRecordInput, ParsedFinanceRecord } from "@/lib/finance/types";

const parsedFinanceSchema = z.object({
  record_type: z.enum(["income", "expense", "reimbursement", "transfer", "refund", "adjustment"]),
  amount: z.coerce.number().nonnegative().nullable(),
  currency: z.string().min(3).default("CNY"),
  occurred_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_name: z.string().optional(),
  subcategory_name: z.string().optional(),
  account_name: z.string().optional(),
  payment_method: z.string().optional(),
  counterparty_name: z.string().optional(),
  project_name: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().positive().default(1),
  reimbursement_required: z.boolean().default(false),
  need_approval: z.boolean().default(false),
  risk_level: z.enum(["low", "medium", "high", "critical"]).default("low"),
  confidence: z.coerce.number().min(0).max(1).default(0.7),
  missing_fields: z.array(z.string()).default([]),
  notes: z.string().optional()
});

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
  const category = /订阅|软件收入|技术服务|咨询|实施|开发服务/.test(text)
    ? { parent: "服务与订阅收入", child: undefined }
    : /退款|退货|折扣|赔付|销售调整/.test(text)
      ? { parent: "退款与销售调整", child: undefined }
      : isIncome
        ? { parent: "商品销售收入", child: undefined }
        : /采购|生产|打样|样品|包装|质检|头程/.test(text)
          ? { parent: "商品成本", child: /采购|生产/.test(text) ? "采购 / 生产" : "包装 / 质检 / 打样" }
          : /运费|物流|快递|仓储|海外仓|FBA|清关|关税|尾程/.test(text)
            ? { parent: "物流仓储", child: undefined }
            : /Amazon|亚马逊|Shopify|TikTok|平台|佣金|履约费|渠道|店铺/.test(text)
              ? { parent: "平台与渠道费用", child: undefined }
              : /广告|推广|投流|Google|Meta|Facebook|TikTok|红人|达人|affiliate|素材|内容/.test(text)
                ? { parent: "广告与增长", child: undefined }
                : /Stripe|PayPal|支付|手续费|汇兑|换汇|利息|银行费/.test(text)
                  ? { parent: "支付与金融费用", child: undefined }
                  : /AI|OpenAI|DeepSeek|SaaS|软件|云|服务器|API|存储|数据/.test(text)
                    ? { parent: "软件、AI 与云服务", child: undefined }
                    : /工资|社保|福利|奖金|招聘|外包|顾问|客服/.test(text)
                      ? { parent: "人工与外包", child: undefined }
                      : /研发|产品|设计|测试|认证|专利|商标|模具/.test(text)
                        ? { parent: "研发与产品", child: undefined }
                        : /会计|法律|律师|税务|合规|审计|注册|年审/.test(text)
                          ? { parent: "专业服务与合规", child: undefined }
                          : /差旅|交通|住宿|餐饮|展会|招待/.test(text)
                            ? { parent: "差旅与招待", child: undefined }
                            : /VAT|GST|销售税|所得税|税费|政府规费/.test(text)
                              ? { parent: "税费", child: undefined }
                              : /电脑|设备|家具|折旧|摊销|资产/.test(text)
                                ? { parent: "资产与折旧", child: undefined }
                                : /报废|货损|坏账|盘点|异常|赔偿|调整/.test(text)
                                  ? { parent: "异常损失与调整", child: undefined }
                                  : { parent: "办公与行政", child: undefined };
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

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

const VISION_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_VISION_FILE_SIZE = 3 * 1024 * 1024;
const MAX_VISION_FILES = 1;

function isReadableFile(file: File) {
  return file.size > 0 && VISION_MIME_TYPES.has(file.type) && file.size <= MAX_VISION_FILE_SIZE;
}

async function filesToAIImages(files: File[] = []): Promise<AIImageInput[]> {
  const readable = files.filter(isReadableFile).slice(0, MAX_VISION_FILES);
  return Promise.all(readable.map(async (file) => ({
    mime_type: file.type,
    data_base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    file_name: file.name
  })));
}

function describeFiles(files: File[] = []) {
  return files
    .filter((file) => file.size > 0)
    .map((file) => `${file.name || "未命名票据"} (${file.type || "unknown"}, ${(file.size / 1024).toFixed(0)}KB)`);
}

function normalizeParsedResult(input: unknown, fallback: ParsedFinanceRecord): ParsedFinanceRecord {
  const result = parsedFinanceSchema.safeParse(input);
  if (!result.success) {
    return {
      ...fallback,
      notes: [fallback.notes, "AI JSON 未通过结构校验，已使用本地规则兜底。"].filter(Boolean).join(" ")
    };
  }

  const parsed = result.data;
  const missing = new Set(parsed.missing_fields);
  if (!parsed.amount || parsed.amount <= 0) missing.add("amount");
  if (!parsed.record_type) missing.add("record_type");
  if (!parsed.occurred_at) missing.add("occurred_at");
  if (!parsed.description.trim()) missing.add("description");

  return {
    ...parsed,
    missing_fields: Array.from(missing)
  };
}

function canUseLocalFastPath(text: string, fallback: ParsedFinanceRecord, images: AIImageInput[], hasFiles: boolean) {
  if (process.env.FINANCE_AI_FAST_LOCAL === "false") return false;
  if (hasFiles) return false;
  if (images.length > 0) return false;
  if (!text || text.length > 180) return false;
  return Boolean(fallback.amount && fallback.confidence >= 0.86 && fallback.missing_fields.length === 0);
}

export async function parseFinanceText(rawText: string, files: File[] = []) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getCurrentUser();
  const fileDescriptions = describeFiles(files);
  const images = await filesToAIImages(files);
  const normalizedText = rawText.trim();
  const fallbackText = [normalizedText, fileDescriptions.length ? `票据附件：${fileDescriptions.join("；")}` : ""].filter(Boolean).join("\n");
  const fallback = inferParsedText(fallbackText);
  const rawLogText = fallbackText || "[空白 AI 记账请求]";

  async function saveParsedResult(parsed: ParsedFinanceRecord, aiInvocationLogId?: string | null) {
    if (!supabase) {
      await emitEvent({ event_key: "finance.ai_parsed", module: "finance", payload: { raw_text: rawLogText, parsed, file_count: fileDescriptions.length } });
      return { id: "demo_ai_parse", parsed };
    }

    const { data, error } = await supabase
      .from("finance_ai_parse_logs")
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        raw_text: rawLogText,
        parsed_result: parsed,
        ai_invocation_log_id: aiInvocationLogId ?? null,
        status: "parsed",
        error_message: parsed.missing_fields.length ? `需要补充：${parsed.missing_fields.join(", ")}` : null
      })
      .select()
      .single();

    if (error) throw error;
    await logAction({ event_key: "finance.ai_parsed", action: "ai_parse", module: "finance", related_record_type: "finance_ai_parse_log", related_record_id: data.id, after_data: parsed });
    await emitEvent({ event_key: "finance.ai_parsed", module: "finance", payload: { id: data.id, confidence: parsed.confidence, file_count: fileDescriptions.length } });
    revalidatePath("/finance/ai-bookkeeping");
    return { id: data.id as string, parsed };
  }

  if (canUseLocalFastPath(normalizedText, fallback, images, fileDescriptions.length > 0)) {
    return saveParsedResult({
      ...fallback,
      notes: [fallback.notes, "极速草稿：已用本地财务规则秒级生成，适合常见一句话记账。"].filter(Boolean).join(" ")
    }, null);
  }

  const prompt = `只返回 JSON，不要 Markdown。
从企业财务文本或票据中提取一条记账记录。字段：
record_type(income/expense/reimbursement/transfer/refund/adjustment), amount, currency, occurred_at(YYYY-MM-DD),
category_name, subcategory_name, account_name, payment_method, counterparty_name, project_name, description, quantity,
reimbursement_required, need_approval, risk_level(low/medium/high/critical), confidence, missing_fields, notes。
今天日期：${today()}
用户原文：${normalizedText || "无文字，按票据识别"}
附件：${fileDescriptions.length ? fileDescriptions.join("；") : "无"}`;

  const ai = images.length
    ? await invokeAIWithImages({
      module: "finance.ai_parse.vision",
      prompt,
      images,
      responseFormat: "json",
      maxTokens: 650,
      timeoutMs: Number(process.env.FINANCE_AI_VISION_TIMEOUT_MS || 12_000)
    })
    : await invokeAI({
      module: "finance.ai_parse.text",
      prompt,
      responseFormat: "json",
      maxTokens: 420,
      timeoutMs: Number(process.env.FINANCE_AI_PARSE_TIMEOUT_MS || 6_500)
    });
  const modelJson = extractJsonObject(ai.text);
  const parsed = normalizeParsedResult(modelJson, fallback);
  return saveParsedResult(parsed, ai.invocationLogId ?? null);
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
