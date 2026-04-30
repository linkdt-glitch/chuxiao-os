import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoModules, demoOrganizationModules } from "@/lib/data/demo";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { getRolePermissionKeys } from "@/lib/permissions";

export async function getEnabledModules() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) {
    return demoOrganizationModules.filter((item) => item.is_enabled);
  }

  const { data } = await supabase
    .from("organization_modules")
    .select("*, modules(*)")
    .eq("organization_id", organization.id)
    .eq("is_enabled", true);

  return (data ?? [])
    .map((item) => ({ ...item, module: item.modules }))
    .filter((item) => item.module?.key !== "approvals");
}

export async function getNavigationModules() {
  const supabase = await createSupabaseServerClient();
  const [organization, member] = await Promise.all([
    getCurrentOrganization(),
    getCurrentMember()
  ]);
  let modules = demoModules;

  if (supabase) {
    const { data } = await supabase
      .from("organization_modules")
      .select("is_enabled, modules(*)")
      .eq("organization_id", organization.id);

    if (data?.length) {
      modules = data
        .map((item) => ({ ...(item.modules as any), isEnabled: item.is_enabled }))
        .filter((module) => module.id);
    }
  }

  const roleKey = member.role?.key ?? "member";
  const permissionKeys = getRolePermissionKeys(roleKey);

  const visible = modules
    .filter((module) => module.key !== "approvals")
    .map((module) => ({
      ...module,
      canAccess:
        module.required_permission.endsWith(".read") ||
        permissionKeys.includes("*") ||
        permissionKeys.includes(module.required_permission),
      isEnabled:
        module.status === "coming_soon" ||
        Boolean((module as { isEnabled?: boolean }).isEnabled) ||
        demoOrganizationModules.some(
          (item) => item.module_id === module.id && item.is_enabled
        )
    }));

  return visible.filter((module) => module.canAccess && module.isEnabled);
}

export async function toggleModule(moduleId: string, enabled: boolean) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { error } = await supabase
    .from("organization_modules")
    .update({ is_enabled: enabled })
    .eq("organization_id", organization.id)
    .eq("module_id", moduleId);

  if (error) throw error;
  return { ok: true };
}

export async function getAllModulesWithOrganizationState() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoOrganizationModules;

  const { data } = await supabase
    .from("organization_modules")
    .select("*, modules(*)")
    .eq("organization_id", organization.id);

  return (data ?? []).map((item) => ({ ...item, module: item.modules }));
}
