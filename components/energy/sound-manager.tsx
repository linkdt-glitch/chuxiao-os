"use client";

import { useEffect } from "react";
import type { EnergySettings } from "@/lib/types/core";
import { playSound } from "@/lib/energy/sounds";

export function SoundManager({
  sound,
  settings,
  playId
}: {
  sound?: string | null;
  settings: EnergySettings;
  playId?: number;
}) {
  useEffect(() => {
    void playSound(sound, settings);
  }, [sound, settings, playId]);

  return null;
}
