import { getCurrentOrganization, getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StreakType, UserStreak } from "@/lib/types/core";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function previousDayKey(date: Date) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - 1);
  return dayKey(copy);
}

export async function updateLoginStreak() {
  return updateStreak("login");
}

export async function updateStreak(streakType: StreakType) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  if (!supabase || !user) return null;

  const now = new Date();
  const today = dayKey(now);
  const yesterday = previousDayKey(now);

  const { data: existing, error: existingError } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .eq("streak_type", streakType)
    .maybeSingle();

  if (existingError) throw existingError;

  const lastDay = existing?.last_active_at ? dayKey(new Date(existing.last_active_at)) : null;
  const currentCount =
    lastDay === today
      ? Number(existing?.current_count ?? 0)
      : lastDay === yesterday
        ? Number(existing?.current_count ?? 0) + 1
        : 1;
  const longestCount = Math.max(Number(existing?.longest_count ?? 0), currentCount);

  const patch = {
    organization_id: organization.id,
    user_id: user.id,
    streak_type: streakType,
    current_count: currentCount,
    longest_count: longestCount,
    last_active_at: now.toISOString()
  };

  const { data, error } = existing?.id
    ? await supabase.from("user_streaks").update(patch).eq("id", existing.id).select().single()
    : await supabase.from("user_streaks").insert(patch).select().single();

  if (error) throw error;
  return data as UserStreak;
}

export async function getUserStreaks() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  if (!supabase || !user) return [] as UserStreak[];

  const { data } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id);

  return (data ?? []) as UserStreak[];
}
