import { NextResponse } from "next/server";
import { ensureUserWorkspace } from "@/lib/auth/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnvIssue } from "@/lib/supabase/env";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const configuredEmail = text(process.env.BOOTSTRAP_OWNER_EMAIL).toLowerCase();
    const configuredPassword = text(process.env.BOOTSTRAP_OWNER_PASSWORD);
    const configuredName = text(process.env.BOOTSTRAP_OWNER_NAME) || "Owner";
    const configuredOrg = text(process.env.BOOTSTRAP_ORGANIZATION_NAME) || "启明时刻 AI 公司";

    if (!configuredEmail || configuredPassword.length < 8) {
      return NextResponse.json(
        { error: "请先在 Render 配置 BOOTSTRAP_OWNER_EMAIL 和至少 8 位的 BOOTSTRAP_OWNER_PASSWORD。" },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = text(body.email).toLowerCase();
    const password = text(body.password);

    if (email !== configuredEmail || password !== configuredPassword) {
      return NextResponse.json({ error: "邮箱或首次管理员密码与 Render 配置不一致。" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();
    if (!admin || !supabase) {
      return NextResponse.json(
        { error: getSupabaseEnvIssue({ requireServiceRole: true }) ?? "当前未配置 Supabase Admin 环境变量。" },
        { status: 500 }
      );
    }

    let user = null;
    const created = await admin.auth.admin.createUser({
      email: configuredEmail,
      password: configuredPassword,
      email_confirm: true,
      user_metadata: {
        full_name: configuredName,
        organization_name: configuredOrg
      }
    });

    if (created.error) {
      const listed = await admin.auth.admin.listUsers();
      user = listed.data.users.find((item) => item.email?.toLowerCase() === configuredEmail) ?? null;
      if (!user) {
        return NextResponse.json({ error: created.error.message }, { status: 400 });
      }
      const updated = await admin.auth.admin.updateUserById(user.id, {
        password: configuredPassword,
        email_confirm: true,
        user_metadata: {
          full_name: configuredName,
          organization_name: configuredOrg
        }
      });
      if (updated.error) {
        return NextResponse.json({ error: updated.error.message }, { status: 400 });
      }
      user = updated.data.user;
    } else {
      user = created.data.user;
    }

    if (!user) {
      return NextResponse.json({ error: "无法创建或读取首次管理员账号。" }, { status: 500 });
    }

    await ensureUserWorkspace(user);

    const { error } = await supabase.auth.signInWithPassword({
      email: configuredEmail,
      password: configuredPassword
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ message: "Owner 账号已就绪，正在进入工作台。", redirectTo: "/dashboard" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "初始化 Owner 失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
