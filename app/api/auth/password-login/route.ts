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

/**
 * 输入是否"长得像手机号" —— 没有 @ 且去掉空格 / 短横线 / +86 后是纯数字。
 * 用来决定要不要走"手机号→查 DB 拿邮箱"分支。
 * 不做严格 11 位校验，让 normalizePhone 之后再判定，
 * 这样 "+86 138 0013 8000" 这种带格式输入也能进入手机号匹配。
 */
function looksLikePhone(identifier: string) {
  if (identifier.includes("@")) return false;
  const digits = identifier.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * 归一化手机号 —— 跟 organization/actions.ts 里的 normalizePhone 保持一致：
 *   "138 0013 8000"      → "13800138000"
 *   "138-0013-8000"      → "13800138000"
 *   "+86 138 0013 8000"  → "13800138000"
 *   "0086 138 0013 8000" → "13800138000"
 */
function normalizePhone(raw: string): string {
  if (!raw) return "";
  const digitsOnly = raw.replace(/[\s\-()+]/g, "");
  const noCC = digitsOnly.replace(/^0086/, "").replace(/^86(?=1[3-9]\d{9}$)/, "");
  return noCC;
}

/** 严格校验：11 位中国大陆手机号 */
function isValidChinaMobile(phone: string) {
  return /^1[3-9]\d{9}$/.test(phone);
}

/** 在 Supabase 中通过手机号查找邮箱（限定在 active / invited 成员，停用账号查不出来） */
async function emailFromPhone(phone: string, supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>) {
  const { data } = await supabase
    .from("organization_members")
    .select("email")
    .eq("phone", phone)
    .in("status", ["active", "invited"])
    .maybeSingle();
  return data?.email ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const identifierRaw = text(body.identifier || body.email);
    const identifier = identifierRaw.toLowerCase();
    const password = text(body.password);

    if (!identifier || !password) {
      return NextResponse.json({ error: "请输入邮箱 / 手机号和密码。" }, { status: 400 });
    }

    // 提前判断"是不是手机号" + 归一化。toLowerCase 对纯数字 / 空格 / + 号不影响；
    // 但保留 identifierRaw 备用 —— 万一以后要支持邮箱大小写敏感场景。
    const treatAsPhone = looksLikePhone(identifier);
    const normalizedPhone = treatAsPhone ? normalizePhone(identifier) : "";
    if (treatAsPhone && !isValidChinaMobile(normalizedPhone)) {
      return NextResponse.json(
        { error: "手机号格式不正确 —— 请填 11 位的中国大陆手机号（138 / 139 / 188 等）。" },
        { status: 400 }
      );
    }

    // ── Demo mode ──────────────────────────────────────────────
    if (isDemoModeEnabled()) {
      // Resolve phone → email
      let resolvedEmail = identifier;
      if (treatAsPhone) {
        const member = demoMembers.find((m) => m.phone === normalizedPhone);
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
    if (treatAsPhone) {
      const found = await emailFromPhone(normalizedPhone, supabase);
      if (!found) {
        return NextResponse.json(
          { error: "手机号未找到对应账号 —— 请检查号码，或联系管理员先在「组织 → 成员」补上手机号。" },
          { status: 401 }
        );
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
