import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { invokeAI } from "@/lib/ai";
import { requirePermission } from "@/lib/permissions";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录后再测试 AI Provider。" }, { status: 401 });
    }

    await requirePermission("prompt.test");

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const prompt =
      text(body.prompt) ||
      "请用 5 条要点说明：初晓 OS 如何帮助小公司管理组织、审批、文件、AI Agent 和经营执行。";

    const result = await invokeAI({ module: "ai_settings", prompt });

    return NextResponse.json({
      message: "AI Provider 测试完成。",
      provider: {
        label: result.provider.label,
        provider_name: result.provider.provider_name,
        model_name: result.provider.model_name
      },
      invocationLogId: result.invocationLogId,
      text: result.text
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI Provider 测试失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
