import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { demoProviders } from "@/lib/data/demo";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { requirePermission } from "@/lib/permissions";
import type { AIProvider } from "@/lib/types/core";
import {
  FAST_PARSE_MODEL,
  FOUNDER_CHAT_MODEL,
  STANDARD_CHAT_MODEL,
  VISION_MODEL,
  estimateCostCny
} from "./models-catalog";

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export type AIImageInput = {
  mime_type: string;
  data_base64: string;
  file_name?: string;
};

type AIInvokeOptions = {
  module: string;
  prompt: string;
  images?: AIImageInput[];
  maxTokens?: number;
  timeoutMs?: number;
  temperature?: number;
  responseFormat?: "json";
  /**
   * 用户角色 key（owner/admin/manager/member）。
   * 当 module === "ai_chat" 且 roleKey === "owner" 时，
   * 自动升级到 FOUNDER_CHAT_MODEL（DeepSeek-R1 深度思考）。
   * 其他模块或未传时走 STANDARD_CHAT_MODEL。
   */
  roleKey?: string | null;
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

export async function activateAIProvider(providerId: string) {
  await requirePermission("ai.manage");
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data: provider, error: providerError } = await supabase
    .from("ai_providers")
    .select("id, provider_name, label, is_active")
    .eq("organization_id", organization.id)
    .eq("id", providerId)
    .single();

  if (providerError) throw providerError;

  const { error: disableError } = await supabase
    .from("ai_providers")
    .update({ is_active: false })
    .eq("organization_id", organization.id);
  if (disableError) throw disableError;

  const { data, error } = await supabase
    .from("ai_providers")
    .update({ is_active: true })
    .eq("organization_id", organization.id)
    .eq("id", providerId)
    .select("id, provider_name, label, is_active")
    .single();

  if (error) throw error;

  await logAction({
    event_key: "ai.provider.activated",
    action: "update",
    module: "ai_settings",
    related_record_type: "ai_provider",
    related_record_id: providerId,
    before_data: provider,
    after_data: data
  });
  await emitEvent({
    event_key: "ai.provider.activated",
    module: "ai_settings",
    payload: { provider_id: providerId, provider_name: data.provider_name }
  });

  return data;
}

export async function disableAIProvider(providerId: string) {
  await requirePermission("ai.manage");
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data: provider, error: providerError } = await supabase
    .from("ai_providers")
    .select("id, provider_name, label, is_active")
    .eq("organization_id", organization.id)
    .eq("id", providerId)
    .single();
  if (providerError) throw providerError;

  const { data, error } = await supabase
    .from("ai_providers")
    .update({ is_active: false })
    .eq("organization_id", organization.id)
    .eq("id", providerId)
    .select("id, provider_name, label, is_active")
    .single();

  if (error) throw error;

  await logAction({
    event_key: "ai.provider.disabled",
    action: "update",
    module: "ai_settings",
    related_record_type: "ai_provider",
    related_record_id: providerId,
    before_data: provider,
    after_data: data
  });
  await emitEvent({
    event_key: "ai.provider.disabled",
    module: "ai_settings",
    payload: { provider_id: providerId, provider_name: data.provider_name }
  });

  return data;
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

function numberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * SiliconFlow 推荐模型组合（2026 最新最优，按用途 + 角色分）
 *
 *   FAST    Qwen/Qwen2.5-7B-Instruct        极速短任务（一句话记账解析）首字节 <300ms
 *   CHAT    deepseek-ai/DeepSeek-V3.1       员工日常对话，性价比之王
 *   FOUNDER deepseek-ai/DeepSeek-R1         🧠 创始人专属，671B 顶级推理（对标 o1）
 *   VISION  Qwen/Qwen2.5-VL-7B-Instruct     拍照识别票据，比 72B 快 5-10×
 *   DEFAULT deepseek-ai/DeepSeek-V3.1       通用 fallback
 *
 * 模型 id + 价格的单一来源在 lib/ai/models-catalog.ts 里。
 * 用户可在 Render 环境变量里覆盖：
 *   SILICONFLOW_FOUNDER_CHAT_MODEL  → 创始人对话用（默认 DeepSeek-R1）
 *   SILICONFLOW_CHAT_MODEL          → 员工对话用（默认 DeepSeek-V3.1）
 *   SILICONFLOW_FAST_MODEL          → AI 解析用
 *   SILICONFLOW_VISION_MODEL        → 拍照识别用
 */
function modelForModule(
  provider: AIProvider,
  module: string,
  hasImages = false,
  roleKey?: string | null
) {
  if (provider.provider_name === "siliconflow") {
    if (hasImages) {
      return process.env.SILICONFLOW_VISION_MODEL || VISION_MODEL.id;
    }
    if (module.startsWith("finance.ai_parse")) {
      return process.env.SILICONFLOW_FAST_MODEL || FAST_PARSE_MODEL.id;
    }
    if (module === "ai_chat") {
      // 创始人 / 老板 → 顶级推理模型；其他人 → 平衡型
      if (roleKey === "owner") {
        return process.env.SILICONFLOW_FOUNDER_CHAT_MODEL || FOUNDER_CHAT_MODEL.id;
      }
      return process.env.SILICONFLOW_CHAT_MODEL || STANDARD_CHAT_MODEL.id;
    }
    return provider.model_name || process.env.SILICONFLOW_MODEL || STANDARD_CHAT_MODEL.id;
  }

  if (module.startsWith("finance.ai_parse")) return process.env.DEEPSEEK_FAST_MODEL || provider.model_name || process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  if (module === "ai_chat") {
    if (roleKey === "owner") {
      // 创始人 → V4 Pro（当前最强；75% off 期间单次约 ¥0.02）
      return process.env.DEEPSEEK_FOUNDER_CHAT_MODEL || "deepseek-v4-pro";
    }
    // 员工 → V4 Flash（1M 上下文 / ¥1 ¥2 / 单次约 ¥0.005）
    return process.env.DEEPSEEK_CHAT_MODEL || provider.model_name || process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  }
  return provider.model_name || process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
}

function timeoutForModule(module: string, hasImages = false) {
  if (module.startsWith("finance.ai_parse")) {
    return numberEnv(hasImages ? "FINANCE_AI_VISION_TIMEOUT_MS" : "FINANCE_AI_PARSE_TIMEOUT_MS", hasImages ? 12_000 : 6_500);
  }
  if (module === "ai_chat") return numberEnv("AI_CHAT_TIMEOUT_MS", 45_000);
  return numberEnv("AI_DEFAULT_TIMEOUT_MS", 20_000);
}

function maxTokensForModule(module: string, hasImages = false) {
  if (module.startsWith("finance.ai_parse")) return hasImages ? 650 : 420;
  if (module === "ai_chat") return 900;
  if (module === "ai_settings") return 600;
  return 900;
}

function getProviderConfig(
  provider: AIProvider,
  module: string,
  hasImages = false,
  roleKey?: string | null
) {
  if (provider.provider_name === "siliconflow") {
    return {
      displayName: "SiliconFlow",
      apiKey: process.env.SILICONFLOW_API_KEY ?? "",
      baseUrl: provider.base_url ?? process.env.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.cn/v1",
      model: modelForModule(provider, module, hasImages, roleKey),
      missingKeyMessage: "Missing SILICONFLOW_API_KEY"
    };
  }

  return {
    displayName: "DeepSeek",
    apiKey: process.env.DEEPSEEK_API_KEY ?? process.env.SPEEK_V4_API_KEY ?? "",
    baseUrl: provider.base_url ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    model: modelForModule(provider, module, hasImages, roleKey),
    missingKeyMessage: "Missing DEEPSEEK_API_KEY"
  };
}

function buildUserContent(prompt: string, images?: AIImageInput[]) {
  if (!images?.length) return prompt;

  return [
    { type: "text", text: prompt },
    ...images.map((image) => ({
      type: "image_url",
      image_url: {
        url: `data:${image.mime_type};base64,${image.data_base64}`
      }
    }))
  ];
}

function buildChatBody(input: AIInvokeOptions, config: ReturnType<typeof getProviderConfig>, stream = false) {
  return {
    model: config.model,
    messages: [
      {
        role: "system",
        content: "You are the AI engine inside 初晓 OS 系统. Return concise, structured, business-safe answers."
      },
      { role: "user", content: buildUserContent(input.prompt, input.images) }
    ],
    temperature: input.temperature ?? 0.2,
    max_tokens: input.maxTokens ?? maxTokensForModule(input.module, Boolean(input.images?.length)),
    ...(stream ? { stream: true } : {}),
    ...(input.responseFormat === "json" ? { response_format: { type: "json_object" } } : {})
  };
}

function makeTextStream(text: string) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    }
  });
}

async function invokeOpenAICompatible(input: AIInvokeOptions & {
  provider: AIProvider & { provider_name: OpenAICompatibleProviderName };
}) {
  const hasImages = Boolean(input.images?.length);
  const config = getProviderConfig(input.provider, input.module, hasImages, input.roleKey);
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const promptPreview = input.images?.length ? `${input.prompt}\n[images:${input.images.map((image) => image.file_name ?? image.mime_type).join(", ")}]` : input.prompt;

  if (!config.apiKey) {
    const invocation = await logAIInvocation({
      provider_id: input.provider.id,
      module: input.module,
      prompt_preview: promptPreview.slice(0, 500),
      status: "failed",
      error_message: config.missingKeyMessage
    });
    return {
      provider: input.provider,
      invocationLogId: "id" in invocation ? invocation.id : undefined,
      modelId: config.model,
      costEstimateCny: 0,
      text: `${config.displayName} API Key 未配置。请在服务端环境变量中设置对应 API Key。`
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? timeoutForModule(input.module, hasImages));

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildChatBody(input, config)),
      signal: controller.signal
    });

    const payload = (await response.json().catch(() => ({}))) as ChatCompletionResponse & {
      error?: { message?: string };
    };

    if (!response.ok) {
      const message = payload.error?.message ?? `${config.displayName} request failed: ${response.status}`;
      const invocation = await logAIInvocation({
        provider_id: input.provider.id,
        module: input.module,
        prompt_preview: promptPreview.slice(0, 500),
        status: "failed",
        error_message: message
      });
      return {
        provider: input.provider,
        invocationLogId: "id" in invocation ? invocation.id : undefined,
        modelId: config.model,
        costEstimateCny: 0,
        text: `${config.displayName} 调用失败：${message}`
      };
    }

    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const inputTokens = payload.usage?.prompt_tokens ?? 0;
    const outputTokens = payload.usage?.completion_tokens ?? 0;
    const costEstimateCny = estimateCostCny(config.model, inputTokens, outputTokens);
    const invocation = await logAIInvocation({
      provider_id: input.provider.id,
      module: input.module,
      prompt_preview: promptPreview.slice(0, 500),
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_estimate: costEstimateCny,
      status: "success"
    });

    return {
      provider: input.provider,
      invocationLogId: "id" in invocation ? invocation.id : undefined,
      modelId: config.model,
      costEstimateCny,
      text
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? `${config.displayName} 调用超时，已启用快速降级。`
      : error instanceof Error ? error.message : `Unknown ${config.displayName} error`;
    const invocation = await logAIInvocation({
      provider_id: input.provider.id,
      module: input.module,
      prompt_preview: promptPreview.slice(0, 500),
      status: "failed",
      error_message: message
    });
    return {
      provider: input.provider,
      invocationLogId: "id" in invocation ? invocation.id : undefined,
      modelId: config.model,
      costEstimateCny: 0,
      text: `${config.displayName} 调用失败：${message}`
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function streamOpenAICompatible(input: AIInvokeOptions & {
  provider: AIProvider & { provider_name: OpenAICompatibleProviderName };
}) {
  const hasImages = Boolean(input.images?.length);
  const config = getProviderConfig(input.provider, input.module, hasImages, input.roleKey);
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const promptPreview = input.images?.length ? `${input.prompt}\n[images:${input.images.map((image) => image.file_name ?? image.mime_type).join(", ")}]` : input.prompt;

  if (!config.apiKey) {
    const invocation = await logAIInvocation({
      provider_id: input.provider.id,
      module: input.module,
      prompt_preview: promptPreview.slice(0, 500),
      status: "failed",
      error_message: config.missingKeyMessage
    });
    return {
      provider: input.provider,
      invocationLogId: "id" in invocation ? invocation.id : undefined,
      modelId: config.model,
      stream: makeTextStream(`${config.displayName} API Key 未配置。请在服务端环境变量中设置对应 API Key。`)
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? timeoutForModule(input.module, hasImages));

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildChatBody(input, config, true)),
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      const message = payload.error?.message ?? `${config.displayName} request failed: ${response.status}`;
      const invocation = await logAIInvocation({
        provider_id: input.provider.id,
        module: input.module,
        prompt_preview: promptPreview.slice(0, 500),
        status: "failed",
        error_message: message
      });
      return {
        provider: input.provider,
        invocationLogId: "id" in invocation ? invocation.id : undefined,
        modelId: config.model,
        stream: makeTextStream(`${config.displayName} 调用失败：${message}`)
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    void (async () => {
      let buffer = "";
      let output = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const event = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string | null }; message?: { content?: string | null } }>;
                usage?: ChatCompletionResponse["usage"];
              };
              const chunk = event.choices?.[0]?.delta?.content ?? event.choices?.[0]?.message?.content ?? "";
              if (chunk) {
                output += chunk;
                await writer.write(encoder.encode(chunk));
              }
            } catch {
              // Ignore malformed stream frames and keep reading.
            }
          }
        }

        await logAIInvocation({
          provider_id: input.provider.id,
          module: input.module,
          prompt_preview: promptPreview.slice(0, 500),
          output_tokens: Math.ceil(output.length / 2),
          status: "success"
        });
      } catch (error) {
        const message = error instanceof Error && error.name === "AbortError"
          ? `${config.displayName} 流式调用超时。`
          : error instanceof Error ? error.message : `Unknown ${config.displayName} stream error`;
        await writer.write(encoder.encode(`\n\n${config.displayName} 调用中断：${message}`));
        await logAIInvocation({
          provider_id: input.provider.id,
          module: input.module,
          prompt_preview: promptPreview.slice(0, 500),
          status: "failed",
          error_message: message
        });
      } finally {
        clearTimeout(timeout);
        await writer.close();
      }
    })();

    return { provider: input.provider, modelId: config.model, stream: readable };
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error && error.name === "AbortError"
      ? `${config.displayName} 调用超时，请稍后重试。`
      : error instanceof Error ? error.message : `Unknown ${config.displayName} stream error`;
    const invocation = await logAIInvocation({
      provider_id: input.provider.id,
      module: input.module,
      prompt_preview: promptPreview.slice(0, 500),
      status: "failed",
      error_message: message
    });
    return {
      provider: input.provider,
      invocationLogId: "id" in invocation ? invocation.id : undefined,
      modelId: config.model,
      stream: makeTextStream(`${config.displayName} 调用失败：${message}`)
    };
  }
}

/**
 * 自动取当前用户角色 key —— invokeAI / streamAI 在 ai_chat 模块下
 * 用它来判断走「创始人顶级模型」还是「员工平衡模型」。
 *
 * 任何登录失败 / Supabase 不可用 / 系统调用都返回 null，
 * 这种情况下走标准模型即可，不会抛错。
 */
async function resolveCurrentRoleKey(): Promise<string | null> {
  try {
    const member = await getCurrentMember();
    return member?.role?.key ?? null;
  } catch {
    return null;
  }
}

export async function invokeAI(input: Omit<AIInvokeOptions, "images">) {
  const provider = await getActiveProvider();
  // ai_chat 模块自动检测当前角色 → owner 用顶级推理模型
  const roleKey = input.roleKey ?? (input.module === "ai_chat" ? await resolveCurrentRoleKey() : null);

  if (provider.provider_name === "deepseek" || provider.provider_name === "siliconflow") {
    return invokeOpenAICompatible({
      provider: provider as AIProvider & { provider_name: OpenAICompatibleProviderName },
      module: input.module,
      prompt: input.prompt,
      maxTokens: input.maxTokens,
      timeoutMs: input.timeoutMs,
      temperature: input.temperature,
      responseFormat: input.responseFormat,
      roleKey
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
    modelId: provider.model_name,
    costEstimateCny: 0,
    text: "AI Provider interface reserved. Real model execution can be plugged in here."
  };
}

export async function invokeAIWithImages(input: AIInvokeOptions & { images: AIImageInput[] }) {
  const provider = await getActiveProvider();
  const roleKey = input.roleKey ?? (input.module === "ai_chat" ? await resolveCurrentRoleKey() : null);

  if (provider.provider_name === "deepseek" || provider.provider_name === "siliconflow") {
    return invokeOpenAICompatible({
      provider: provider as AIProvider & { provider_name: OpenAICompatibleProviderName },
      module: input.module,
      prompt: input.prompt,
      images: input.images,
      maxTokens: input.maxTokens,
      timeoutMs: input.timeoutMs,
      temperature: input.temperature,
      responseFormat: input.responseFormat,
      roleKey
    });
  }

  const invocation = await logAIInvocation({
    provider_id: provider.id,
    module: input.module,
    prompt_preview: `${input.prompt}\n[images:${input.images.map((image) => image.file_name ?? image.mime_type).join(", ")}]`.slice(0, 500),
    status: "failed",
    error_message: "当前 AI Provider 尚未接入图片识别。"
  });
  return {
    provider,
    invocationLogId: "id" in invocation ? invocation.id : undefined,
    modelId: provider.model_name,
    costEstimateCny: 0,
    text: "当前 AI Provider 尚未接入图片识别。请补充文字描述后再解析。"
  };
}

export async function streamAI(input: Omit<AIInvokeOptions, "images">) {
  const provider = await getActiveProvider();
  // ai_chat 模块自动检测当前角色 → owner 用顶级推理模型
  const roleKey = input.roleKey ?? (input.module === "ai_chat" ? await resolveCurrentRoleKey() : null);

  if (provider.provider_name === "deepseek" || provider.provider_name === "siliconflow") {
    return streamOpenAICompatible({
      provider: provider as AIProvider & { provider_name: OpenAICompatibleProviderName },
      ...input,
      roleKey
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
    modelId: provider.model_name,
    stream: makeTextStream("AI Provider interface reserved. Real model execution can be plugged in here.")
  };
}
