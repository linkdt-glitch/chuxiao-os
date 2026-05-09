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
 * 创始人 / 老板专用 —— 当前最聪明的中文推理模型。
 *
 *   DeepSeek-R1 是 671B MoE 推理模型，与 OpenAI o1 同档；
 *   多步骤推理、复杂决策、财务分析、商业策略上明显比 V3 系列强。
 *   代价是输出贵 4×（推理 token 也按输出计价），但创始人调一次值。
 *
 *   DeepSeek 官方 API id = "deepseek-reasoner"
 *   SiliconFlow 转售 id  = "deepseek-ai/DeepSeek-R1"
 *   两个 id 都被 estimateCostCny() 识别为这一档定价。
 */
export const FOUNDER_CHAT_MODEL: ModelCatalogEntry = {
  id: "deepseek-reasoner",
  label: "DeepSeek-R1（深度思考）",
  tier: "founder",
  vendor: "DeepSeek · 671B MoE 推理",
  description:
    "顶级推理模型，与 OpenAI o1 同档。会先「想一会儿」再回答，多步骤推理、商业决策、复杂分析最强。",
  inputPriceCnyPerMillion: 4,
  outputPriceCnyPerMillion: 16,
  contextWindowK: 64,
  approxCostPerTurnCny: 0.06,
  recommendedFor: "创始人 / 老板 —— 战略决策、复杂问题分析、财报解读、合同审查"
};

/**
 * 全员日常对话 —— 性价比之王。
 *
 *   DeepSeek-V3.2-Exp 引入 sparse attention，输出价比 V3.1 又降了一半，
 *   质量保持顶级，是 2026 年国产中文模型里最划算的「中高端」。
 *
 *   DeepSeek 官方 API id = "deepseek-chat"
 *   SiliconFlow 转售 V3.1 id = "deepseek-ai/DeepSeek-V3.1"
 *   两个 id 都被 estimateCostCny() 识别为这一档定价。
 */
export const STANDARD_CHAT_MODEL: ModelCatalogEntry = {
  id: "deepseek-chat",
  label: "DeepSeek-V3.2",
  tier: "standard",
  vendor: "DeepSeek · 671B MoE",
  description:
    "稀疏注意力 + 164K 上下文，质量保持顶级，单价比 V3.1 又降一半。员工日常用绰绰有余。",
  inputPriceCnyPerMillion: 2,
  outputPriceCnyPerMillion: 3,
  contextWindowK: 164,
  approxCostPerTurnCny: 0.012,
  recommendedFor: "员工日常对话 —— 写文案、写邮件、答常识、整理思路"
};

/**
 * 极速短任务 —— 一句话记账、AI 解析、自动归类。
 *
 *   首字节 < 300ms，单次成本 < 1 分钱，绝不阻塞用户。
 *   这一档不要追求多聪明，要追求「快+稳」。
 */
export const FAST_PARSE_MODEL: ModelCatalogEntry = {
  id: "Qwen/Qwen2.5-7B-Instruct",
  label: "Qwen2.5-7B",
  tier: "fast",
  vendor: "通义千问 · 7B",
  description: "极速短任务，首字节 < 300ms，单次约 1 分钱。",
  inputPriceCnyPerMillion: 0.35,
  outputPriceCnyPerMillion: 0.35,
  contextWindowK: 32,
  approxCostPerTurnCny: 0.001,
  recommendedFor: "AI 记账解析、字段抽取、自动归类"
};

/**
 * 视觉理解 —— 拍照记账、票据 OCR、图片识别。
 *
 *   Qwen2.5-VL-7B 比 72B 快 5-10×，识别票据、商品、表格足够，
 *   单次成本极低，适合高频拍照场景。
 */
export const VISION_MODEL: ModelCatalogEntry = {
  id: "Qwen/Qwen2.5-VL-7B-Instruct",
  label: "Qwen2.5-VL-7B",
  tier: "vision",
  vendor: "通义千问 · 7B 多模态",
  description: "拍照识别票据 / 截图，比 72B 快 5-10×，单次约 5 厘钱。",
  inputPriceCnyPerMillion: 0.35,
  outputPriceCnyPerMillion: 0.35,
  contextWindowK: 32,
  approxCostPerTurnCny: 0.005,
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
 * 同一个模型在不同 provider 上的 id 别名。
 * 用于让 estimateCostCny() 能正确认出 SiliconFlow 转售版 / DeepSeek 官方版
 * 是同一档定价。
 */
const MODEL_ID_ALIASES: Record<string, string> = {
  "deepseek-ai/DeepSeek-R1": "deepseek-reasoner",
  "deepseek-ai/DeepSeek-V3.1": "deepseek-chat",
  "deepseek-ai/DeepSeek-V3.2": "deepseek-chat",
  "deepseek-ai/DeepSeek-V3.2-Exp": "deepseek-chat"
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
