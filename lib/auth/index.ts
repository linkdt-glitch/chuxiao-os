import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoMembers, demoOrganization, demoUser } from "@/lib/data/demo";

export function isDemoModeEnabled() {
  return (
    process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true" ||
    process.env.ENABLE_DEMO_MODE === "true"
  );
}

export async function getSessionUser() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return demoUser;

    const { data } = await supabase.auth.getUser();
    if (!data.user) return demoUser;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    return profile ?? {
      id: data.user.id,
      email: data.user.email ?? "",
      full_name: data.user.email ?? "User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } catch {
    return demoUser;
  }
}

export async function getCurrentOrganization() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getSessionUser();
    if (!supabase) return demoOrganization;
    if (!user) return demoOrganization;

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
      : organization ?? demoOrganization;
  } catch {
    return demoOrganization;
  }
}

export async function getCurrentMember() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await getSessionUser();
    const organization = await getCurrentOrganization();
    if (!supabase) return demoMembers[0];
    if (!user) return demoMembers[0];

    const { data } = await supabase
      .from("organization_members")
      .select("*, roles(*)")
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!data) return demoMembers[0];
    return { ...data, role: data.roles };
  } catch {
    return demoMembers[0];
  }
}
