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
    label: "DeepSeek 直连（V3.2 + R1 思考）",
    base_url: "https://api.deepseek.com",
    // 默认 model 用 deepseek-chat（V3.2-Exp，员工日常）；
    // 创始人对话由代码自动升到 deepseek-reasoner（R1 顶级思考）
    model_name: "deepseek-chat",
    is_active: false,
    settings: {
      format: "openai",
      vendor: "deepseek",
      // 实际模型由代码按 module + 角色挑：
      //   owner + ai_chat       → deepseek-reasoner  (R1 顶级思考)
      //   非 owner + ai_chat    → deepseek-chat      (V3.2-Exp 平衡)
      role_routing: "founder→deepseek-reasoner (R1); staff→deepseek-chat (V3.2-Exp)"
    }
  },
  {
    provider_name: "siliconflow",
    label: "SiliconFlow（按角色路由）",
    base_url: "https://api.siliconflow.cn/v1",
    model_name: "deepseek-ai/DeepSeek-V3.1",
    is_active: false,
    settings: {
      format: "openai",
      vendor: "siliconflow",
      // 实际模型由代码按 module + 角色挑：
      //   owner + ai_chat       → deepseek-ai/DeepSeek-R1     (顶级推理)
      //   非 owner + ai_chat    → deepseek-ai/DeepSeek-V3.1   (平衡)
      //   finance.ai_parse.*    → Qwen/Qwen2.5-7B-Instruct    (极速)
      //   带图片                → Qwen/Qwen2.5-VL-7B-Instruct (视觉)
      role_routing: "founder→deepseek-r1; staff→deepseek-v3.1"
    }
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
