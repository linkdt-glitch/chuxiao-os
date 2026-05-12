import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoMembers, demoOrganization, demoUser } from "@/lib/data/demo";

export function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";
}

/**
 * All four auth helpers are wrapped with React `cache()` so a single
 * RSC render only triggers ONE `supabase.auth.getUser()` RPC even when
 * `getCurrentOrganization()` and `getCurrentMember()` both ask for the
 * session. This was previously costing ~500ms of duplicate roundtrips
 * on every page load.
 */

export const getSessionUser = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
});

export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return demoUser;

    const user = await getSessionUser();
    if (!user) return demoUser;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, avatar_url, must_change_password, created_at, updated_at")
      .eq("id", user.id)
      .single();

    return profile ?? {
      id: user.id,
      email: user.email ?? "",
      full_name: user.email ?? "User",
      must_change_password: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch {
    return demoUser;
  }
});

async function getDemoOrganizationWithCookie() {
  try {
    const jar = await cookies();
    const raw = jar.get("demo_announcements")?.value;
    if (raw) {
      const announcements = JSON.parse(raw) as string[];
      return { ...demoOrganization, settings: { ...demoOrganization.settings, announcements } };
    }
  } catch {}
  return demoOrganization;
}

export const getCurrentOrganization = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getSessionUser();
    if (!supabase) return await getDemoOrganizationWithCookie();
    if (!user) return await getDemoOrganizationWithCookie();

    const { data } = await supabase
      .from("organization_members")
      .select("organizations(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    const organization = data?.organizations;
    return Array.isArray(organization)
      ? organization[0]
      : organization ?? await getDemoOrganizationWithCookie();
  } catch {
    return getDemoOrganizationWithCookie();
  }
});

export const getCurrentMember = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getSessionUser();
    const organization = await getCurrentOrganization();
    if (!supabase) return demoMembers[0];
    if (!user) return demoMembers[0];

    // ⭐ 关键修复：必须和 SQL 函数 current_member_id() 的过滤条件完全一致！
    // SQL current_member_id 过滤 member_type='human'。如果 JS 这边不过滤，
    // 当用户在 organization_members 里有多行（多种 member_type）时，可能返回
    // 不同的 member.id —— 导致：
    //   1. INSERT 时 submitted_by = JS member.id
    //   2. SELECT RLS 检查 submitted_by = SQL current_member_id
    //   3. 不一致 → SELECT 返回 0 行 → PGRST116 错误 + 员工看不到自己记录
    // 用 maybeSingle 而不是 single 避免 0 行时抛错（被 catch 后回落 demo 误导）
    const { data } = await supabase
      .from("organization_members")
      .select("*, roles(*)")
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .eq("member_type", "human")
      .maybeSingle();

    if (!data) return demoMembers[0];
    return { ...data, role: data.roles };
  } catch {
    return demoMembers[0];
  }
});
