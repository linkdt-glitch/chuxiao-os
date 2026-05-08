"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentMember, getSessionUser } from "@/lib/auth";
import {
  CHUXIAO_IMPERSONATOR_COOKIE,
  getImpersonationState
} from "@/lib/auth/impersonation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  // 顺手清掉 impersonation cookie，避免下次登录还残留旧痕迹。
  const jar = await cookies();
  jar.delete(CHUXIAO_IMPERSONATOR_COOKIE);
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
  const jar = await cookies();
  jar.delete(CHUXIAO_IMPERSONATOR_COOKIE);
  redirect("/login?notice=switched");
}

/**
 * 创始人"查看模式" — 把当前 session 切换为目标成员的 session。
 *
 * 流程：
 *   1. 校验调用人当前是 owner（且未在查看模式中）
 *   2. 把 owner 自己的 user_id 写进 httpOnly cookie，便于后面切回去
 *   3. 用 service-role 给目标账号生成 magiclink，server 端 verifyOtp 完成
 *      session 切换（SSR supabase cookie 被替换成目标账号的 session）
 *   4. 跳到 /dashboard，banner 会提示"正在以 XXX 身份查看"
 *
 * 注：磁盘上不会保留 owner 的密码，切回去时也是用同样的 admin generate-link
 *    + verifyOtp 走一遍，无需明文密码。
 */
export async function impersonateMemberAction(formData: FormData) {
  const targetUserId = String(formData.get("user_id") ?? "").trim();
  if (!targetUserId) redirect("/?error=impersonate_missing_target");

  // 已经在查看模式 → 拒绝（避免嵌套切换 → owner cookie 被覆盖丢失）
  const impersonation = await getImpersonationState();
  if (impersonation.active) {
    redirect("/?error=already_impersonating");
  }

  // 仅 owner 可用
  const member = await getCurrentMember();
  if (member?.role?.key !== "owner") {
    redirect("/?error=impersonate_forbidden");
  }

  const ownerUser = await getSessionUser();
  if (!ownerUser) redirect("/login");

  // 不能 impersonate 自己
  if (ownerUser.id === targetUserId) {
    redirect("/?notice=impersonate_self_skipped");
  }

  const admin = createSupabaseAdminClient();
  if (!admin) redirect("/?error=admin_client_unavailable");

  const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(targetUserId);
  if (targetError || !targetData?.user?.email) {
    console.error("[impersonate] target lookup failed:", targetError?.message);
    redirect("/?error=impersonate_target_not_found");
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetData.user.email
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[impersonate] generate-link failed:", linkError?.message);
    redirect("/?error=impersonate_link_failed");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/?error=session_unavailable");

  // 先把 owner 的 user_id 写到 cookie，**必须在 verifyOtp 之前** —— 一旦
  // session 被替换成目标账号，cookies() 取到的还是同一个 store，所以这里
  // 写入顺序无所谓，但为了语义清晰，先写。
  const jar = await cookies();
  jar.set(CHUXIAO_IMPERSONATOR_COOKIE, ownerUser.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 12h —— 创始人偶尔切过去验证一下就够了，不需要长期保留
    maxAge: 60 * 60 * 12
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token
  });
  if (verifyError) {
    console.error("[impersonate] verifyOtp failed:", verifyError.message);
    jar.delete(CHUXIAO_IMPERSONATOR_COOKIE);
    redirect("/?error=impersonate_verify_failed");
  }

  redirect("/dashboard?impersonating=1");
}

/** 退出查看模式：把 session 切回创始人。 */
export async function exitImpersonationAction() {
  const jar = await cookies();
  const realUserId = jar.get(CHUXIAO_IMPERSONATOR_COOKIE)?.value;
  if (!realUserId) redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  if (!admin) redirect("/?error=admin_client_unavailable");

  const { data: ownerData, error: ownerError } = await admin.auth.admin.getUserById(realUserId);
  if (ownerError || !ownerData?.user?.email) {
    console.error("[exit-impersonate] owner lookup failed:", ownerError?.message);
    jar.delete(CHUXIAO_IMPERSONATOR_COOKIE);
    redirect("/login?notice=session_lost");
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: ownerData.user.email
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[exit-impersonate] generate-link failed:", linkError?.message);
    redirect("/?error=exit_impersonate_failed");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/?error=session_unavailable");

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token
  });
  if (verifyError) {
    console.error("[exit-impersonate] verifyOtp failed:", verifyError.message);
    redirect("/?error=exit_impersonate_failed");
  }

  jar.delete(CHUXIAO_IMPERSONATOR_COOKIE);
  redirect("/dashboard?notice=exit_impersonate_ok");
}
