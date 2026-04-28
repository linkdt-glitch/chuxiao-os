import type { EnergyAnimationType } from "@/lib/types/core";

export function getAnimationForEvent(animationType: EnergyAnimationType, focusMode?: boolean): EnergyAnimationType {
  if (focusMode) return "toast";
  return animationType;
}

export function triggerCelebration(animationType: EnergyAnimationType) {
  if (animationType === "fireworks") return "major";
  if (animationType === "badge" || animationType === "flywheel" || animationType === "glow") return "milestone";
  if (animationType === "confetti" || animationType === "sparkle") return "micro";
  return "quiet";
}
