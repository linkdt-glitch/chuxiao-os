import { getCurrentMember, getCurrentOrganization, getSessionUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  EnergyAnimationType,
  OrganizationEnergyEvent,
  SystemEvent,
  UserAchievement
} from "@/lib/types/core";
import { checkAndAwardAchievements } from "./achievements";
import { updateLoginStreak, updateStreak } from "./streaks";

export type EnergyRewardRule = {
  canonicalKey: string;
  eventKeys: string[];
  sourceModule: string;
  sourceRecordType?: string;
  energyPoints: number;
  animationType: EnergyAnimationType;
  message: string;
  sound: string;
  feedbackLevel: 1 | 3 | 4;
  acceptedStatuses?: string[];
};

export const ENERGY_REWARD_RULES: EnergyRewardRule[] = [
  {
    canonicalKey: "finance.record.created",
    eventKeys: ["finance.record.created"],
    sourceModule: "finance",
    sourceRecordType: "finance_record",
    energyPoints: 1,
    animationType: "confetti",
    message: "记账完成，经营数据更清晰了一点。",
    sound: "success_ping.mp3",
    feedbackLevel: 1
  },
  {
    canonicalKey: "finance.ai_confirmed",
    eventKeys: ["finance.ai_confirmed"],
    sourceModule: "finance",
    sourceRecordType: "finance_record",
    energyPoints: 1,
    animationType: "sparkle",
    message: "AI 记账已确认，经营能量 +1。",
    sound: "success_ping.mp3",
    feedbackLevel: 1
  },
  {
    canonicalKey: "finance.exported",
    eventKeys: ["finance.exported"],
    sourceModule: "finance",
    sourceRecordType: "finance_export",
    energyPoints: 3,
    animationType: "badge",
    message: "财务表格已导出，经营记忆已归档。",
    sound: "badge_unlock.mp3",
    feedbackLevel: 3
  },
  {
    canonicalKey: "finance.month_closed",
    eventKeys: ["finance.month_closed"],
    sourceModule: "finance",
    sourceRecordType: "finance_month_close",
    energyPoints: 10,
    animationType: "fireworks",
    message: "月度财务归档完成，经营记忆已沉淀。",
    sound: "firework_soft.mp3",
    feedbackLevel: 4
  },
  {
    canonicalKey: "tasks.completed",
    eventKeys: ["tasks.completed"],
    sourceModule: "projects",
    sourceRecordType: "task",
    energyPoints: 2,
    animationType: "sparkle",
    message: "任务完成，目标又向前推进了一步。",
    sound: "success_ping.mp3",
    feedbackLevel: 1
  },
  {
    canonicalKey: "projects.completed",
    eventKeys: ["projects.completed"],
    sourceModule: "projects",
    sourceRecordType: "project",
    energyPoints: 20,
    animationType: "fireworks",
    message: "项目完成！从计划到结果，组织飞轮完成了一次推进。",
    sound: "firework_soft.mp3",
    feedbackLevel: 4
  },
  {
    canonicalKey: "projects.reviewed",
    eventKeys: ["projects.reviewed"],
    sourceModule: "projects",
    sourceRecordType: "project_review",
    energyPoints: 8,
    animationType: "flywheel",
    message: "复盘完成，经验已进入成长飞轮。",
    sound: "badge_unlock.mp3",
    feedbackLevel: 3
  },
  {
    canonicalKey: "ai_workforce.agent.created",
    eventKeys: ["ai_workforce.agent.created", "agent.created"],
    sourceModule: "ai_workforce",
    sourceRecordType: "agent",
    energyPoints: 5,
    animationType: "glow",
    message: "新的数字同事已上线。",
    sound: "badge_unlock.mp3",
    feedbackLevel: 3
  },
  {
    canonicalKey: "ai_workforce.prompt.published",
    eventKeys: ["ai_workforce.prompt.published"],
    sourceModule: "ai_workforce",
    sourceRecordType: "prompt_template",
    energyPoints: 5,
    animationType: "badge",
    message: "Prompt 已发布，AI 工作方法沉淀为组织资产。",
    sound: "badge_unlock.mp3",
    feedbackLevel: 3
  },
  {
    canonicalKey: "ai_workforce.agent_run.completed",
    eventKeys: ["ai_workforce.agent_run.completed"],
    sourceModule: "ai_workforce",
    sourceRecordType: "agent_run_log",
    energyPoints: 3,
    animationType: "glow",
    message: "Agent 运行完成，数字劳动力贡献了一次价值。",
    sound: "success_ping.mp3",
    feedbackLevel: 1
  },
  {
    canonicalKey: "knowledge.asset.created",
    eventKeys: ["knowledge.asset.created", "knowledge.asset.updated", "file.uploaded"],
    sourceModule: "knowledge",
    sourceRecordType: "file",
    energyPoints: 2,
    animationType: "confetti",
    message: "文件已归档，组织记忆增加了一份。",
    sound: "success_ping.mp3",
    feedbackLevel: 1
  },
  {
    canonicalKey: "sop.created",
    eventKeys: ["sop.created", "knowledge.sop.created"],
    sourceModule: "knowledge",
    sourceRecordType: "sop_record",
    energyPoints: 10,
    animationType: "badge",
    message: "SOP 已创建，经验开始变得可复制。",
    sound: "badge_unlock.mp3",
    feedbackLevel: 3
  },
  {
    canonicalKey: "review.created",
    eventKeys: ["review.created", "evolution.review.created"],
    sourceModule: "evolution",
    sourceRecordType: "review_record",
    energyPoints: 8,
    animationType: "flywheel",
    message: "复盘完成，经验已进入成长飞轮。",
    sound: "badge_unlock.mp3",
    feedbackLevel: 3
  },
  {
    canonicalKey: "improvement.status_changed",
    eventKeys: ["improvement.status_changed", "evolution.improvement.status_changed"],
    sourceModule: "evolution",
    sourceRecordType: "improvement_suggestion",
    energyPoints: 10,
    animationType: "glow",
    message: "优化建议已采纳，组织流程正在升级。",
    sound: "system_upgrade.mp3",
    feedbackLevel: 3,
    acceptedStatuses: ["accepted", "done"]
  },
  {
    canonicalKey: "daily.login",
    eventKeys: ["daily.login"],
    sourceModule: "energy",
    sourceRecordType: "daily_login",
    energyPoints: 1,
    animationType: "glow",
    message: "今天让飞轮再转动一点。",
    sound: "morning_chime.mp3",
    feedbackLevel: 1
  }
];

export const rewardEventKeys = Array.from(
  new Set(ENERGY_REWARD_RULES.flatMap((rule) => rule.eventKeys))
);

export type EnergyRewardResult = {
  event: OrganizationEnergyEvent;
  rule: EnergyRewardRule;
  achievements: UserAchievement[];
};

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getRule(eventKey: string, payload?: Record<string, unknown>) {
  const rule = ENERGY_REWARD_RULES.find((item) => item.eventKeys.includes(eventKey));
  if (!rule) return null;

  if (rule.acceptedStatuses?.length) {
    const status = String(payload?.status ?? "");
    if (!rule.acceptedStatuses.includes(status)) return null;
  }

  return rule;
}

function getSourceRecordId(payload?: Record<string, unknown>) {
  const candidates = [
    payload?.related_record_id,
    payload?.record_id,
    payload?.project_id,
    payload?.task_id,
    payload?.file_id,
    payload?.id
  ];
  return candidates.find(isUuid) ?? null;
}

async function limitAnimation(rule: EnergyRewardRule, organizationId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return rule.animationType;

  if (rule.feedbackLevel === 4) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("organization_energy_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("animation_type", "fireworks")
      .gte("created_at", today.toISOString());

    return (count ?? 0) >= 3 ? "badge" : rule.animationType;
  }

  if (rule.feedbackLevel === 1) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("organization_energy_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("event_key", rule.canonicalKey)
      .gte("created_at", since);

    return (count ?? 0) >= 3 ? "toast" : rule.animationType;
  }

  return rule.animationType;
}

export async function createEnergyEvent(input: {
  event_key: string;
  source_event_id?: string | null;
  source_module?: string | null;
  source_record_type?: string | null;
  source_record_id?: string | null;
  user_id?: string | null;
  energy_points: number;
  animation_type: EnergyAnimationType;
  message?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("organization_energy_events")
    .insert({
      organization_id: organization.id,
      user_id: input.user_id ?? user?.id ?? null,
      source_event_id: input.source_event_id ?? null,
      event_key: input.event_key,
      source_module: input.source_module ?? null,
      source_record_type: input.source_record_type ?? null,
      source_record_id: input.source_record_id ?? null,
      energy_points: input.energy_points,
      animation_type: input.animation_type,
      message: input.message ?? null,
      metadata: input.metadata ?? {}
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  return data as OrganizationEnergyEvent;
}

export async function handleSystemEventReward(systemEvent: SystemEvent): Promise<EnergyRewardResult | null> {
  const organization = await getCurrentOrganization();
  const rule = getRule(systemEvent.event_key, systemEvent.payload);
  if (!rule) return null;

  const animationType = await limitAnimation(rule, organization.id);
  const energyEvent = await createEnergyEvent({
    event_key: rule.canonicalKey,
    source_event_id: systemEvent.id,
    source_module: rule.sourceModule ?? systemEvent.module,
    source_record_type: String(systemEvent.payload?.related_record_type ?? rule.sourceRecordType ?? ""),
    source_record_id: getSourceRecordId(systemEvent.payload),
    user_id: isUuid(systemEvent.actor_id) ? systemEvent.actor_id : null,
    energy_points: rule.energyPoints,
    animation_type: animationType,
    message: rule.message,
    metadata: {
      source_event_key: systemEvent.event_key,
      sound: rule.sound,
      feedback_level: rule.feedbackLevel,
      status: systemEvent.payload?.status
    }
  });

  if (!energyEvent) return null;

  if (rule.canonicalKey === "finance.record.created") await updateStreak("bookkeeping");
  if (rule.canonicalKey === "tasks.completed") await updateStreak("task_completion");
  if (rule.canonicalKey === "review.created" || rule.canonicalKey === "projects.reviewed") await updateStreak("review");

  const achievements = await checkAndAwardAchievements({ energyEvent });
  return { event: energyEvent, rule, achievements };
}

export async function handleRecentSystemEventRewards(limit = 20) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  if (!supabase || !user) return [] as EnergyRewardResult[];

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString();
  const { data, error } = await supabase
    .from("system_events")
    .select("*")
    .eq("organization_id", organization.id)
    .in("event_key", rewardEventKeys)
    .gte("created_at", since)
    .or(`actor_id.is.null,actor_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const results: EnergyRewardResult[] = [];
  for (const event of [...(data ?? [])].reverse()) {
    const result = await handleSystemEventReward(event as SystemEvent);
    if (result) results.push(result);
  }

  return results;
}

export async function createDailyLoginEnergyEvent() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  const member = await getCurrentMember();
  if (!supabase || !user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("organization_energy_events")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .eq("event_key", "daily.login")
    .eq("metadata->>date", today)
    .maybeSingle();

  if (existing?.id) return null;

  const streak = await updateLoginStreak();
  const rule = ENERGY_REWARD_RULES.find((item) => item.canonicalKey === "daily.login")!;
  const animationType = await limitAnimation(rule, organization.id);
  const event = await createEnergyEvent({
    event_key: rule.canonicalKey,
    source_module: "energy",
    source_record_type: "daily_login",
    user_id: user.id,
    energy_points: rule.energyPoints,
    animation_type: animationType,
    message: rule.message,
    metadata: {
      date: today,
      sound: rule.sound,
      feedback_level: rule.feedbackLevel,
      streak_count: streak?.current_count ?? 1
    }
  });

  if (!event) return null;

  await logAction({
    actor_id: member.user_id ?? member.id,
    actor_type: member.member_type,
    event_key: "energy.daily_login.completed",
    action: "complete",
    module: "energy",
    related_record_type: "organization_energy_event",
    related_record_id: event.id,
    after_data: { date: today, energy_points: rule.energyPoints }
  });
  await emitEvent({
    event_key: "energy.daily_login.completed",
    module: "energy",
    actor_id: member.user_id ?? member.id,
    actor_type: member.member_type,
    payload: { date: today, energy_event_id: event.id }
  });

  const achievements = await checkAndAwardAchievements({ energyEvent: event, streak });
  return { event, rule, achievements, streak };
}

export async function getRecentEnergyEvents(limit = 12) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [] as OrganizationEnergyEvent[];

  const { data } = await supabase
    .from("organization_energy_events")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as OrganizationEnergyEvent[];
}

export async function getEnergySummary() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const user = await getSessionUser();
  if (!supabase) {
    return { today: 0, week: 0, month: 0, mine: 0 };
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7));
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [today, week, month, mine] = await Promise.all([
    sumEnergy(organization.id, startOfToday),
    sumEnergy(organization.id, startOfWeek),
    sumEnergy(organization.id, startOfMonth),
    user ? sumEnergy(organization.id, startOfMonth, user.id) : Promise.resolve(0)
  ]);

  return { today, week, month, mine };
}

async function sumEnergy(organizationId: string, since: Date, userId?: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return 0;

  let query = supabase
    .from("organization_energy_events")
    .select("energy_points")
    .eq("organization_id", organizationId)
    .gte("created_at", since.toISOString());

  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;

  return (data ?? []).reduce((sum, item) => sum + Number(item.energy_points ?? 0), 0);
}
