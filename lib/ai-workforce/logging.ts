import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";

export async function recordAIWorkforceEvent(input: {
  event_key: string;
  action: string;
  related_record_type: string;
  related_record_id?: string | null;
  after_data?: Record<string, unknown> | null;
  before_data?: Record<string, unknown> | null;
  payload?: Record<string, unknown>;
}) {
  await Promise.all([
    logAction({
      event_key: input.event_key,
      action: input.action,
      module: "ai_workforce",
      related_record_type: input.related_record_type,
      related_record_id: input.related_record_id ?? null,
      before_data: input.before_data ?? null,
      after_data: input.after_data ?? null
    }),
    emitEvent({
      event_key: input.event_key,
      module: "ai_workforce",
      payload: input.payload ?? { id: input.related_record_id }
    })
  ]);
}
