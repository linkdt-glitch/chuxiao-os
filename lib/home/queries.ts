import { getCurrentOrganization } from "@/lib/auth";
import { DEFAULT_HOME_CONTENT, type HomeContent, type HomeGoal, type HomeValue } from "@/lib/home/types";

export async function getHomeContent(): Promise<HomeContent> {
  const organization = await getCurrentOrganization();
  const settings = (organization.settings ?? {}) as Record<string, unknown>;
  const home = (settings.home ?? {}) as Partial<HomeContent>;
  const announcements = Array.isArray(settings.announcements)
    ? (settings.announcements as string[])
    : [];

  return {
    mission: typeof home.mission === "string" && home.mission.trim() ? home.mission : DEFAULT_HOME_CONTENT.mission,
    vision: typeof home.vision === "string" && home.vision.trim() ? home.vision : DEFAULT_HOME_CONTENT.vision,
    values: Array.isArray(home.values) && home.values.length
      ? (home.values as HomeValue[])
      : DEFAULT_HOME_CONTENT.values,
    goals: Array.isArray(home.goals) ? (home.goals as HomeGoal[]) : DEFAULT_HOME_CONTENT.goals,
    announcements: announcements.length ? announcements : DEFAULT_HOME_CONTENT.announcements
  };
}
