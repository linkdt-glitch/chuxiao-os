/**
 * fal.ai image model registry — server-enforced whitelist.
 *
 * Two API shapes:
 *  - text2img : prompt + image_size, no input photos (Flux family)
 *  - img2img  : prompt + image_urls[] + aspect_ratio (Nano Banana family)
 *
 * The API route picks the right payload shape per model so a misconfigured
 * registry can't burn credits on the wrong endpoint.
 *
 * Prices below are approximate (USD → CNY at ~7.2). fal.ai bills are
 * authoritative — check https://fal.ai/dashboard/usage for actuals.
 */

export type ImageModelSpeed = "fast" | "medium" | "slow";

export type ImageApiShape = "text2img" | "img2img";

export type ImageModel = {
  /** fal.ai endpoint path under https://fal.run/ */
  id: string;
  /** Short Chinese display name. */
  label: string;
  /** Long-form Chinese description. */
  description: string;
  /** Approximate per-image price in CNY (UI hint). */
  pricePerImageCny: number;
  /** Subjective speed bucket. */
  speed: ImageModelSpeed;
  /** Approximate seconds for a 1024-class output. */
  approxSeconds: number;
  /** Recommended num_inference_steps; some endpoints ignore this. */
  inferenceSteps?: number;
  /** True for the model exposed as the global default. */
  isDefault?: boolean;
  /** Hint badge shown on cards. */
  tag?: string;
  /** Which fal API contract this endpoint speaks. */
  apiShape: ImageApiShape;
  /** True if endpoint can accept reference photos for image editing. */
  acceptsReferenceImages?: boolean;
};

export const IMAGE_MODELS: ImageModel[] = [
  // ── Image-to-Image · 2026 旗舰 7 大（按推荐度排序） ──────────────
  {
    id: "fal-ai/nano-banana-pro/edit",
    label: "① Nano Banana Pro",
    description: "Google Gemini 3 Pro Image · 顶级真实感 + 最多 14 张参考图。产品保留 + 风格迁移效果最强。",
    pricePerImageCny: 1.08,
    speed: "slow",
    approxSeconds: 20,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    isDefault: true,
    tag: "顶配 · 商业级"
  },
  {
    id: "openai/gpt-image-2/edit",
    label: "② OpenAI GPT Image 2 Edit",
    description: "OpenAI 最新一代图像编辑（ChatGPT-5 时代旗舰）· 提示遵循极强，文字渲染最准，可多张参考图。",
    pricePerImageCny: 1.52,
    speed: "slow",
    approxSeconds: 25,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "OpenAI · GPT 5"
  },
  {
    id: "fal-ai/flux-pro/kontext/max",
    label: "③ Flux Kontext Max",
    description: "Black Forest Labs 旗舰编辑模型。提示词遵循 + 字符一致性最强，多轮编辑稳。",
    pricePerImageCny: 0.79,
    speed: "medium",
    approxSeconds: 15,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "BFL · 高端"
  },
  {
    id: "fal-ai/nano-banana-2/edit",
    label: "④ Nano Banana 2",
    description: "Gemini 3.1 Flash Image · 构图与材质保真升级，比初代质量高一档，速度还行。",
    pricePerImageCny: 0.58,
    speed: "medium",
    approxSeconds: 10,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "Gemini · 升级"
  },
  {
    id: "fal-ai/bytedance/seedream/v4.5/edit",
    label: "⑤ Seedream v4.5",
    description: "ByteDance 旗舰 · 一架构同时做生成+编辑 · 最多 10 张参考图，2K 输出，性价比之王。",
    pricePerImageCny: 0.29,
    speed: "medium",
    approxSeconds: 12,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "字节 · 多图王"
  },
  {
    id: "fal-ai/flux-pro/kontext",
    label: "⑥ Flux Kontext Pro",
    description: "Flux Kontext 标准版 · 12B 参数多模态流式 Transformer，本地+全局编辑统一。",
    pricePerImageCny: 0.29,
    speed: "medium",
    approxSeconds: 10,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "BFL · 性价比"
  },
  {
    id: "fal-ai/nano-banana/edit",
    label: "⑦ Nano Banana",
    description: "Gemini 2.5 Flash Image · Nano Banana 初代，最便宜的 Gemini 图生图，质量已够商用。",
    pricePerImageCny: 0.28,
    speed: "fast",
    approxSeconds: 6,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "Gemini · 入门"
  },

  // ── Text-to-Image (OpenAI + Flux + Recraft + Ideogram) ──────────
  {
    id: "openai/gpt-image-2",
    label: "OpenAI GPT Image 2",
    description: "OpenAI ChatGPT-5 时代旗舰文生图 · 提示遵循 + 文字渲染业内最强，复杂海报首选。",
    pricePerImageCny: 1.52,
    speed: "slow",
    approxSeconds: 22,
    apiShape: "text2img",
    tag: "OpenAI · GPT 5"
  },
  {
    id: "fal-ai/flux-pro/v1.1-ultra",
    label: "Flux Pro Ultra",
    description: "顶级真实感、2K 级输出。无原图时纯文字生成主图、产品特写。",
    pricePerImageCny: 0.43,
    speed: "slow",
    approxSeconds: 20,
    apiShape: "text2img",
    tag: "文生图 · 顶配"
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    label: "Flux Pro 1.1",
    description: "高画质 + 提示理解准确，文生图附图、生活方式、应用场景。",
    pricePerImageCny: 0.29,
    speed: "medium",
    approxSeconds: 15,
    apiShape: "text2img",
    tag: "文生图 · 高质"
  },
  {
    id: "fal-ai/recraft-v3",
    label: "Recraft v3",
    description: "矢量风、扁平插画、品牌图标。A+ 比较卡、icon 模块的最佳选择。",
    pricePerImageCny: 0.29,
    speed: "medium",
    approxSeconds: 15,
    apiShape: "text2img",
    tag: "文生图 · 插画"
  },
  {
    id: "fal-ai/ideogram/v2",
    label: "Ideogram v2",
    description: "**文字渲染最强**：A+ Hero Banner 写 slogan、卖点文字时用它。",
    pricePerImageCny: 0.58,
    speed: "slow",
    approxSeconds: 20,
    apiShape: "text2img",
    tag: "文生图 · 带文字"
  }
];

const MODEL_BY_ID = new Map(IMAGE_MODELS.map((model) => [model.id, model]));

export function getModelById(id: string | undefined | null): ImageModel | undefined {
  if (!id) return undefined;
  return MODEL_BY_ID.get(id);
}

export function getDefaultModel(): ImageModel {
  return IMAGE_MODELS.find((model) => model.isDefault) ?? IMAGE_MODELS[0];
}

export function getModelsByShape(shape: ImageApiShape): ImageModel[] {
  return IMAGE_MODELS.filter((m) => m.apiShape === shape);
}

export function formatPriceCny(value: number) {
  if (value < 0.1) return `¥${value.toFixed(3)}`;
  return `¥${value.toFixed(2)}`;
}
