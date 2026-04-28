import { NextResponse } from "next/server";
import { isEmailAllowedForLogin } from "@/lib/auth/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = text(body.email).toLowerCase();
    const fullName = text(body.full_name);
    const organizationName = text(body.organization_name);

    if (!email) {
      return NextResponse.json({ error: "请输入邮箱。" }, { status: 400 });
    }

    const allowed = await isEmailAllowedForLogin(email);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "这个邮箱暂未加入初晓 OS 的准入名单。请先让管理员把邮箱加入 AUTH_ALLOWED_EMAILS 或允许域名。"
        },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ message: "当前未配置 Supabase 环境变量，应用会使用内置 demo 数据运行。" });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin.replace(/\/+$/, "")}/auth/callback`,
        data: {
          full_name: fullName,
          organization_name: organizationName
        }
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "登录链接已发送，请检查邮箱。" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "登录请求失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
