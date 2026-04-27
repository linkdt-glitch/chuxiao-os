import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import type { ActorType } from "@/lib/types/core";

export async function emitEvent(input: {
  event_key: string;
  event_source?: ActorType;
  actor_id?: string | null;
  actor_type?: ActorType;
  module: string;
  payload?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();

  const { error } = await supabase.from("system_events").insert({
    organization_id: organization.id,
    event_key: input.event_key,
    event_source: input.event_source ?? member.member_type,
    actor_id: input.actor_id ?? member.user_id ?? member.id,
    actor_type: input.actor_type ?? member.member_type,
    module: input.module,
    payload: input.payload ?? {},
    status: "new"
  });

  if (error) throw error;
  return { ok: true };
}

export async function markEventProcessed(eventId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { error } = await supabase
    .from("system_events")
    .update({ status: "processed" })
    .eq("id", eventId);

  if (error) throw error;
  return { ok: true };
}
