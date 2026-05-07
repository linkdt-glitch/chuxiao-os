"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 退出登录：清除 Supabase 会话 + 跳到登录页。
 * 在客户端通过 <form action={logoutAction}> 触发。
 */
export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut().catch(() => {
      // Even if Supabase signOut fails (network / already expired),
      // we still want to clear the cookie and send the user to /login.
    });
  }
  redirect("/login");
}

/**
 * 切换账号：本质跟退出一样（Supabase Auth 是单 cookie 模型，不能同时
 * 保留多个账号 session）。但跳转时带上 ?notice=switched，让登录页
 * 提示"已退出当前账号，请用另一个账号登录"，UX 比"退出登录"更明确。
 */
export async function switchAccountAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut().catch(() => {});
  }
  redirect("/login?notice=switched");
}
