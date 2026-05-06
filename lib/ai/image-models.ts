/**
 * fal.ai image-generation model registry.
 *
 * Acts as a server-enforced whitelist: the API route refuses any model id
 * that isn't listed here, so a malicious client can't ask the server to
 * burn API credits on an arbitrary high-cost endpoint.
 *
 * Prices are *approximate* (USD → CNY at ~7.2) and meant for in-product
 * pre-flight estimates only. Authoritative billing is what fal.ai charges.
 */

export type ImageModelSpeed = "fast" | "medium" | "slow";

export type ImageModel = {
  /** fal.ai endpoint path under https://fal.run/ */
  id: string;
  /** Short Chinese display name for the model picker. */
  label: string;
  /** Long-form Chinese description of what it's good at. */
  description: string;
  /** Approximate per-image price in CNY (for UI hint only). */
  pricePerImageCny: number;
  /** Subjective speed bucket. */
  speed: ImageModelSpeed;
  /** Approximate seconds for a square 1024×1024. */
  approxSeconds: number;
  /** Recommended num_inference_steps; some endpoints ignore this. */
  inferenceSteps?: number;
  /** True for the model exposed as the global default. */
  isDefault?: boolean;
  /** Hint badge: "极速" | "性价比" | "高质量" | "插画" | "文字" */
  tag?: string;
};

/**
 * 4 旗舰模型，针对亚马逊卖家可用性挑选：
 *  - 主图/附图直出建议 Flux Pro Ultra（最高真实感）
 *  - 中等任务 Flux Pro 1.1（性价比）
 *  - A+ 比较图、扁平插画、icon 用 Recraft v3
 *  - 横幅需写文字、Slogan 用 Ideogram v2
 * 砍掉 Flux Schnell / Flux Dev（质量不达 Amazon 商用线）。
 */
export const IMAGE_MODELS: ImageModel[] = [
  {
    id: "fal-ai/flux-pro/v1.1-ultra",
    label: "Flux Pro Ultra",
    description: "顶级真实感，2K 级输出。亚马逊主图、产品特写、对外发布首选。",
    pricePerImageCny: 0.43,
    speed: "slow",
    approxSeconds: 20,
    isDefault: true,
    tag: "顶配 · 主图"
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    label: "Flux Pro 1.1",
    description: "高画质 + 提示理解准确，适合附图、生活方式、应用场景。",
    pricePerImageCny: 0.29,
    speed: "medium",
    approxSeconds: 15,
    tag: "高质量"
  },
  {
    id: "fal-ai/recraft-v3",
    label: "Recraft v3",
    description: "矢量风、扁平插画、品牌图标。A+ 比较卡 / icon 模块的最佳选择。",
    pricePerImageCny: 0.29,
    speed: "medium",
    approxSeconds: 15,
    tag: "插画/Icon"
  },
  {
    id: "fal-ai/ideogram/v2",
    label: "Ideogram v2",
    description: "**文字渲染最强**：A+ Hero Banner 要写 slogan、卖点文字时用它。",
    pricePerImageCny: 0.58,
    speed: "slow",
    approxSeconds: 20,
    tag: "带文字"
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

export function formatPriceCny(value: number) {
  if (value < 0.1) return `¥${value.toFixed(3)}`;
  return `¥${value.toFixed(2)}`;
}
