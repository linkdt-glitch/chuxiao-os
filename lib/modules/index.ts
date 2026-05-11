import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoModules, demoOrganizationModules } from "@/lib/data/demo";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { getRolePermissionKeys } from "@/lib/permissions";

// 缓存「这个组织开了哪些模块」—— admin 偶尔切一次开关，但 (app) 布局每次切页面都要读。
// 1 小时 TTL，admin 切换时通过 revalidateTag("organization_modules") 立即失效。
// 失败时抛错（不缓存 null），上层 fallback 到 server client 直查
const _getOrgModulesRaw = unstable_cache(
  async (orgId: string) => {
    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error("admin_client_unavailable");
    const { data, error } = await admin
      .from("organization_modules")
      .select("is_enabled, modules(*)")
      .eq("organization_id", orgId);
    if (error) throw error;
    return data ?? [];
  },
  ["organization_modules_raw"],
  { revalidate: 3600, tags: ["organization_modules"] }
);

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
    // 优先用缓存（admin client）；失败 fallback 到 server client 直查
    let data: Array<{ is_enabled: boolean; modules: unknown }> | null = null;
    try {
      data = await _getOrgModulesRaw(organization.id) as typeof data;
    } catch (error) {
      console.warn("[getNavigationModules] cached path failed, fallback:", error);
      const { data: fallbackData } = await supabase
        .from("organization_modules")
        .select("is_enabled, modules(*)")
        .eq("organization_id", organization.id);
      data = fallbackData as typeof data;
    }

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
  // 立即失效缓存，下次 getNavigationModules 读到新数据
  const { revalidateTag } = await import("next/cache");
  revalidateTag("organization_modules");
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
