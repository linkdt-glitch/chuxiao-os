/**
 * 中文 AI 模型目录 —— 系统所有 LLM 调用都从这里取「该用哪个模型 / 多少钱」。
 *
 * 设计意图：
 *   - 创始人 / 老板 默认走最聪明的推理模型（DeepSeek-R1，对标 OpenAI o1）
 *   - 普通员工走平衡型 V3.1（性价比最高）
 *   - AI 解析记账 / OCR 用 7B 极速模型，避免阻塞用户
 *   - 价格 (CNY) 都是 SiliconFlow 官方报价（2026-05），偶尔会有调整
 *     —— 准确数字以 https://siliconflow.cn/pricing 为准
 *
 * 一次「正常对话」≈ 800 tokens 输入 + 600 tokens 输出（含历史上下文）
 * 一次「AI 记账解析」≈ 200 tokens 输入 + 150 tokens 输出
 */
export type ModelTier = "founder" | "standard" | "fast" | "vision";

export type ModelCatalogEntry = {
  id: string; // SiliconFlow / DeepSeek model id
  label: string; // 显示名（中文）
  tier: ModelTier;
  vendor: string; // 显示用，告诉用户这是谁家的
  description: string;
  inputPriceCnyPerMillion: number; // ¥/M tokens
  outputPriceCnyPerMillion: number;
  contextWindowK: number; // 上下文窗口（千 tokens）
  /** 估一次「正常对话」的价格 —— 给用户「这次会花多少钱」的直观感受。 */
  approxCostPerTurnCny: number;
  recommendedFor: string;
};

/**
 * 创始人 / 老板专用 —— 当前 DeepSeek 最强的推理 / 决策模型。
 *
 *   DeepSeek-V4 Pro 是 V4 系列的顶级版本，1M 上下文，深度思考，
 *   多步骤推理、财务分析、商业决策、合同审查碾压 flash 版。
 *   官方挂牌价 ¥12 / ¥24 per M，但 2026 年 5 月 31 日前 75% off
 *   → 实际成本 ¥3 / ¥6 per M（创始人单次大约 ¥0.012-0.024）。
 *
 *   DeepSeek 官方 API id = "deepseek-v4-pro"
 *   旧 id "deepseek-reasoner" / SiliconFlow 转售 R1 都被
 *   estimateCostCny() 视为同档（兼容老调用）。
 */
export const FOUNDER_CHAT_MODEL: ModelCatalogEntry = {
  id: "deepseek-v4-pro",
  label: "DeepSeek-V4 Pro（顶级思考）",
  tier: "founder",
  vendor: "DeepSeek · V4 旗舰",
  description:
    "DeepSeek 当前最强模型，1M 上下文 + 深度思考。多步骤推理、商业决策、财报解读、合同审查最强。当前 75% 折扣（截至 2026-05-31）。",
  // 挂牌价（折扣前）—— estimateCostCny 用这个
  inputPriceCnyPerMillion: 12,
  outputPriceCnyPerMillion: 24,
  contextWindowK: 1024,
  // 75% off 后单次实际花费约 ¥0.02；折扣结束按挂牌价约 ¥0.05/次
  approxCostPerTurnCny: 0.02,
  recommendedFor: "创始人 / 老板 —— 战略决策、复杂问题分析、财报解读、合同审查"
};

/**
 * 全员日常对话 —— 性价比之王。
 *
 *   DeepSeek-V4 Flash 上下文一下到 1M，价格降到 ¥1 / ¥2 per M
 *   （比 V3.2 又便宜一半），员工日常用绰绰有余。
 *
 *   DeepSeek 官方 API id = "deepseek-v4-flash"
 *   旧 id "deepseek-chat" 仍可用但官方说后续会废弃。
 */
export const STANDARD_CHAT_MODEL: ModelCatalogEntry = {
  id: "deepseek-v4-flash",
  label: "DeepSeek-V4 Flash",
  tier: "standard",
  vendor: "DeepSeek · V4",
  description:
    "1M 上下文，输出价 ¥2/M，单次约 1 分钱。员工日常对话足够。",
  inputPriceCnyPerMillion: 1,
  outputPriceCnyPerMillion: 2,
  contextWindowK: 1024,
  approxCostPerTurnCny: 0.005,
  recommendedFor: "员工日常对话 —— 写文案、写邮件、答常识、整理思路"
};

/**
 * 极速短任务 + 票据 OCR 通吃 —— 升级到 Qwen3-VL-32B-Instruct。
 *
 *   原 Qwen2.5-7B 只支持文本，VISION 单独走 VL-7B；
 *   新 Qwen3-VL-32B 同时支持文本 + 视觉，且：
 *     - 输入价 ¥0.2/M（比 7B 的 ¥0.35 更便宜 40%）
 *     - 输出价 ¥0.6/M（输出短，差距不大）
 *     - 参数量 32B（7B 的 4.5×，中文票据识别精度大幅提升）
 *     - Qwen3 新架构，对结构化 JSON 输出更稳
 *
 *   净结果：单次成本基本持平甚至更便宜，但智能提升明显。
 *   FAST_PARSE 和 VISION 共用同一模型，简化路由、统一定价。
 */
export const FAST_PARSE_MODEL: ModelCatalogEntry = {
  id: "Qwen/Qwen3-VL-32B-Instruct",
  label: "Qwen3-VL-32B",
  tier: "fast",
  vendor: "通义千问 · 32B 视觉文本通用",
  description: "新一代 32B 多模态，文本 + 图片通吃。输入比 7B 还便宜，准确率提升明显。",
  inputPriceCnyPerMillion: 0.2,
  outputPriceCnyPerMillion: 0.6,
  contextWindowK: 128,
  approxCostPerTurnCny: 0.0002,
  recommendedFor: "AI 记账解析、字段抽取、自动归类"
};

/**
 * 视觉理解 —— 拍照记账、票据 OCR、图片识别。
 *
 *   跟 FAST_PARSE 用同一个 Qwen3-VL-32B，统一定价 + 简化运维。
 *   独立 catalog 条目方便后续按模块切换（比如想让 OCR 走更贵的 72B 提高精度）。
 */
export const VISION_MODEL: ModelCatalogEntry = {
  id: "Qwen/Qwen3-VL-32B-Instruct",
  label: "Qwen3-VL-32B",
  tier: "vision",
  vendor: "通义千问 · 32B 多模态",
  description: "拍照识别票据 / 截图，32B 模型对中文 OCR + 表格提取明显比 7B 准。",
  inputPriceCnyPerMillion: 0.2,
  outputPriceCnyPerMillion: 0.6,
  contextWindowK: 128,
  approxCostPerTurnCny: 0.0005,
  recommendedFor: "拍照记账、票据 OCR、图片识别"
};

export const ALL_MODELS: ReadonlyArray<ModelCatalogEntry> = [
  FOUNDER_CHAT_MODEL,
  STANDARD_CHAT_MODEL,
  FAST_PARSE_MODEL,
  VISION_MODEL
];

/**
 * 角色 → 默认对话模型映射。
 *   - owner（创始人）→ DeepSeek-R1 顶级推理
 *   - 其他 → V3.1 平衡型
 *
 * 这里没把 admin 也升级到 R1，是因为 admin 主要做配置 / 审批，
 * 不一定需要每次推理。如果以后想给 admin 也升级，改这里一行。
 */
export function pickChatModelForRole(roleKey?: string | null): ModelCatalogEntry {
  return roleKey === "owner" ? FOUNDER_CHAT_MODEL : STANDARD_CHAT_MODEL;
}

/**
 * 同一个模型在不同 provider / 不同 API 版本上的 id 别名。
 * 用于让 estimateCostCny() 能正确识别 SiliconFlow 转售版 / DeepSeek 官方版
 * / 已废弃的旧 id 都按当前对应的定价档计费。
 *
 * V4 上线后，旧的 deepseek-reasoner / deepseek-chat 被官方标记为「将废弃」，
 * 但保留兼容；这里把它们直接映到 V4 对应档（按官方说明，
 * deepseek-reasoner = v4-flash thinking 模式，deepseek-chat = v4-flash 非思考）。
 * 推理任务真正想要顶级质量请显式用 deepseek-v4-pro。
 */
const MODEL_ID_ALIASES: Record<string, string> = {
  // SiliconFlow 转售老型号 → 当前对应的 DeepSeek V4 档
  "deepseek-ai/DeepSeek-R1": "deepseek-v4-pro",
  "deepseek-ai/DeepSeek-V3.1": "deepseek-v4-flash",
  "deepseek-ai/DeepSeek-V3.2": "deepseek-v4-flash",
  "deepseek-ai/DeepSeek-V3.2-Exp": "deepseek-v4-flash",
  // DeepSeek 官方旧 id → V4
  "deepseek-reasoner": "deepseek-v4-flash",
  "deepseek-chat": "deepseek-v4-flash"
};

/**
 * 估算一次调用的实际成本（CNY）—— 在 API 拿到 usage.tokens 后调用。
 * 用于在前端给用户看「这次对话花了 ¥0.06」。
 */
export function estimateCostCny(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const canonicalId = MODEL_ID_ALIASES[modelId] ?? modelId;
  const model = ALL_MODELS.find((m) => m.id === canonicalId);
  if (!model) return 0;
  const inputCost = (inputTokens / 1_000_000) * model.inputPriceCnyPerMillion;
  const outputCost = (outputTokens / 1_000_000) * model.outputPriceCnyPerMillion;
  return Number((inputCost + outputCost).toFixed(4));
}

/**
 * 把 ¥ 数字格式化成人话 —— 小数点很多位时不要让用户看到 "¥0.0234"。
 *   < 0.01 → 「< ¥0.01」
 *   < 1    → 「¥0.06」
 *   >= 1   → 「¥1.23」
 */
export function formatCostCny(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return "¥0";
  if (cost < 0.01) return "< ¥0.01";
  if (cost < 1) return `¥${cost.toFixed(2)}`;
  return `¥${cost.toFixed(2)}`;
}
