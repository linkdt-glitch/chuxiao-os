import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { getCurrentOrganization, getCurrentUser } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { createFinanceRecord } from "@/lib/finance/records";
import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceCategories } from "@/lib/finance/categories";
import { runAfter } from "@/lib/server/after";
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
  // 支持 1-3 位小数（与表单 step=0.001 对齐）
  const match = text.match(/(\d+(?:\.\d{1,3})?)\s*(元|块|人民币|cny|CNY|美元|usd|USD)?/);
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
/** 一次最多识别 3 张票据 —— 兼顾「拍正面 + 反面 + 总览」典型场景 */
const MAX_VISION_FILES = 3;

function isReadableFile(file: File) {
  return file.size > 0 && VISION_MIME_TYPES.has(file.type) && file.size <= MAX_VISION_FILE_SIZE;
}

/** 把「为什么这张票据没被识别」用人话讲清楚，方便前端 / 日志展示。 */
function fileSkipReason(file: File): string | null {
  if (file.size === 0) return "文件为空";
  if (!VISION_MIME_TYPES.has(file.type)) {
    if (file.type === "application/pdf") return "PDF 不能直接识别（仅当作附件保留），请改拍照";
    if (file.type === "image/heic" || file.type === "image/heif") return "iPhone 默认 HEIC 格式不支持，请在相机设置里改成 JPEG";
    return `不支持的格式：${file.type || "未知"}`;
  }
  if (file.size > MAX_VISION_FILE_SIZE) {
    return `图片超过 ${(MAX_VISION_FILE_SIZE / 1024 / 1024).toFixed(0)}MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB），AI 会跳过`;
  }
  return null;
}

async function filesToAIImages(files: File[] = []): Promise<AIImageInput[]> {
  const readable = files.filter(isReadableFile).slice(0, MAX_VISION_FILES);
  return Promise.all(readable.map(async (file) => ({
    mime_type: file.type,
    data_base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    file_name: file.name
  })));
}

/** 给前端 / parse log 用：列出每个文件「能识别 / 跳过原因」。 */
export function summarizeVisionEligibility(files: File[] = []) {
  const skipped = files
    .map((file) => ({ name: file.name, reason: fileSkipReason(file) }))
    .filter((x): x is { name: string; reason: string } => x.reason !== null);
  const acceptedCount = files.length - skipped.length;
  const overflow = Math.max(0, acceptedCount - MAX_VISION_FILES);
  return { acceptedCount: Math.min(acceptedCount, MAX_VISION_FILES), skipped, overflow };
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

  // ⭐ 拉当前组织的实际类目，让 AI 在「真实可选名字」里挑，避免它自己造一个对不上的名字
  // 平铺一级 + 二级，让 AI 既能选大类也能选细分（系统当前是 6 大类 + 无子类，但保留扩展性）
  const categories = await getFinanceCategories("all");
  const flatCategories = categories.flatMap((c) => [c, ...(c.children ?? [])]);
  const categoryHint = flatCategories.length
    ? `\n可选类目（category_name 必须严格从下面这份清单里挑一个，不要造新名字、不要意译）：\n${
        flatCategories
          .map((c) => `- ${c.name}${c.description ? `：${c.description}` : ""}`)
          .join("\n")
      }\n挑选规则：根据用户原文 / 票据内容的核心用途，选最贴近的一个；实在拿不准就选「品牌与其他」类作兜底。`
    : "";

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
    runAfter("finance.ai_parsed", () =>
      Promise.all([
        logAction({ event_key: "finance.ai_parsed", action: "ai_parse", module: "finance", related_record_type: "finance_ai_parse_log", related_record_id: data.id, after_data: parsed }),
        emitEvent({ event_key: "finance.ai_parsed", module: "finance", payload: { id: data.id, confidence: parsed.confidence, file_count: fileDescriptions.length } })
      ])
    );
    runAfter("finance.ai_parse.revalidate", () => revalidatePath("/finance/ai-bookkeeping"));
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
reimbursement_required, need_approval, risk_level(low/medium/high/critical), confidence, missing_fields, notes。${categoryHint}
今天日期：${today()}
用户原文：${normalizedText || "无文字，按票据识别"}
附件：${fileDescriptions.length ? fileDescriptions.join("；") : "无"}`;

  // AI 调用 + graceful fallback：
  // - 调用成功 → 用 AI 结果
  // - 调用失败（超时 / API key 错 / 网络挂等）→ 不抛错，回落到本地规则解析的草稿
  //   用户依然能看到一个可编辑的草稿（金额 / 描述等本地能抽到的字段），手动补类目即可
  //   并把真实错误打到 Render Logs，方便定位 API key / 余额 / 超时等问题
  try {
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
  } catch (aiError) {
    // AI 调用本身挂了（不是 JSON 解析），打详细日志 + 用本地草稿兜底
    console.error("[parseFinanceText] AI invocation failed, falling back to local rules:", {
      error_name: aiError instanceof Error ? aiError.name : typeof aiError,
      error_message: aiError instanceof Error ? aiError.message : String(aiError),
      has_images: images.length > 0,
      prompt_length: prompt.length,
      text_length: normalizedText.length
    });
    return saveParsedResult(
      {
        ...fallback,
        notes: [
          fallback.notes,
          `⚠️ AI 服务暂时不可用，已用本地规则生成草稿，请手动检查并完善字段（特别是类目）。原因：${
            aiError instanceof Error ? aiError.message : "未知错误"
          }`
        ]
          .filter(Boolean)
          .join(" ")
      },
      null
    );
  }
}

export async function confirmParsedFinanceRecord(parseLogId: string, input: FinanceRecordInput) {
  const supabase = await createSupabaseServerClient();
  const record = await createFinanceRecord({ ...input, source: "ai_parse" });
  const recordId = "id" in record ? record.id : null;

  const sideEffects: Array<() => Promise<unknown>> = [
    () => logAction({ event_key: "finance.ai_confirmed", action: "confirm", module: "finance", related_record_type: "finance_record", related_record_id: recordId, after_data: record as unknown as Record<string, unknown> }),
    () => emitEvent({ event_key: "finance.ai_confirmed", module: "finance", payload: { parse_log_id: parseLogId, record_id: recordId } })
  ];
  if (supabase && parseLogId !== "demo_ai_parse") {
    sideEffects.push(async () => {
      const { error } = await supabase
        .from("finance_ai_parse_logs")
        .update({
          confirmed_result: record,
          status: "confirmed",
          confirmed_at: new Date().toISOString()
        })
        .eq("id", parseLogId);
      if (error) throw error;
    });
  }

  runAfter("finance.ai_confirmed", () => Promise.all(sideEffects.map((task) => task())));
  runAfter("finance.ai_confirmed.revalidate", () => revalidatePath("/finance/records"));
  return record;
}

/**
 * AI 给的类目名 → DB 类目 id。
 * 1. 严格名字匹配
 * 2. 严格不匹配 → 去掉「与/和」等连接词做 fuzzy 匹配
 *    （例：AI 说「办公差旅」也能匹到「办公与差旅」）
 * 3. 还不行 → 关键词包含匹配（AI 说「外卖」匹「办公与差旅」描述里的「商务餐饮」）
 */
function findCategoryByFuzzyName(
  candidates: Array<{ id: string; name: string; description?: string }>,
  aiName: string | undefined
) {
  if (!aiName) return undefined;
  // 1. 严格相等
  const exact = candidates.find((c) => c.name === aiName);
  if (exact) return exact;
  // 2. 去 connector 后比较
  const normalize = (s: string) => s.replace(/[\s/、，,与和及]/g, "").toLowerCase();
  const target = normalize(aiName);
  const norm = candidates.find((c) => normalize(c.name) === target);
  if (norm) return norm;
  // 3. 关键词包含（AI name 出现在类目 description 里就算）
  return candidates.find((c) =>
    (c.description ?? "").toLowerCase().includes(aiName.toLowerCase())
  );
}

export async function mapParsedToInput(parsed: ParsedFinanceRecord): Promise<FinanceRecordInput> {
  const [categories, accounts] = await Promise.all([getFinanceCategories("all"), getFinanceAccounts()]);
  const flattened = categories.flatMap((category) => [category, ...(category.children ?? [])]);
  const category = findCategoryByFuzzyName(flattened, parsed.category_name);
  const subcategory = findCategoryByFuzzyName(flattened, parsed.subcategory_name);
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
