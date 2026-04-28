import { NextResponse } from "next/server";
import { isEmailAllowedForLogin } from "@/lib/auth/access";
import { ensureUserWorkspace } from "@/lib/auth/onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnvIssue } from "@/lib/supabase/env";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = text(body.email).toLowerCase();
    const password = text(body.password);

    if (!email || !password) {
      return NextResponse.json({ error: "请输入邮箱和密码。" }, { status: 400 });
    }

    if (!(await isEmailAllowedForLogin(email))) {
      return NextResponse.json({ error: "这个邮箱暂未加入初晓 OS 的准入名单。" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: getSupabaseEnvIssue() ?? "当前未配置 Supabase 环境变量。" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (data.user) await ensureUserWorkspace(data.user);

    return NextResponse.json({ message: "登录成功，正在进入工作台。", redirectTo: "/dashboard" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "密码登录失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
