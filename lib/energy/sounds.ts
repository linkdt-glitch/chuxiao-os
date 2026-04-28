import type { EnergySettings } from "@/lib/types/core";

export function canPlaySound(settings?: Pick<EnergySettings, "sounds_enabled" | "focus_mode"> | null) {
  return Boolean(settings?.sounds_enabled) && !settings?.focus_mode && typeof window !== "undefined";
}

export async function playSound(fileName?: string | null, settings?: Pick<EnergySettings, "sounds_enabled" | "focus_mode" | "sound_volume"> | null) {
  if (!fileName || !canPlaySound(settings)) return;

  try {
    const audio = new Audio(`/sounds/${fileName}`);
    audio.volume = Math.min(1, Math.max(0, Number(settings?.sound_volume ?? 0.2)));
    await audio.play();
  } catch {
    // Sound assets are optional. Missing files or autoplay restrictions should never block work.
  }
}
