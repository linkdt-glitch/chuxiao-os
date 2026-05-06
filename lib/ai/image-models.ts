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

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: "fal-ai/flux/schnell",
    label: "Flux Schnell",
    description: "极速出图，最便宜，适合草稿、批量、想法验证。",
    pricePerImageCny: 0.022,
    speed: "fast",
    approxSeconds: 3,
    inferenceSteps: 4,
    isDefault: true,
    tag: "极速"
  },
  {
    id: "fal-ai/flux/dev",
    label: "Flux Dev",
    description: "质量与速度平衡，构图细节优于 Schnell，多数日常场景首选。",
    pricePerImageCny: 0.18,
    speed: "medium",
    approxSeconds: 10,
    inferenceSteps: 28,
    tag: "性价比"
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    label: "Flux Pro 1.1",
    description: "fal 自家高画质模型，更准确的提示理解、更稳的人脸与光影。",
    pricePerImageCny: 0.29,
    speed: "medium",
    approxSeconds: 15,
    tag: "高质量"
  },
  {
    id: "fal-ai/flux-pro/v1.1-ultra",
    label: "Flux Pro Ultra",
    description: "Flux Pro 顶配，2K 级别输出，主图、海报、对外发布建议用它。",
    pricePerImageCny: 0.43,
    speed: "slow",
    approxSeconds: 20,
    tag: "顶配"
  },
  {
    id: "fal-ai/recraft-v3",
    label: "Recraft v3",
    description: "矢量风、扁平插画、品牌图标和 UI 配图的最佳选择。",
    pricePerImageCny: 0.29,
    speed: "medium",
    approxSeconds: 15,
    tag: "插画"
  },
  {
    id: "fal-ai/ideogram/v2",
    label: "Ideogram v2",
    description: "**文字渲染最强**：海报、Slogan、Banner 中要写字时用它。",
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
