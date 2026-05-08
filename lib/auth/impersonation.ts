import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 创始人"查看模式"工具
 *
 * 设计：
 *  - 创始人 (owner) 可临时把自己的 session 切换为某个成员的 session，
 *    用来真实体验该角色看到 / 操作 / 不能操作的页面。
 *  - 实现思路：用 service-role admin 给目标账号 generateLink('magiclink')，
 *    server-side verifyOtp 把 SSR 的 supabase cookie 替换成目标账号的 session。
 *    同时把原 (创始人) user_id 写到 httpOnly cookie 里，退出查看模式时再
 *    用同样的方式切回去。
 *
 *  - cookie 名约定：CHUXIAO_IMPERSONATOR_COOKIE
 *    值为创始人原 user_id（仅 server 可读）。
 */

export const CHUXIAO_IMPERSONATOR_COOKIE = "__chuxiao_impersonator";

/** 读取"查看模式"状态：是否处于查看模式 + 创始人原本的 user_id + 邮箱 */
export const getImpersonationState = cache(async () => {
  const jar = await cookies();
  const realUserId = jar.get(CHUXIAO_IMPERSONATOR_COOKIE)?.value;
  if (!realUserId) return { active: false as const };

  const admin = createSupabaseAdminClient();
  if (!admin) return { active: false as const };

  try {
    const { data, error } = await admin.auth.admin.getUserById(realUserId);
    if (error || !data?.user) return { active: false as const };
    return {
      active: true as const,
      realUserId,
      realEmail: data.user.email ?? "",
      realName:
        (data.user.user_metadata?.full_name as string | undefined) ??
        data.user.email ??
        "创始人"
    };
  } catch {
    return { active: false as const };
  }
});
