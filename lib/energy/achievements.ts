import { getCurrentMember, getCurrentOrganization, getSessionUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AchievementBadge,
  OrganizationEnergyEvent,
  UserAchievement,
  UserStreak
} from "@/lib/types/core";

type BadgeWithCondition = AchievementBadge & {
  condition: {
    event_key?: string;
    count?: number;
    status?: string[];
    streak_type?: string;
    type?: string;
  };
};

export async function getAchievementBadges() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [] as AchievementBadge[];

  const { data } = await supabase
    .from("achievement_badges")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("energy_points");

  return (data ?? []) as AchievementBadge[];
}

export async function getUserAchievements() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  if (!supabase || !user) return [] as UserAchievement[];

  const { data } = await supabase
    .from("user_achievements")
    .select("*, achievement_badges(*)")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  return (data ?? []).map((item) => ({
    ...item,
    badge: Array.isArray(item.achievement_badges)
      ? item.achievement_badges[0]
      : item.achievement_badges
  })) as UserAchievement[];
}

async function hasBadge(badgeId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return true;

  const { data } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .eq("achievement_badge_id", badgeId)
    .maybeSingle();

  return Boolean(data?.id);
}

async function getUserEventCount(eventKey: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return 0;

  const { count } = await supabase
    .from("organization_energy_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .eq("event_key", eventKey);

  return count ?? 0;
}

async function closedLoopReady() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return false;

  const [
    { count: feedbackCount },
    { count: reviewCount },
    { count: sopCount },
    { count: improvementCount }
  ] = await Promise.all([
    supabase.from("feedback_records").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
    supabase.from("review_records").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
    supabase.from("sop_records").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
    supabase
      .from("improvement_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .in("status", ["accepted", "done"])
  ]);

  return Boolean(feedbackCount && reviewCount && sopCount && improvementCount);
}

async function awardBadge(input: {
  badge: AchievementBadge;
  userId: string;
  energyEvent?: OrganizationEnergyEvent | null;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_achievements")
    .insert({
      organization_id: organization.id,
      user_id: input.userId,
      achievement_badge_id: input.badge.id,
      related_module: input.energyEvent?.source_module ?? null,
      related_record_type: input.energyEvent?.source_record_type ?? null,
      related_record_id: input.energyEvent?.source_record_id ?? null,
      metadata: {
        energy_event_id: input.energyEvent?.id,
        badge_key: input.badge.key
      }
    })
    .select("*, achievement_badges(*)")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  await logAction({
    actor_id: member.user_id ?? member.id,
    actor_type: member.member_type,
    event_key: "energy.achievement.awarded",
    action: "award",
    module: "energy",
    related_record_type: "achievement_badge",
    related_record_id: input.badge.id,
    after_data: { badge_key: input.badge.key, user_id: input.userId }
  });
  await emitEvent({
    event_key: "energy.achievement.awarded",
    module: "energy",
    actor_id: member.user_id ?? member.id,
    actor_type: member.member_type,
    payload: { badge_key: input.badge.key, user_id: input.userId }
  });

  return {
    ...data,
    badge: Array.isArray(data.achievement_badges)
      ? data.achievement_badges[0]
      : data.achievement_badges
  } as UserAchievement;
}

export async function checkAndAwardAchievements(input: {
  energyEvent?: OrganizationEnergyEvent | null;
  streak?: UserStreak | null;
}) {
  const user = await getSessionUser();
  if (!user) return [] as UserAchievement[];

  const userId = input.energyEvent?.user_id ?? input.streak?.user_id ?? user.id;
  if (userId !== user.id) return [] as UserAchievement[];

  const badges = (await getAchievementBadges()) as BadgeWithCondition[];
  const awarded: UserAchievement[] = [];

  for (const badge of badges) {
    if (await hasBadge(badge.id, userId)) continue;

    const condition = badge.condition ?? {};
    let qualified = false;

    if (condition.event_key && input.energyEvent?.event_key === condition.event_key) {
      const count = await getUserEventCount(condition.event_key, userId);
      qualified = count >= Number(condition.count ?? 1);

      if (condition.status?.length) {
        const status = String(input.energyEvent?.metadata?.status ?? "");
        qualified = qualified && condition.status.includes(status);
      }
    }

    if (condition.streak_type && input.streak?.streak_type === condition.streak_type) {
      qualified = input.streak.current_count >= Number(condition.count ?? 1);
    }

    if (condition.type === "closed_loop") {
      qualified = await closedLoopReady();
    }

    if (!qualified) continue;

    const newAchievement = await awardBadge({
      badge,
      userId,
      energyEvent: input.energyEvent
    });
    if (newAchievement) awarded.push(newAchievement);
  }

  return awarded;
}
