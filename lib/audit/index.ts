import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import type { ActorType } from "@/lib/types/core";

export async function logAction(input: {
  actor_id?: string | null;
  actor_type?: ActorType;
  event_key: string;
  action: string;
  module: string;
  related_record_type?: string | null;
  related_record_id?: string | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organization.id,
    actor_id: input.actor_id ?? member.user_id ?? member.id,
    actor_type: input.actor_type ?? member.member_type,
    event_key: input.event_key,
    action: input.action,
    module: input.module,
    related_record_type: input.related_record_type,
    related_record_id: input.related_record_id,
    before_data: input.before_data,
    after_data: input.after_data
  });

  if (error) throw error;
  return { ok: true };
}
