"use server";

import { headers } from "next/headers";
import { resolveAppOrigin } from "@/lib/auth/origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isEmailAllowedForLogin } from "@/lib/auth/access";

export type LoginActionState = {
  message?: string;
  error?: string;
};

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

export async function requestLoginLink(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = value(formData, "email").toLowerCase();
  const fullName = value(formData, "full_name");
  const organizationName = value(formData, "organization_name");

  if (!email) return { error: "请输入邮箱。" };

  const allowed = await isEmailAllowedForLogin(email);
  if (!allowed) {
    return {
      error: "这个邮箱暂未加入初晓 OS 的准入名单。请先让管理员把邮箱加入 AUTH_ALLOWED_EMAILS 或允许域名。"
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { message: "当前未配置 Supabase 环境变量，应用会使用内置 demo 数据运行。" };
  }

  const headerStore = await headers();
  const origin = resolveAppOrigin(headerStore.get("origin"));
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        organization_name: organizationName
      }
    }
  });

  if (error) return { error: error.message };
  return { message: "登录链接已发送，请检查邮箱。" };
}
