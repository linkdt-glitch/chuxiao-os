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
  // ── Image-to-Image (Nano Banana family — Google Gemini Image) ────
  {
    id: "fal-ai/nano-banana/edit",
    label: "Nano Banana Edit",
    description: "Google Gemini 图片编辑：上传产品照 + 描述 → 改背景 / 换风格 / 加场景，最便宜的图生图。",
    pricePerImageCny: 0.28,
    speed: "fast",
    approxSeconds: 6,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "图生图 · 性价比"
  },
  {
    id: "fal-ai/nano-banana-2/edit",
    label: "Nano Banana 2 Edit",
    description: "Gemini 3.1 Flash Image 编辑版，构图与材质保真比初代 Nano Banana 好。",
    pricePerImageCny: 0.58,
    speed: "medium",
    approxSeconds: 10,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "图生图 · 升级"
  },
  {
    id: "fal-ai/nano-banana-pro/edit",
    label: "Nano Banana Pro Edit",
    description: "Gemini 3 Pro Image，支持多张参考图、最多 14 张组合，主图级真实感的图生图首选。",
    pricePerImageCny: 1.08,
    speed: "slow",
    approxSeconds: 20,
    apiShape: "img2img",
    acceptsReferenceImages: true,
    tag: "图生图 · 顶配"
  },

  // ── Text-to-Image (Flux + Recraft + Ideogram) ────────────────────
  {
    id: "fal-ai/flux-pro/v1.1-ultra",
    label: "Flux Pro Ultra",
    description: "顶级真实感、2K 级输出。无原图时纯文字生成主图、产品特写。",
    pricePerImageCny: 0.43,
    speed: "slow",
    approxSeconds: 20,
    apiShape: "text2img",
    isDefault: true,
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
