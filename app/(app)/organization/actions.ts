"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { requirePermission } from "@/lib/permissions";
import { extractErrorMessage, withErrorParam } from "@/lib/server/error";

export type CreateHumanMemberState = {
  ok: boolean;
  message: string;
};

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * 把用户输入的手机号格式归一为纯 11 位数字。
 * 支持：
 *   "138 0013 8000"      → "13800138000"
 *   "138-0013-8000"      → "13800138000"
 *   "+86 138 0013 8000"  → "13800138000"
 *   "0086 138 0013 8000" → "13800138000"
 *   "(86) 138 0013 8000" → "13800138000"
 * 不符合规则的返回原始 trim 结果，让上层校验抛错给用户看。
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  // 1. 删空格 / 短横线 / 圆括号 / 加号
  const digitsOnly = raw.replace(/[\s\-()+]/g, "");
  // 2. 砍掉国家码前缀 86 / 0086
  const noCC = digitsOnly.replace(/^0086/, "").replace(/^86(?=1[3-9]\d{9}$)/, "");
  return noCC;
}

async function getOrCreateAuthUser({
  email,
  password,
  displayName
}: {
  email: string;
  password: string;
  displayName: string;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("缺少 Supabase service role key，无法创建成员账号。");

  const { data: existingProfile } = await admin
    .from("user_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.id) {
    const { error: updateUserError } = await admin.auth.admin.updateUserById(existingProfile.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName }
    });
    if (updateUserError) throw updateUserError;

    const { error: updateProfileError } = await admin
      .from("user_profiles")
      .update({ full_name: displayName })
      .eq("id", existingProfile.id);
    if (updateProfileError) throw updateProfileError;

    return existingProfile.id as string;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName }
  });

  if (error) throw error;
  if (!data.user?.id) throw new Error("Supabase 未返回新成员用户 ID。");

  const { error: profileError } = await admin.from("user_profiles").upsert({
    id: data.user.id,
    email,
    full_name: displayName,
    metadata: {}
  });

  if (profileError) throw profileError;
  return data.user.id;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "创建成员失败，请检查邮箱、密码和角色后重试。";
}

export async function createHumanMemberAction(
  _prevState: CreateHumanMemberState,
  formData: FormData
): Promise<CreateHumanMemberState> {
  try {
    await requirePermission("organization.manage");

    const email = normalizeEmail(value(formData, "email") ?? "");
    const display_name = value(formData, "display_name");
    const password = value(formData, "password");
    const role_key = value(formData, "role_key") ?? "member";
    // ⭐ 手机号是可选的；前端 add-member-form 一直有这个输入框，但 action 之前
    //    没读它 —— 导致 admin 填了手机号也存不进去 → 员工后面用手机号登不上。
    //    normalizePhone 会扫掉空格 / 短横线 / +86 前缀，把 "+86 138 0013 8000"
    //    自动归一为 "13800138000"。
    const phone_raw = value(formData, "phone");
    const phone = phone_raw ? normalizePhone(phone_raw) : null;

    if (!email || !email.includes("@")) throw new Error("请输入正确的成员邮箱。");
    if (!display_name) throw new Error("请输入成员姓名。");
    if (!password || password.length < 12) throw new Error("初始密码至少需要 12 位。");
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error("初始密码需同时包含字母和数字。");
    }
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      throw new Error("手机号格式不正确 —— 请填 11 位的中国大陆手机号。");
    }
    if (!["admin", "manager", "member"].includes(role_key)) {
      throw new Error("第一版仅支持添加 Admin / Manager / Member 三类人类成员。");
    }

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const organization = await getCurrentOrganization();
    if (!supabase || !admin) throw new Error("系统环境变量不完整，无法创建成员账号。");

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, key, name")
      .eq("organization_id", organization.id)
      .eq("key", role_key)
      .maybeSingle();

    if (roleError) throw roleError;
    if (!role?.id) throw new Error("没有找到对应角色，请先检查角色权限配置。");

    const user_id = await getOrCreateAuthUser({ email, password, displayName: display_name });

    const { data: existingMember, error: existingError } = await admin
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", organization.id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existingError) throw existingError;

    const memberPayload: Record<string, unknown> = {
      organization_id: organization.id,
      user_id,
      role_id: role.id,
      member_type: "human",
      display_name,
      email,
      status: "active",
      metadata: { created_from: "organization_admin" }
    };
    // 只有填了手机号才写进去，避免覆盖之前已经设过的值（更新分支）
    if (phone) memberPayload.phone = phone;

    const { data: member, error } = existingMember?.id
      ? await admin
          .from("organization_members")
          .update(memberPayload)
          .eq("id", existingMember.id)
          .select("id")
          .single()
      : await admin
          .from("organization_members")
          .insert(memberPayload)
          .select("id")
          .single();

    if (error) throw error;

    // Force password change on first login
    await admin
      .from("user_profiles")
      .update({ must_change_password: true })
      .eq("id", user_id);

    await logAction({
      event_key: existingMember?.id ? "member.updated" : "member.created",
      action: existingMember?.id ? "update" : "create",
      module: "organization",
      related_record_type: "organization_member",
      related_record_id: member.id,
      after_data: { email, phone, display_name, role_key, status: "active" }
    });
    await emitEvent({
      event_key: existingMember?.id ? "member.updated" : "member.created",
      module: "organization",
      payload: {
        related_record_type: "organization_member",
        related_record_id: member.id,
        email,
        phone,
        display_name,
        role_key
      }
    });

    revalidatePath("/organization");
    // 文案里告诉 admin"也能用手机号登录"，避免他们以为只支持邮箱
    const loginHint = phone ? "邮箱 / 手机号 + 初始密码" : "邮箱和初始密码";
    return {
      ok: true,
      message: existingMember?.id
        ? `已更新 ${display_name} 的账号、角色和初始密码。`
        : `已创建 ${display_name} 的成员账号，可以用${loginHint}登录。`
    };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function updateMemberAction(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  try {
    await requirePermission("organization.manage");

    const member_id = value(formData, "member_id");
    const display_name = value(formData, "display_name");
    const email = value(formData, "email")?.toLowerCase();
    const phone_raw = value(formData, "phone");
    // 归一化手机号（允许空格 / +86 / 短横线）—— 跟 createHumanMemberAction 行为一致
    const phone = phone_raw ? normalizePhone(phone_raw) : null;
    const role_key = value(formData, "role_key");
    const password = value(formData, "password");

    if (!member_id) return { ok: false, message: "缺少成员 ID。" };
    if (!display_name) return { ok: false, message: "姓名不能为空。" };
    if (email && !email.includes("@")) return { ok: false, message: "请输入正确的邮箱地址。" };
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return { ok: false, message: "手机号格式不正确 —— 请填 11 位的中国大陆手机号。" };
    }
    if (password && password.length < 12) return { ok: false, message: "密码至少需要 12 位。" };
    if (password && (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
      return { ok: false, message: "密码需同时包含字母和数字。" };
    }

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();

    // ── Demo mode ─────────────────────────────────────────────
    if (!supabase || !admin) {
      const jar = await cookies();
      // Persist password override
      if (password) {
        const raw = jar.get("demo_member_passwords")?.value;
        const map: Record<string, string> = (() => { try { return JSON.parse(raw ?? "{}"); } catch { return {}; } })();
        map[member_id] = password;
        jar.set("demo_member_passwords", JSON.stringify(map), {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
      });
      }
      revalidatePath("/organization");
      return { ok: true, message: `已更新成员信息${password ? "（含密码）" : ""}。演示模式下部分变更仅在当前会话有效。` };
    }

    // ── Production ────────────────────────────────────────────
    const organization = await getCurrentOrganization();

    // Find role_id
    let role_id: string | undefined;
    if (role_key) {
      const { data: role } = await supabase
        .from("roles")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("key", role_key)
        .maybeSingle();
      role_id = role?.id;
      if (!role_id) return { ok: false, message: "未找到对应角色，请刷新后重试。" };
    }

    // Get current member to find user_id
    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("id", member_id)
      .eq("organization_id", organization.id)
      .single();

    if (!member) return { ok: false, message: "未找到该成员。" };

    // Update organization_members
    const memberUpdate: Record<string, unknown> = { display_name, updated_at: new Date().toISOString() };
    if (email) memberUpdate.email = email;
    if (phone !== undefined) memberUpdate.phone = phone;
    if (role_id) memberUpdate.role_id = role_id;

    const { error: memberError } = await supabase
      .from("organization_members")
      .update(memberUpdate)
      .eq("id", member_id)
      .eq("organization_id", organization.id);
    if (memberError) throw memberError;

    // Update auth user (email + password)
    if (member.user_id && (email || password)) {
      const authUpdate: Record<string, unknown> = { user_metadata: { full_name: display_name } };
      if (email) authUpdate.email = email;
      if (password) authUpdate.password = password;
      const { error: authError } = await admin.auth.admin.updateUserById(member.user_id, authUpdate);
      if (authError) throw authError;
    }

    // Update user_profile name (and flag must_change_password if admin changed the password)
    if (member.user_id) {
      const profileUpdate: Record<string, unknown> = { full_name: display_name };
      if (email) profileUpdate.email = email;
      if (password) profileUpdate.must_change_password = true;
      await admin.from("user_profiles").update(profileUpdate).eq("id", member.user_id);
    }

    await logAction({
      event_key: "member.updated",
      action: "update",
      module: "organization",
      related_record_type: "organization_member",
      related_record_id: member_id,
      after_data: { display_name, email, phone, role_key, password_changed: Boolean(password) }
    });

    revalidatePath("/organization");
    return { ok: true, message: `${display_name} 的信息已更新${password ? "，密码已重置" : ""}。` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "更新失败，请重试。" };
  }
}

export async function resetMemberPasswordAction(
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  try {
    await requirePermission("organization.manage");

    const member_id = value(formData, "member_id");
    const password = value(formData, "password");

    if (!member_id) return { ok: false, message: "缺少成员 ID。" };
    if (!password || password.length < 12) return { ok: false, message: "密码至少需要 12 位。" };

    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();

    // Demo mode: persist new password to cookie map
    if (!supabase || !admin) {
      const jar = await cookies();
      const raw = jar.get("demo_member_passwords")?.value;
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      map[member_id] = password;
      jar.set("demo_member_passwords", JSON.stringify(map), {
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
      });
      revalidatePath("/organization");
      return { ok: true, message: "演示模式：密码已更新（仅本会话有效）。" };
    }

    // Production: find user_id from member, update auth password
    const organization = await getCurrentOrganization();
    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("id", member_id)
      .eq("organization_id", organization.id)
      .single();

    if (!member?.user_id) return { ok: false, message: "未找到对应成员账号。" };

    const { error } = await admin.auth.admin.updateUserById(member.user_id, { password });
    if (error) throw error;

    // Force user to change password on next login
    await admin
      .from("user_profiles")
      .update({ must_change_password: true })
      .eq("id", member.user_id);

    await logAction({
      event_key: "member.password_reset",
      action: "update",
      module: "organization",
      related_record_type: "organization_member",
      related_record_id: member_id,
      after_data: { password_reset: true }
    });

    revalidatePath("/organization");
    return { ok: true, message: "密码已重置，成员下次登录时将被要求修改密码。" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "密码重置失败。" };
  }
}

export async function enableMemberAction(formData: FormData) {
  const member_id = value(formData, "member_id");
  if (!member_id) {
    redirect(withErrorParam("/organization", "缺少成员 ID。"));
  }
  try {
    await requirePermission("organization.manage");
    const supabase = await createSupabaseServerClient();
    const organization = await getCurrentOrganization();
    if (!supabase) {
      revalidatePath("/organization");
      redirect(`/organization?notice=${encodeURIComponent("演示模式：成员已启用。")}`);
    }
    const { error } = await supabase
      .from("organization_members")
      .update({ status: "active" })
      .eq("id", member_id)
      .eq("organization_id", organization.id);
    if (error) throw error;
    await logAction({
      event_key: "member.enabled",
      action: "enable",
      module: "organization",
      related_record_type: "organization_member",
      related_record_id: member_id
    });
  } catch (error) {
    console.error("[enableMemberAction] error:", error);
    redirect(withErrorParam("/organization", extractErrorMessage(error)));
  }
  revalidatePath("/organization");
  redirect(`/organization?notice=${encodeURIComponent("成员已启用。")}`);
}

export async function disableMemberAction(formData: FormData) {
  const member_id = value(formData, "member_id");
  if (!member_id) {
    redirect(withErrorParam("/organization", "缺少成员 ID。"));
  }
  try {
    await requirePermission("organization.manage");
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const organization = await getCurrentOrganization();
    if (!supabase) {
      revalidatePath("/organization");
      redirect(`/organization?notice=${encodeURIComponent("演示模式：成员已禁用。")}`);
    }

    // Fetch user_id before disabling
    const { data: memberRow } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("id", member_id)
      .eq("organization_id", organization.id)
      .maybeSingle();

    const { error } = await supabase
      .from("organization_members")
      .update({ status: "disabled" })
      .eq("id", member_id)
      .eq("organization_id", organization.id);

    if (error) throw error;

    // Revoke active sessions — failure here shouldn't roll back the disable.
    // Cookie 已无效（DB 状态 = disabled，下一次请求被中间件拦截），
    // signOut 是补刀让现有 token 失效，失败也只是延迟几分钟生效，记 warn 不抛错。
    if (admin && memberRow?.user_id) {
      try {
        await admin.auth.admin.signOut(memberRow.user_id, "global");
      } catch (signOutError) {
        console.warn("[disableMemberAction] signOut failed (ignored):", signOutError);
      }
    }

    await logAction({
      event_key: "member.disabled",
      action: "disable",
      module: "organization",
      related_record_type: "organization_member",
      related_record_id: member_id
    });
    await emitEvent({
      event_key: "member.disabled",
      module: "organization",
      payload: { member_id }
    });
  } catch (error) {
    console.error("[disableMemberAction] error:", error);
    redirect(withErrorParam("/organization", extractErrorMessage(error)));
  }
  revalidatePath("/organization");
  redirect(`/organization?notice=${encodeURIComponent("成员已禁用，会话已撤销。")}`);
}
