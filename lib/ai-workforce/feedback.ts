import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAIWorkforceEvent } from "@/lib/ai-workforce/logging";
import type { AIFeedbackRecord } from "@/lib/ai-workforce/types";

export async function createAIFeedback(input: {
  target_type: "agent_run" | "prompt_test_run" | "confirmation_request" | "ai_invocation" | "agent_output" | "prompt_run";
  target_id: string;
  rating?: number | null;
  is_useful?: boolean;
  is_correct?: boolean;
  is_adopted?: boolean;
  is_adopted_after_edit?: boolean;
  content?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const feedbackType =
    input.is_adopted_after_edit ? "edited" :
      input.is_adopted ? "accepted" :
        input.is_correct === false ? "incorrect" :
          input.is_correct ? "correct" :
            input.is_useful === false ? "not_useful" :
              input.is_useful ? "useful" : "other";

  const { data, error } = await supabase
    .from("feedback_records")
    .insert({
      organization_id: organization.id,
      target_type: input.target_type,
      target_id: input.target_id,
      module: "ai_workforce",
      rating: input.rating ?? null,
      feedback_type: feedbackType,
      content: input.content ?? null,
      created_by: member.id,
      actor_type: member.member_type,
      metadata: {
        is_useful: input.is_useful ?? null,
        is_correct: input.is_correct ?? null,
        is_adopted: input.is_adopted ?? null,
        is_adopted_after_edit: input.is_adopted_after_edit ?? null
      }
    })
    .select()
    .single();

  if (error) throw error;
  await recordAIWorkforceEvent({
    event_key: "ai_workforce.feedback.created",
    action: "create",
    related_record_type: "feedback_record",
    related_record_id: data.id,
    after_data: { target_type: input.target_type, target_id: input.target_id, rating: input.rating ?? null }
  });
  return data as AIFeedbackRecord;
}

export async function getFeedbackForTarget(targetType: string, targetId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("feedback_records")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AIFeedbackRecord[];
}
