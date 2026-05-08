import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoModules, demoOrganizationModules } from "@/lib/data/demo";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { getRolePermissionKeys } from "@/lib/permissions";

/**
 * 模块名重映射 — 代码层覆盖 DB modules.name，无需等 DB migration 也能立即生效。
 * DB 层也会跟着用 supabase migration 同步更新，最终 DB 就和这里一致。
 */
const MODULE_NAME_REMAP: Record<string, string> = {
  finance: "财务能量中心",
  projects: "任务计划中心",
  ai_workforce: "AI 风暴创新实验室"
};

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
      // 应用模块名重映射（finance / projects / ai_workforce 改名）
      name: MODULE_NAME_REMAP[module.key] ?? module.name,
      // 严格按 required_permission 校验，不再"以 .read 结尾就放行"
      // —— 之前的 bypass 让所有 role（包括 member）都能看到 dashboard 等
      canAccess:
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
