import { logAction } from "@/lib/audit";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FeedbackType, ImprovementStatus, ReviewType, RiskLevel, SopStatus, TargetType } from "@/lib/types/core";

export async function createFeedback(input: {
  target_type: TargetType;
  target_id?: string | null;
  module?: string | null;
  rating?: number | null;
  feedback_type: FeedbackType;
  content?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  const actorId = member.user_id ?? member.agent_id ?? member.id;

  const { data, error } = await supabase
    .from("feedback_records")
    .insert({
      organization_id: organization.id,
      target_type: input.target_type,
      target_id: input.target_id || null,
      module: input.module || null,
      rating: input.rating,
      feedback_type: input.feedback_type,
      content: input.content,
      created_by: member.id,
      actor_type: member.member_type,
      metadata: {}
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({ actor_id: actorId, actor_type: member.member_type, event_key: "evolution.feedback.created", action: "create", module: "evolution", related_record_type: "feedback_record", related_record_id: data.id, after_data: { target_type: input.target_type, feedback_type: input.feedback_type } });
  await emitEvent({ event_key: "evolution.feedback.created", module: "evolution", actor_id: actorId, actor_type: member.member_type, payload: { id: data.id, target_type: input.target_type } });
  return data;
}

export async function createReview(input: {
  review_type: ReviewType;
  related_module?: string | null;
  title: string;
  summary?: string | null;
  what_worked?: string | null;
  what_failed?: string | null;
  lessons_learned?: string | null;
  next_actions?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  const actorId = member.user_id ?? member.agent_id ?? member.id;

  const { data, error } = await supabase
    .from("review_records")
    .insert({
      organization_id: organization.id,
      review_type: input.review_type,
      related_module: input.related_module || null,
      title: input.title,
      summary: input.summary,
      what_worked: input.what_worked,
      what_failed: input.what_failed,
      lessons_learned: input.lessons_learned,
      next_actions: input.next_actions,
      created_by: member.id
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({ actor_id: actorId, actor_type: member.member_type, event_key: "evolution.review.created", action: "create", module: "evolution", related_record_type: "review_record", related_record_id: data.id, after_data: { title: input.title, review_type: input.review_type } });
  await emitEvent({ event_key: "evolution.review.created", module: "evolution", actor_id: actorId, actor_type: member.member_type, payload: { id: data.id, title: input.title } });
  return data;
}

export async function updateReview(id: string, patch: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };
  const member = await getCurrentMember();
  const actorId = member.user_id ?? member.agent_id ?? member.id;
  const { error } = await supabase.from("review_records").update(patch).eq("id", id);
  if (error) throw error;
  await logAction({ actor_id: actorId, actor_type: member.member_type, event_key: "evolution.review.updated", action: "update", module: "evolution", related_record_type: "review_record", related_record_id: id, after_data: patch });
  await emitEvent({ event_key: "evolution.review.updated", module: "evolution", actor_id: actorId, actor_type: member.member_type, payload: { id } });
  return { ok: true };
}

export async function createSop(input: {
  title: string;
  description?: string | null;
  scenario?: string | null;
  steps?: string[];
  related_module?: string | null;
  version?: string | null;
  status?: SopStatus;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  const actorId = member.user_id ?? member.agent_id ?? member.id;

  const { data, error } = await supabase
    .from("sop_records")
    .insert({
      organization_id: organization.id,
      title: input.title,
      description: input.description,
      scenario: input.scenario,
      steps: input.steps ?? [],
      related_module: input.related_module || null,
      version: input.version || "1.0",
      status: input.status ?? "draft",
      owner_id: member.id,
      created_by: member.id
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({ actor_id: actorId, actor_type: member.member_type, event_key: "knowledge.sop.created", action: "create", module: "knowledge", related_record_type: "sop_record", related_record_id: data.id, after_data: { title: input.title } });
  await emitEvent({ event_key: "knowledge.sop.created", module: "knowledge", actor_id: actorId, actor_type: member.member_type, payload: { id: data.id, title: input.title } });
  return data;
}

export async function updateSop(id: string, patch: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };
  const member = await getCurrentMember();
  const actorId = member.user_id ?? member.agent_id ?? member.id;
  const { error } = await supabase.from("sop_records").update(patch).eq("id", id);
  if (error) throw error;
  await logAction({ actor_id: actorId, actor_type: member.member_type, event_key: "knowledge.sop.updated", action: "update", module: "knowledge", related_record_type: "sop_record", related_record_id: id, after_data: patch });
  await emitEvent({ event_key: "knowledge.sop.updated", module: "knowledge", actor_id: actorId, actor_type: member.member_type, payload: { id } });
  return { ok: true };
}

export async function createImprovement(input: {
  suggestion_type: string;
  related_module?: string | null;
  title: string;
  description?: string | null;
  impact_level?: RiskLevel;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  const actorId = member.user_id ?? member.agent_id ?? member.id;

  const { data, error } = await supabase
    .from("improvement_suggestions")
    .insert({
      organization_id: organization.id,
      suggestion_type: input.suggestion_type,
      related_module: input.related_module || null,
      title: input.title,
      description: input.description,
      impact_level: input.impact_level ?? "medium",
      status: "new",
      suggested_by_type: member.member_type,
      suggested_by: actorId,
      metadata: {}
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({ actor_id: actorId, actor_type: member.member_type, event_key: "evolution.improvement.created", action: "create", module: "evolution", related_record_type: "improvement_suggestion", related_record_id: data.id, after_data: { title: input.title, impact_level: input.impact_level ?? "medium" } });
  await emitEvent({ event_key: "evolution.improvement.created", module: "evolution", actor_id: actorId, actor_type: member.member_type, payload: { id: data.id, title: input.title } });
  return data;
}

export async function changeImprovementStatus(id: string, status: ImprovementStatus) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };
  const member = await getCurrentMember();
  const actorId = member.user_id ?? member.agent_id ?? member.id;
  const { error } = await supabase.from("improvement_suggestions").update({ status }).eq("id", id);
  if (error) throw error;
  await logAction({ actor_id: actorId, actor_type: member.member_type, event_key: "evolution.improvement.status_changed", action: "status_changed", module: "evolution", related_record_type: "improvement_suggestion", related_record_id: id, after_data: { status } });
  await emitEvent({ event_key: "evolution.improvement.status_changed", module: "evolution", actor_id: actorId, actor_type: member.member_type, payload: { id, status } });
  return { ok: true };
}
