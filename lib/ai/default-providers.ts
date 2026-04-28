import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const defaultAIProviders = [
  {
    provider_name: "openai",
    label: "OpenAI 占位",
    base_url: "https://api.openai.com/v1",
    model_name: "gpt-4.1",
    is_active: false,
    settings: {}
  },
  {
    provider_name: "anthropic",
    label: "Anthropic 占位",
    base_url: "https://api.anthropic.com",
    model_name: "claude-3.5-sonnet",
    is_active: false,
    settings: {}
  },
  {
    provider_name: "google",
    label: "Google 占位",
    base_url: "https://generativelanguage.googleapis.com",
    model_name: "gemini-1.5-pro",
    is_active: false,
    settings: {}
  },
  {
    provider_name: "deepseek",
    label: "DeepSeek V4 Flash",
    base_url: "https://api.deepseek.com",
    model_name: "deepseek-v4-flash",
    is_active: false,
    settings: { format: "openai", thinking_mode: "default" }
  },
  {
    provider_name: "siliconflow",
    label: "SiliconFlow DeepSeek V3",
    base_url: "https://api.siliconflow.cn/v1",
    model_name: "deepseek-ai/DeepSeek-V3",
    is_active: false,
    settings: { format: "openai", vendor: "siliconflow" }
  }
];

export async function ensureDefaultAIProviders(organizationId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const { data: existing } = await admin
    .from("ai_providers")
    .select("provider_name")
    .eq("organization_id", organizationId);

  const existingNames = new Set((existing ?? []).map((provider) => provider.provider_name));
  const missingProviders = defaultAIProviders
    .filter((provider) => !existingNames.has(provider.provider_name))
    .map((provider) => ({
      ...provider,
      organization_id: organizationId
    }));

  if (!missingProviders.length) return;
  await admin.from("ai_providers").insert(missingProviders);
}
