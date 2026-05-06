import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { logAIInvocation } from "@/lib/ai";
import { getDefaultModel, getModelById, IMAGE_MODELS } from "@/lib/ai/image-models";
import { requirePermission } from "@/lib/permissions";

const FAL_BASE_URL = "https://fal.run";

const VALID_SIZES = [
  "square_hd",
  "square",
  "portrait_4_3",
  "portrait_16_9",
  "landscape_4_3",
  "landscape_16_9"
] as const;
type FalImageSize = (typeof VALID_SIZES)[number];

type FalImageResponse = {
  images?: Array<{ url: string; width?: number; height?: number }>;
  detail?: string | Array<{ msg?: string }>;
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
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const rawSize = typeof body.image_size === "string" ? body.image_size : "square_hd";
    const imageSize: FalImageSize = (VALID_SIZES as readonly string[]).includes(rawSize)
      ? (rawSize as FalImageSize)
      : "square_hd";

    // Whitelist enforcement: client can only ask for models in our registry.
    const requestedModelId = typeof body.model === "string" ? body.model : undefined;
    const model =
      getModelById(requestedModelId) ??
      getModelById(process.env.FAL_AI_IMAGE_MODEL) ??
      getDefaultModel();
    modelLabelForLog = model.id;

    if (!prompt) {
      return NextResponse.json({ error: "请输入图片描述。" }, { status: 400 });
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: "描述文字不能超过 500 个字符。" }, { status: 400 });
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

    // ── Call fal.ai ──────────────────────────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
      const falPayload: Record<string, unknown> = {
        prompt,
        image_size: imageSize,
        num_images: 1,
        enable_safety_checker: true,
        sync_mode: true
      };
      if (model.inferenceSteps) {
        falPayload.num_inference_steps = model.inferenceSteps;
      }

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
            : `请求失败 (${response.status})`;

        // Server-side log (full), client gets generic.
        console.error("[image-gen] fal.ai error", { status: response.status, model: model.id, errorMsg });
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

      // Audit log success — cost_estimate uses our registry hint, not actual.
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
          { error: "图片生成超时（90s），请尝试使用更简短的描述或稍后重试。" },
          { status: 504 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    // Defensive: don't leak internal stack traces to the browser.
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
      tag: m.tag
    })),
    rateLimit: { perMinute: RATE_MAX_PER_WINDOW }
  });
}
