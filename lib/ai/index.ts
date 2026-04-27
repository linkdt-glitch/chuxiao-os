import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { demoProviders } from "@/lib/data/demo";
import type { AIProvider } from "@/lib/types/core";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

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

type OpenAICompatibleProviderName = "deepseek" | "siliconflow";

function getProviderConfig(provider: AIProvider) {
  if (provider.provider_name === "siliconflow") {
    return {
      displayName: "SiliconFlow",
      apiKey: process.env.SILICONFLOW_API_KEY ?? "",
      baseUrl: provider.base_url ?? process.env.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.cn/v1",
      model: provider.model_name || process.env.SILICONFLOW_MODEL || "deepseek-ai/DeepSeek-V3",
      missingKeyMessage: "Missing SILICONFLOW_API_KEY"
    };
  }

  return {
    displayName: "DeepSeek",
    apiKey: process.env.DEEPSEEK_API_KEY ?? process.env.SPEEK_V4_API_KEY ?? "",
    baseUrl: provider.base_url ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    model: provider.model_name || process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    missingKeyMessage: "Missing DEEPSEEK_API_KEY"
  };
}

async function invokeOpenAICompatible(input: { provider: AIProvider & { provider_name: OpenAICompatibleProviderName }; module: string; prompt: string }) {
  const config = getProviderConfig(input.provider);
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  if (!config.apiKey) {
    const invocation = await logAIInvocation({
      provider_id: input.provider.id,
      module: input.module,
      prompt_preview: input.prompt.slice(0, 500),
      status: "failed",
      error_message: config.missingKeyMessage
    });
    return {
      provider: input.provider,
      invocationLogId: "id" in invocation ? invocation.id : undefined,
      text: `${config.displayName} API Key 未配置。请在服务端环境变量中设置对应 API Key。`
    };
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "You are the AI engine inside 初晓 OS 系统. Return concise, structured, business-safe answers."
          },
          { role: "user", content: input.prompt }
        ],
        temperature: 0.2
      })
    });

    const payload = (await response.json().catch(() => ({}))) as ChatCompletionResponse & {
      error?: { message?: string };
    };

    if (!response.ok) {
      const message = payload.error?.message ?? `${config.displayName} request failed: ${response.status}`;
      const invocation = await logAIInvocation({
        provider_id: input.provider.id,
        module: input.module,
        prompt_preview: input.prompt.slice(0, 500),
        status: "failed",
        error_message: message
      });
      return {
        provider: input.provider,
        invocationLogId: "id" in invocation ? invocation.id : undefined,
        text: `${config.displayName} 调用失败：${message}`
      };
    }

    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const invocation = await logAIInvocation({
      provider_id: input.provider.id,
      module: input.module,
      prompt_preview: input.prompt.slice(0, 500),
      input_tokens: payload.usage?.prompt_tokens ?? 0,
      output_tokens: payload.usage?.completion_tokens ?? 0,
      status: "success"
    });

    return {
      provider: input.provider,
      invocationLogId: "id" in invocation ? invocation.id : undefined,
      text
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unknown ${config.displayName} error`;
    const invocation = await logAIInvocation({
      provider_id: input.provider.id,
      module: input.module,
      prompt_preview: input.prompt.slice(0, 500),
      status: "failed",
      error_message: message
    });
    return {
      provider: input.provider,
      invocationLogId: "id" in invocation ? invocation.id : undefined,
      text: `${config.displayName} 调用失败：${message}`
    };
  }
}

export async function invokeAI(input: { module: string; prompt: string }) {
  const provider = await getActiveProvider();
  if (provider.provider_name === "deepseek" || provider.provider_name === "siliconflow") {
    return invokeOpenAICompatible({
      provider: provider as AIProvider & { provider_name: OpenAICompatibleProviderName },
      module: input.module,
      prompt: input.prompt
    });
  }

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
