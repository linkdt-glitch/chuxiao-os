"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { requirePermission } from "@/lib/permissions";

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

    if (!email || !email.includes("@")) throw new Error("请输入正确的成员邮箱。");
    if (!display_name) throw new Error("请输入成员姓名。");
    if (!password || password.length < 12) throw new Error("初始密码至少需要 12 位。");
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error("初始密码需同时包含字母和数字。");
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

    const memberPayload = {
      organization_id: organization.id,
      user_id,
      role_id: role.id,
      member_type: "human",
      display_name,
      email,
      status: "active",
      metadata: { created_from: "organization_admin" }
    };

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

    await logAction({
      event_key: existingMember?.id ? "member.updated" : "member.created",
      action: existingMember?.id ? "update" : "create",
      module: "organization",
      related_record_type: "organization_member",
      related_record_id: member.id,
      after_data: { email, display_name, role_key, status: "active" }
    });
    await emitEvent({
      event_key: existingMember?.id ? "member.updated" : "member.created",
      module: "organization",
      payload: {
        related_record_type: "organization_member",
        related_record_id: member.id,
        email,
        display_name,
        role_key
      }
    });

    revalidatePath("/organization");
    return {
      ok: true,
      message: existingMember?.id
        ? `已更新 ${display_name} 的账号、角色和初始密码。`
        : `已创建 ${display_name} 的成员账号，可以用邮箱和初始密码登录。`
    };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function disableMemberAction(formData: FormData) {
  await requirePermission("organization.manage");

  const member_id = value(formData, "member_id");
  if (!member_id) throw new Error("缺少成员 ID");

  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return;

  const { error } = await supabase
    .from("organization_members")
    .update({ status: "disabled" })
    .eq("id", member_id)
    .eq("organization_id", organization.id);

  if (error) throw error;

  await logAction({
    event_key: "member.disabled",
    action: "disable",
    module: "organization",
    related_record_type: "organization_member",
    related_record_id: member_id,
  });
  await emitEvent({
    event_key: "member.disabled",
    module: "organization",
    payload: { member_id },
  });

  revalidatePath("/organization");
}
