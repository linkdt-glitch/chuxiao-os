import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { compareDualModels } from "@/lib/ai/openrouter";

/**
 * 双模型对比 API —— 创始人专用。
 *
 * Body: { prompt: string, systemPrompt?: string }
 * 返回: 两个模型各自的结果 + 总成本
 *
 * 鉴权：必须是 owner / admin，其他角色 403。
 */
export async function POST(request: NextRequest) {
  // 鉴权
  const member = await getCurrentMember();
  const roleObj: unknown = (member as { role?: unknown }).role;
  let roleKey = "";
  if (Array.isArray(roleObj)) {
    const first = roleObj[0] as { key?: string } | undefined;
    roleKey = first?.key ?? "";
  } else if (roleObj && typeof roleObj === "object" && "key" in roleObj) {
    roleKey = (roleObj as { key?: string }).key ?? "";
  }

  if (roleKey !== "owner" && roleKey !== "admin") {
    return NextResponse.json(
      { error: "双模型对比仅创始人 / 管理员可用。" },
      { status: 403 }
    );
  }

  // 用 default 初始化避免 TS 严格模式 "used before assigned" 警告
  let body: { prompt?: string; systemPrompt?: string } = {};
  try {
    body = (await request.json()) as { prompt?: string; systemPrompt?: string };
  } catch {
    return NextResponse.json({ error: "请求体格式错误。" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "请输入问题。" }, { status: 400 });
  }
  if (prompt.length > 20_000) {
    return NextResponse.json({ error: "问题太长（> 20000 字符）。" }, { status: 400 });
  }

  // 并行调用 Claude + GPT
  const result = await compareDualModels({
    prompt,
    systemPrompt: body.systemPrompt
  });

  return NextResponse.json(result);
}
