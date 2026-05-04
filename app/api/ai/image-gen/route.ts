import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

const FAL_BASE_URL = "https://fal.run";
const DEFAULT_MODEL = "fal-ai/flux/schnell";

const VALID_SIZES = ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"] as const;
type FalImageSize = (typeof VALID_SIZES)[number];

type FalImageResponse = {
  images?: Array<{ url: string; width?: number; height?: number }>;
  detail?: string | Array<{ msg?: string }>;
};

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录后再使用图片生成功能。" }, { status: 401 });
    }

    await requirePermission("ai_workforce.view");

    const apiKey = process.env.FAL_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "图片生成服务未配置，请在环境变量中设置 FAL_AI_API_KEY。" },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const rawSize = typeof body.image_size === "string" ? body.image_size : "square_hd";
    const imageSize: FalImageSize = (VALID_SIZES as readonly string[]).includes(rawSize)
      ? (rawSize as FalImageSize)
      : "square_hd";

    if (!prompt) {
      return NextResponse.json({ error: "请输入图片描述。" }, { status: 400 });
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: "描述文字不能超过 500 个字符。" }, { status: 400 });
    }

    const model = process.env.FAL_AI_IMAGE_MODEL ?? DEFAULT_MODEL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
      const response = await fetch(`${FAL_BASE_URL}/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          image_size: imageSize,
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
          sync_mode: true
        }),
        signal: controller.signal
      });

      const payload = (await response.json().catch(() => ({}))) as FalImageResponse;

      if (!response.ok) {
        const detail = payload.detail;
        const errorMsg = Array.isArray(detail)
          ? (detail[0]?.msg ?? `请求失败 (${response.status})`)
          : typeof detail === "string"
            ? detail
            : `请求失败 (${response.status})`;
        return NextResponse.json({ error: `fal.ai 调用失败：${errorMsg}` }, { status: response.status });
      }

      const imageUrl = payload.images?.[0]?.url;
      if (!imageUrl) {
        return NextResponse.json(
          { error: "图片生成服务未返回结果，请稍后重试。" },
          { status: 500 }
        );
      }

      return NextResponse.json({ url: imageUrl });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
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
    const message = error instanceof Error ? error.message : "图片生成服务出错。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
