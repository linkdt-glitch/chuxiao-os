import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { logAIInvocation } from "@/lib/ai";
import { getDefaultModel, getModelById, IMAGE_MODELS } from "@/lib/ai/image-models";
import { requirePermission } from "@/lib/permissions";

const FAL_BASE_URL = "https://fal.run";

// ── text2img sizes ──────────────────────────────────────────────────
const VALID_SIZES = [
  "square_hd",
  "square",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9"
] as const;
type FalImageSize = (typeof VALID_SIZES)[number];

// ── img2img aspect ratios (Nano Banana edit) ────────────────────────
const VALID_ASPECT_RATIOS = [
  "21:9",
  "16:9",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16"
] as const;
type FalAspectRatio = (typeof VALID_ASPECT_RATIOS)[number];

// ── Reference image upload constraints ──────────────────────────────
const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_BYTES = 6 * 1024 * 1024; // 6MB per image (base64 — already compressed client-side)
const ALLOWED_DATA_URI_PREFIX = /^data:image\/(jpeg|jpg|png|webp);base64,/;

type FalImageResponse = {
  images?: Array<{ url: string; width?: number; height?: number; content_type?: string }>;
  detail?: string | Array<{ msg?: string }>;
  error?: string;
};

// ── Per-user rate limit (in-memory; OK for single-instance Render starter) ──
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 10;
const _rateBucket = new Map<string, number[]>();

function isRateLimited(userId: string): { limited: true; retryAfter: number } | { limited: false } {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const stamps = (_rateBucket.get(userId) ?? []).filter((t) => t > cutoff);
  if (stamps.length >= RATE_MAX_PER_WINDOW) {
    const retryAfter = Math.ceil((stamps[0] + RATE_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter };
  }
  stamps.push(now);
  _rateBucket.set(userId, stamps);
  return { limited: false };
}

function isValidReferenceImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // accept either http(s) URL or data URI
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.length < 2048; // sanity cap on URL length
  }
  if (!ALLOWED_DATA_URI_PREFIX.test(value)) return false;
  // estimate decoded byte size: base64 length × 3/4
  const base64Part = value.split(",", 2)[1] ?? "";
  const approxBytes = (base64Part.length * 3) / 4;
  return approxBytes <= MAX_REFERENCE_BYTES;
}

export async function POST(request: Request) {
  let modelLabelForLog = "fal-ai/unknown";
  let promptPreview = "";

  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录后再使用图片生成功能。" }, { status: 401 });
    }

    await requirePermission("ai_workforce.view");

    const apiKey = process.env.FAL_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "图片生成服务未配置：请在 Render 控制台为 chuxiao-os 服务添加环境变量 FAL_AI_API_KEY。"
        },
        { status: 503 }
      );
    }

    // ── Parse + validate input ───────────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // Whitelist: client can only ask for models in our registry.
    const requestedModelId = typeof body.model === "string" ? body.model : undefined;
    const model =
      getModelById(requestedModelId) ??
      getModelById(process.env.FAL_AI_IMAGE_MODEL) ??
      getDefaultModel();
    modelLabelForLog = model.id;

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "请输入图片描述。" }, { status: 400 });
    }
    if (prompt.length > 1500) {
      return NextResponse.json({ error: "描述文字不能超过 1500 字符。" }, { status: 400 });
    }
    promptPreview = prompt.slice(0, 200);

    // ── Per-user rate limit (10 / minute) ────────────────────────────
    const rate = isRateLimited(user.id);
    if (rate.limited) {
      return NextResponse.json(
        { error: `生成频率过快，请 ${rate.retryAfter} 秒后再试。每分钟最多 ${RATE_MAX_PER_WINDOW} 张。` },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } }
      );
    }

    // ── Build payload by API shape ───────────────────────────────────
    let falPayload: Record<string, unknown>;

    // OpenAI's GPT Image 2 family uses `image_size + quality` instead of
    // `aspect_ratio`. Map our 1:1/16:9/etc to the matching image_size enum.
    const isOpenAIGPT = model.id.startsWith("openai/gpt-image-");
    const aspectToImageSize: Record<string, FalImageSize> = {
      "1:1": "square_hd",
      "4:3": "landscape_4_3",
      "3:4": "portrait_4_3",
      "16:9": "landscape_16_9",
      "9:16": "portrait_16_9"
    };

    if (model.apiShape === "img2img") {
      // image-to-image: needs image_urls + aspect_ratio (or image_size for OpenAI)
      const rawImages = Array.isArray(body.image_urls) ? body.image_urls : [];
      if (rawImages.length === 0) {
        return NextResponse.json(
          { error: "图生图模型需要至少上传 1 张参考图。" },
          { status: 400 }
        );
      }
      if (rawImages.length > MAX_REFERENCE_IMAGES) {
        return NextResponse.json(
          { error: `最多上传 ${MAX_REFERENCE_IMAGES} 张参考图。` },
          { status: 400 }
        );
      }
      for (const img of rawImages) {
        if (!isValidReferenceImage(img)) {
          return NextResponse.json(
            { error: "参考图格式不合法或超出 6MB 限制（支持 jpeg/png/webp）。" },
            { status: 400 }
          );
        }
      }

      const rawAspect = typeof body.aspect_ratio === "string" ? body.aspect_ratio : "1:1";
      const aspectRatio: FalAspectRatio = (VALID_ASPECT_RATIOS as readonly string[]).includes(rawAspect)
        ? (rawAspect as FalAspectRatio)
        : "1:1";

      if (isOpenAIGPT) {
        // GPT Image 2 edit: image_size + quality
        const rawSize = typeof body.image_size === "string" ? body.image_size : "";
        const imageSize: FalImageSize =
          (VALID_SIZES as readonly string[]).includes(rawSize)
            ? (rawSize as FalImageSize)
            : aspectToImageSize[aspectRatio] ?? "square_hd";
        falPayload = {
          prompt,
          image_urls: rawImages,
          image_size: imageSize,
          quality: "high",
          num_images: 1,
          output_format: "jpeg",
          sync_mode: true
        };
      } else {
        falPayload = {
          prompt,
          image_urls: rawImages,
          aspect_ratio: aspectRatio,
          num_images: 1,
          output_format: "jpeg",
          sync_mode: true
        };
      }
    } else {
      // text-to-image: needs image_size + maybe num_inference_steps / quality
      const rawSize = typeof body.image_size === "string" ? body.image_size : "square_hd";
      const imageSize: FalImageSize = (VALID_SIZES as readonly string[]).includes(rawSize)
        ? (rawSize as FalImageSize)
        : "square_hd";

      falPayload = {
        prompt,
        image_size: imageSize,
        num_images: 1,
        sync_mode: true
      };

      if (isOpenAIGPT) {
        // GPT Image 2 text2img: quality required to lock per-image price
        falPayload.quality = "high";
        falPayload.output_format = "jpeg";
      } else {
        // Flux/Recraft/Ideogram families
        falPayload.enable_safety_checker = true;
        if (model.inferenceSteps) {
          falPayload.num_inference_steps = model.inferenceSteps;
        }
      }
    }

    // ── Call fal.ai ──────────────────────────────────────────────────
    const controller = new AbortController();
    // image-edit can take longer with multiple references
    const timeoutMs = model.apiShape === "img2img" ? 120_000 : 90_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${FAL_BASE_URL}/${model.id}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(falPayload),
        signal: controller.signal
      });

      const payload = (await response.json().catch(() => ({}))) as FalImageResponse;

      if (!response.ok) {
        const detail = payload.detail;
        const errorMsg = Array.isArray(detail)
          ? detail[0]?.msg ?? `请求失败 (${response.status})`
          : typeof detail === "string"
            ? detail
            : payload.error ?? `请求失败 (${response.status})`;

        console.error("[image-gen] fal.ai error", {
          status: response.status,
          model: model.id,
          shape: model.apiShape,
          errorMsg
        });
        await logAIInvocation({
          module: "ai_workforce.image_gen",
          prompt_preview: `${model.label}: ${promptPreview}`,
          status: "failed",
          error_message: `fal:${response.status}`
        }).catch(() => {});

        return NextResponse.json(
          { error: `图片生成失败：${errorMsg}` },
          { status: response.status }
        );
      }

      const imageUrl = payload.images?.[0]?.url;
      if (!imageUrl) {
        await logAIInvocation({
          module: "ai_workforce.image_gen",
          prompt_preview: `${model.label}: ${promptPreview}`,
          status: "failed",
          error_message: "no_image_returned"
        }).catch(() => {});
        return NextResponse.json(
          { error: "图片生成服务未返回结果，请稍后重试。" },
          { status: 500 }
        );
      }

      await logAIInvocation({
        module: "ai_workforce.image_gen",
        prompt_preview: `${model.label}: ${promptPreview}`,
        cost_estimate: model.pricePerImageCny,
        status: "success"
      }).catch(() => {});

      return NextResponse.json({
        url: imageUrl,
        model_id: model.id,
        model_label: model.label,
        cost_estimate_cny: model.pricePerImageCny
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        await logAIInvocation({
          module: "ai_workforce.image_gen",
          prompt_preview: `${modelLabelForLog}: ${promptPreview}`,
          status: "failed",
          error_message: "timeout"
        }).catch(() => {});
        return NextResponse.json(
          { error: `图片生成超时（${Math.round(timeoutMs / 1000)}s），请稍后重试或换轻量模型。` },
          { status: 504 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[image-gen] unexpected error", error);
    return NextResponse.json({ error: "图片生成服务出错，请稍后重试。" }, { status: 500 });
  }
}

/**
 * GET — return the model registry so the client UI can render the picker
 * without having to ship the same list twice. Public to logged-in users
 * (no key/secret in the response).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }
  return NextResponse.json({
    models: IMAGE_MODELS.map((m) => ({
      id: m.id,
      label: m.label,
      description: m.description,
      pricePerImageCny: m.pricePerImageCny,
      speed: m.speed,
      approxSeconds: m.approxSeconds,
      isDefault: Boolean(m.isDefault),
      tag: m.tag,
      apiShape: m.apiShape,
      acceptsReferenceImages: Boolean(m.acceptsReferenceImages)
    })),
    rateLimit: { perMinute: RATE_MAX_PER_WINDOW },
    referenceImage: {
      maxCount: MAX_REFERENCE_IMAGES,
      maxBytes: MAX_REFERENCE_BYTES,
      mimes: ["image/jpeg", "image/png", "image/webp"]
    }
  });
}

// Larger body needed for base64-uploaded reference photos.
export const runtime = "nodejs";
export const maxDuration = 120;
