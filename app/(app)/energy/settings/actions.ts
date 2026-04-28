"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { updateEnergySettings } from "@/lib/energy/settings";

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function volume(formData: FormData) {
  const raw = Number(formData.get("sound_volume") ?? 0.2);
  if (!Number.isFinite(raw)) return 0.2;
  return Math.min(1, Math.max(0, raw));
}

async function updateFromForm(scope: "organization" | "user", formData: FormData) {
  await updateEnergySettings({
    scope,
    animations_enabled: checked(formData, "animations_enabled"),
    sounds_enabled: checked(formData, "sounds_enabled"),
    sound_volume: volume(formData),
    focus_mode: checked(formData, "focus_mode"),
    daily_motivation_enabled: checked(formData, "daily_motivation_enabled"),
    large_celebrations_enabled: checked(formData, "large_celebrations_enabled")
  });
  revalidatePath("/energy/settings");
}

export async function updateUserEnergySettingsAction(formData: FormData) {
  await updateFromForm("user", formData);
}

export async function updateOrganizationEnergySettingsAction(formData: FormData) {
  await requirePermission("energy.manage");
  await updateFromForm("organization", formData);
}
