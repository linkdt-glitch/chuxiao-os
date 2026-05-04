import { NextResponse } from "next/server";
import { isEmailAllowedForLogin } from "@/lib/auth/access";
import { ensureUserWorkspace } from "@/lib/auth/onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnvIssue } from "@/lib/supabase/env";
import { isDemoModeEnabled } from "@/lib/auth";
import { demoMembers, demoMemberPasswords } from "@/lib/data/demo";
import { cookies } from "next/headers";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** 11位纯数字 → 手机号 */
function isPhone(identifier: string) {
  return /^1[3-9]\d{9}$/.test(identifier);
}

/** 在 Supabase 中通过手机号查找邮箱 */
async function emailFromPhone(phone: string, supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>) {
  const { data } = await supabase
    .from("organization_members")
    .select("email")
    .eq("phone", phone)
    .maybeSingle();
  return data?.email ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const identifier = text(body.identifier || body.email).toLowerCase();
    const password = text(body.password);

    if (!identifier || !password) {
      return NextResponse.json({ error: "请输入邮箱 / 手机号和密码。" }, { status: 400 });
    }

    // ── Demo mode ──────────────────────────────────────────────
    if (isDemoModeEnabled()) {
      // Resolve phone → email
      let resolvedEmail = identifier;
      if (isPhone(identifier)) {
        const member = demoMembers.find((m) => m.phone === identifier);
        if (!member?.email) {
          return NextResponse.json({ error: "手机号未找到对应账号。" }, { status: 401 });
        }
        resolvedEmail = member.email;
      }

      // Find matching demo member
      const member = demoMembers.find((m) => m.email?.toLowerCase() === resolvedEmail);
      if (!member) {
        return NextResponse.json({ error: "邮箱 / 手机号不在成员列表中。" }, { status: 401 });
      }

      // Check password — support cookie-overridden passwords
      const jar = await cookies();
      const overrides: Record<string, string> = (() => {
        try { return JSON.parse(jar.get("demo_member_passwords")?.value ?? "{}"); } catch { return {}; }
      })();
      const expectedPw = overrides[member.id] ?? demoMemberPasswords[member.id];

      if (password !== expectedPw) {
        return NextResponse.json({ error: "密码错误，请重新输入。" }, { status: 401 });
      }

      return NextResponse.json({ message: "登录成功，正在进入工作台。", redirectTo: "/dashboard" });
    }

    // ── Production (Supabase) mode ─────────────────────────────
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: getSupabaseEnvIssue() ?? "当前未配置 Supabase 环境变量。" },
        { status: 500 }
      );
    }

    // Resolve phone → email via DB
    let email = identifier;
    if (isPhone(identifier)) {
      const found = await emailFromPhone(identifier, supabase);
      if (!found) {
        return NextResponse.json({ error: "手机号未找到对应账号。" }, { status: 401 });
      }
      email = found;
    }

    if (!(await isEmailAllowedForLogin(email))) {
      return NextResponse.json({ error: "这个邮箱暂未加入初晓 OS 的准入名单。" }, { status: 403 });
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
