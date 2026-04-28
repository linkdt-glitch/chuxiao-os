import type { User } from "@supabase/supabase-js";
import { ensureDefaultAIProviders } from "@/lib/ai/default-providers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailAllowedForLogin } from "@/lib/auth/access";

const defaultRoles = [
  ["owner", "Owner", "拥有全部权限，不可删除。", 100],
  ["admin", "Admin", "大部分管理权限，不能删除 Owner 或修改最高风险配置。", 80],
  ["manager", "Manager", "管理被授权业务、审批、文件和成员协作。", 50],
  ["member", "Member", "查看工作台、提交审批、上传文件。", 20],
  ["agent", "Agent", "AI 员工默认低权限角色，必须绑定负责人。", 10]
] as const;

export async function ensureUserWorkspace(user: User) {
  const admin = createSupabaseAdminClient();
  if (!admin || !user.email) return;
  if (!(await isEmailAllowedForLogin(user.email))) return;

  const fullName = String(user.user_metadata?.full_name ?? user.email.split("@")[0]);
  const orgName = String(user.user_metadata?.organization_name ?? `${fullName} 的组织`);
  const slug = `${orgName.toLowerCase().replace(/\s+/g, "-")}-${user.id.slice(0, 8)}`;

  await admin.from("user_profiles").upsert({
    id: user.id,
    email: user.email,
    full_name: fullName
  });

  const { data: existingMember } = await admin
    .from("organization_members")
    .select("id, organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMember) {
    await ensureDefaultAIProviders(existingMember.organization_id);
    return;
  }

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: orgName,
      slug,
      settings: { timezone: "Asia/Shanghai", security_review_required: true }
    })
    .select()
    .single();

  if (orgError) throw orgError;

  const { data: roles, error: rolesError } = await admin
    .from("roles")
    .insert(
      defaultRoles.map(([key, name, description, risk_rank]) => ({
        organization_id: organization.id,
        key,
        name,
        description,
        is_system: true,
        risk_rank
      }))
    )
    .select();

  if (rolesError) throw rolesError;
  const ownerRole = roles.find((role) => role.key === "owner");
  if (!ownerRole) throw new Error("Owner role was not created");

  const { data: modules } = await admin.from("modules").select("id, status");
  if (modules?.length) {
    await admin.from("organization_modules").insert(
      modules.map((module) => ({
        organization_id: organization.id,
        module_id: module.id,
        is_enabled: module.status === "active",
        settings: {}
      }))
    );
  }

  await ensureDefaultAIProviders(organization.id);

  await admin.from("organization_members").insert({
    organization_id: organization.id,
    user_id: user.id,
    role_id: ownerRole.id,
    member_type: "human",
    display_name: fullName,
    email: user.email,
    status: "active"
  });

  await admin.from("system_events").insert({
    organization_id: organization.id,
    event_key: "organization.created",
    event_source: "human",
    actor_id: user.id,
    actor_type: "human",
    module: "organization",
    payload: { organization: orgName },
    status: "processed"
  });
}
