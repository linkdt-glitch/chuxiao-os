"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AchievementModal } from "@/components/energy/achievement-modal";
import { ConfettiBurst } from "@/components/energy/confetti-burst";
import { DailyMotivationCard } from "@/components/energy/daily-motivation-card";
import { EnergyToast } from "@/components/energy/energy-toast";
import { FireworkCelebration } from "@/components/energy/firework-celebration";
import { SoundManager } from "@/components/energy/sound-manager";
import { getAnimationForEvent } from "@/lib/energy/animations";
import type {
  EnergySettings,
  OrganizationEnergyEvent,
  UserAchievement
} from "@/lib/types/core";

type RewardPayload = {
  event: OrganizationEnergyEvent;
  rule?: { sound?: string };
  achievements?: UserAchievement[];
};

type DailyPayload = RewardPayload & {
  streak?: { current_count?: number };
};

const fallbackSettings: EnergySettings = {
  organization_id: "",
  user_id: null,
  animations_enabled: true,
  sounds_enabled: true,
  sound_volume: 0.2,
  focus_mode: false,
  daily_motivation_enabled: true,
  large_celebrations_enabled: true
};

export const EnergyContext = createContext({
  settings: fallbackSettings,
  refresh: async () => {}
});

export function EnergyProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<EnergySettings>(fallbackSettings);
  const [toast, setToast] = useState<OrganizationEnergyEvent | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [firework, setFirework] = useState<OrganizationEnergyEvent | null>(null);
  const [achievement, setAchievement] = useState<UserAchievement | null>(null);
  const [daily, setDaily] = useState<OrganizationEnergyEvent | null>(null);
  const [dailyStreak, setDailyStreak] = useState(1);
  const [soundSignal, setSoundSignal] = useState<{ file: string; id: number } | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const play = useCallback((sound?: string | null) => {
    if (!sound) return;
    setSoundSignal({ file: sound, id: Date.now() });
  }, []);

  const showReward = useCallback((reward: RewardPayload | null | undefined) => {
    if (!reward?.event) return;

    const currentSettings = settingsRef.current;
    const event = reward.event;
    const sound = String(event.metadata?.sound ?? reward.rule?.sound ?? "");
    const animation = getAnimationForEvent(event.animation_type, currentSettings.focus_mode || !currentSettings.animations_enabled);
    const finalAnimation =
      animation === "fireworks" && !currentSettings.large_celebrations_enabled ? "badge" : animation;

    setToast(event);
    play(sound);

    if (!currentSettings.animations_enabled || currentSettings.focus_mode) {
      return;
    }

    if (finalAnimation === "confetti" || finalAnimation === "sparkle" || finalAnimation === "glow") {
      setConfettiKey((value) => value + 1);
    }

    if (finalAnimation === "fireworks") {
      setFirework(event);
    }

    const firstAchievement = reward.achievements?.[0];
    if (firstAchievement) {
      window.setTimeout(() => setAchievement(firstAchievement), finalAnimation === "fireworks" ? 900 : 280);
    }
  }, [play]);

  const processRewards = useCallback(async () => {
    const response = await fetch("/api/energy/process", { method: "POST" });
    if (!response.ok) return;
    const payload = await response.json() as { rewards?: RewardPayload[]; settings?: EnergySettings };
    if (payload.settings) setSettings((current) => ({ ...current, ...payload.settings }));
    for (const reward of payload.rewards ?? []) {
      showReward(reward);
    }
  }, [showReward]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const response = await fetch("/api/energy/daily-login", { method: "POST" });
      if (!response.ok || cancelled) return;
      const payload = await response.json() as { daily?: DailyPayload | null; settings?: EnergySettings };
      if (payload.settings) setSettings((current) => ({ ...current, ...payload.settings }));

      if (payload.daily?.event) {
        setDaily(payload.daily.event);
        setDailyStreak(Number(payload.daily.streak?.current_count ?? payload.daily.event.metadata?.streak_count ?? 1));
        showReward(payload.daily);
      }

      await processRewards();
    }

    void boot();
    const interval = window.setInterval(() => void processRewards(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [processRewards, showReward]);

  const context = useMemo(() => ({ settings, refresh: processRewards }), [settings, processRewards]);

  return (
    <EnergyContext.Provider value={context}>
      {children}
      <SoundManager sound={soundSignal?.file} playId={soundSignal?.id} settings={settings} />
      <EnergyToast event={toast} onDone={() => setToast(null)} />
      <ConfettiBurst key={confettiKey} active={confettiKey > 0 && settings.animations_enabled && !settings.focus_mode} />
      {settings.daily_motivation_enabled ? (
        <DailyMotivationCard event={daily} streakCount={dailyStreak} onClose={() => setDaily(null)} />
      ) : null}
      <FireworkCelebration event={firework} onDone={() => setFirework(null)} />
      <AchievementModal achievement={achievement} onClose={() => setAchievement(null)} />
    </EnergyContext.Provider>
  );
}
