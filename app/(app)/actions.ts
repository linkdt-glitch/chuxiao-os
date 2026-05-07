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
