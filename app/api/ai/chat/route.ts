import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { invokeAI } from "@/lib/ai";
import { requirePermission } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const RATE_LIMIT_PER_MINUTE = 10;

type ChatMessage = {
  role?: unknown;
  content?: unknown;
};

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: ChatMessage) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: typeof item.content === "string" ? item.content.trim() : ""
    }))
    .filter((item) => item.content)
    .slice(-10);
}

function buildPrompt(messages: Array<{ role: string; content: string }>) {
  const transcript = messages
    .map((message) => `${message.role === "assistant" ? "AI" : "用户"}：${message.content}`)
    .join("\n\n");

  return `你是初晓 OS 系统里的企业 AI 助手，服务于小公司内部经营和管理。
请遵守：
1. 用中文回答。
2. 先给结论，再给步骤。
3. 涉及财务、权限、删除、付款、合同、对外发送等高风险动作时，只能给建议，必须提醒需要人类确认或审批。
4. 回答要简洁、可执行，适合企业内部系统使用。

最近对话：
${transcript}`;
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "请先登录后再使用 AI 助手。" }, { status: 401 });
    }

    await requirePermission("ai_workforce.view");

    // 速率限制：每用户每分钟最多 RATE_LIMIT_PER_MINUTE 次
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
      const { count } = await supabase
        .from("ai_invocation_logs")
        .select("id", { count: "exact", head: true })
        .eq("invoked_by", user.id)
        .gte("created_at", oneMinuteAgo);
      if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
        return NextResponse.json({ error: "调用过于频繁，请稍后再试。" }, { status: 429 });
      }
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const messages = normalizeMessages(body.messages);

    if (!messages.length || messages[messages.length - 1]?.role !== "user") {
      return NextResponse.json({ error: "请输入要咨询的问题。" }, { status: 400 });
    }

    const result = await invokeAI({ module: "ai_chat", prompt: buildPrompt(messages) });

    return NextResponse.json({
      provider: { label: result.provider.label },
      invocationLogId: result.invocationLogId,
      message: {
        role: "assistant",
        content: result.text || "AI 没有返回内容，请稍后重试。"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 助手调用失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
