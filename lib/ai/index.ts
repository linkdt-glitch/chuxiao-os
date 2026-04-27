import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { demoProviders } from "@/lib/data/demo";

export async function getActiveProvider() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoProviders.find((provider) => provider.is_active) ?? demoProviders[0];

  const { data } = await supabase
    .from("ai_providers")
    .select("id, organization_id, provider_name, label, base_url, model_name, is_active, created_at, updated_at")
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  return data ?? demoProviders[0];
}

export async function logAIInvocation(input: {
  provider_id?: string | null;
  module: string;
  prompt_preview?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_estimate?: number;
  status: "success" | "failed";
  error_message?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();

  const { data, error } = await supabase
    .from("ai_invocation_logs")
    .insert({
      organization_id: organization.id,
      provider_id: input.provider_id,
      invoked_by: member.user_id ?? member.agent_id ?? member.id,
      invoked_by_type: member.member_type,
      module: input.module,
      prompt_preview: input.prompt_preview,
      input_tokens: input.input_tokens ?? 0,
      output_tokens: input.output_tokens ?? 0,
      cost_estimate: input.cost_estimate ?? 0,
      status: input.status,
      error_message: input.error_message
    })
    .select("id")
    .single();

  if (error) throw error;
  return { ok: true, id: data?.id as string | undefined };
}

export async function invokeAI(input: { module: string; prompt: string }) {
  const provider = await getActiveProvider();
  const invocation = await logAIInvocation({
    provider_id: provider.id,
    module: input.module,
    prompt_preview: input.prompt.slice(0, 500),
    status: "success"
  });
  return {
    provider,
    invocationLogId: "id" in invocation ? invocation.id : undefined,
    text: "AI Provider interface reserved. Real model execution can be plugged in here."
  };
}
