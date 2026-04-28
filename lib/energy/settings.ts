import { getCurrentMember, getCurrentOrganization, getSessionUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EnergySettings } from "@/lib/types/core";

export const defaultEnergySettings = {
  animations_enabled: true,
  sounds_enabled: true,
  sound_volume: 0.2,
  focus_mode: false,
  daily_motivation_enabled: true,
  large_celebrations_enabled: true
};

function normalizeSettings(input?: Partial<EnergySettings> | null): EnergySettings {
  return {
    organization_id: input?.organization_id ?? "",
    user_id: input?.user_id ?? null,
    animations_enabled: input?.animations_enabled ?? defaultEnergySettings.animations_enabled,
    sounds_enabled: input?.sounds_enabled ?? defaultEnergySettings.sounds_enabled,
    sound_volume: Number(input?.sound_volume ?? defaultEnergySettings.sound_volume),
    focus_mode: input?.focus_mode ?? defaultEnergySettings.focus_mode,
    daily_motivation_enabled: input?.daily_motivation_enabled ?? defaultEnergySettings.daily_motivation_enabled,
    large_celebrations_enabled: input?.large_celebrations_enabled ?? defaultEnergySettings.large_celebrations_enabled,
    id: input?.id,
    created_at: input?.created_at,
    updated_at: input?.updated_at
  };
}

export async function getEnergySettings(scope: "effective" | "organization" | "user" = "effective") {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  if (!supabase || !user) {
    return normalizeSettings({ organization_id: organization.id });
  }

  const [{ data: organizationSettings }, { data: userSettings }] = await Promise.all([
    supabase
      .from("energy_settings")
      .select("*")
      .eq("organization_id", organization.id)
      .is("user_id", null)
      .maybeSingle(),
    supabase
      .from("energy_settings")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  if (scope === "organization") {
    return normalizeSettings({ ...organizationSettings, organization_id: organization.id, user_id: null });
  }

  if (scope === "user") {
    return normalizeSettings({ ...userSettings, organization_id: organization.id, user_id: user.id });
  }

  return normalizeSettings({
    ...defaultEnergySettings,
    ...organizationSettings,
    ...userSettings,
    organization_id: organization.id,
    user_id: user.id
  });
}

export async function updateEnergySettings(input: {
  scope: "organization" | "user";
  animations_enabled: boolean;
  sounds_enabled: boolean;
  sound_volume: number;
  focus_mode: boolean;
  daily_motivation_enabled: boolean;
  large_celebrations_enabled: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  const member = await getCurrentMember();
  if (!supabase || !user) return { ok: true };

  const patch = {
    organization_id: organization.id,
    user_id: input.scope === "user" ? user.id : null,
    animations_enabled: input.animations_enabled,
    sounds_enabled: input.sounds_enabled,
    sound_volume: Math.min(1, Math.max(0, input.sound_volume)),
    focus_mode: input.focus_mode,
    daily_motivation_enabled: input.daily_motivation_enabled,
    large_celebrations_enabled: input.large_celebrations_enabled
  };

  const query = supabase
    .from("energy_settings")
    .select("id")
    .eq("organization_id", organization.id);
  const { data: existing, error: existingError } =
    input.scope === "user"
      ? await query.eq("user_id", user.id).maybeSingle()
      : await query.is("user_id", null).maybeSingle();

  if (existingError) throw existingError;

  const { error } = existing?.id
    ? await supabase.from("energy_settings").update(patch).eq("id", existing.id)
    : await supabase.from("energy_settings").insert(patch);

  if (error) throw error;

  if (input.scope === "organization") {
    await supabase.from("system_settings").upsert({
      organization_id: organization.id,
      key: "energy.settings",
      value: patch,
      is_sensitive: false
    });
  }

  await logAction({
    actor_id: member.user_id ?? member.id,
    actor_type: member.member_type,
    event_key: "energy.settings.updated",
    action: "update",
    module: "energy",
    related_record_type: "energy_settings",
    after_data: { scope: input.scope, ...patch }
  });
  await emitEvent({
    event_key: "energy.settings.updated",
    module: "energy",
    actor_id: member.user_id ?? member.id,
    actor_type: member.member_type,
    payload: { scope: input.scope }
  });

  return { ok: true };
}
