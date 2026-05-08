import { redirect } from "next/navigation";
import { getSessionUser, isDemoModeEnabled } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export default async function HomePage() {
  // 未登录 → /login
  if (!isDemoModeEnabled()) {
    if (!hasSupabaseEnv()) redirect("/login?error=missing_supabase_env");
    const sessionUser = await getSessionUser();
    if (!sessionUser) redirect("/login");
  }

  // 所有人都先进 /home（公司主页：使命 / 愿景 / 价值观 / 目标 / 公告）
  // 创始人想看老板驾驶舱可在侧栏点 "领航舱"
  redirect("/home");
}
