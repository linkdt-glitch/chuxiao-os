import { redirect } from "next/navigation";
import { getCurrentMember, getSessionUser, isDemoModeEnabled } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export default async function HomePage() {
  // 未登录 → /login（让 (app)/layout 也走一遍校验，但这里早点拦截更快）
  if (!isDemoModeEnabled()) {
    if (!hasSupabaseEnv()) redirect("/login?error=missing_supabase_env");
    const sessionUser = await getSessionUser();
    if (!sessionUser) redirect("/login");
  }

  // 角色路由：创始人进老板驾驶舱；其它角色进任务计划中心
  const member = await getCurrentMember();
  if (member?.role?.key === "owner") {
    redirect("/dashboard");
  }
  redirect("/projects");
}
