/**
 * OpenRouter 客户端 —— 创始人「双模型对比」专用通道。
 *
 * 设计意图：
 *   - 创始人在做关键决策时同时问 Claude Sonnet 4.5 + GPT-5
 *   - 并排看两边输出，避免单一模型 bias 导致的盲区
 *   - 每次调用计算实际成本并展示
 *
 * 鉴权：服务端读 OPENROUTER_API_KEY 环境变量（Render Dashboard 设置）。
 * 文档：https://openrouter.ai/docs
 *
 * 跟系统其他 AI 调用（DeepSeek / SiliconFlow）的区别：
 *   - 那些走 invokeAI() 抽象层，按模块 / 角色自动选模型
 *   - 这个直接指定模型 ID 调用，不经路由层（对比场景 model 必须显式）
 */

import { estimateCostCny, ALL_MODELS } from "@/lib/ai/models-catalog";

export type OpenRouterCallResult = {
  modelId: string;
  modelLabel: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  costCny: number;
  durationMs: number;
  error?: string;
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function modelLabel(modelId: string): string {
  return ALL_MODELS.find((m) => m.id === modelId)?.label ?? modelId;
}

/**
 * 调用一次 OpenRouter。失败时返回 error 字段，不抛错（让对比 UI 优雅展示一边失败）。
 *
 * @param modelId  OpenRouter 模型 ID（如 "anthropic/claude-sonnet-4.5"）
 * @param prompt   用户问题
 * @param systemPrompt 可选系统提示
 * @param timeoutMs 超时，默认 60s
 */
export async function callOpenRouter(input: {
  modelId: string;
  prompt: string;
  systemPrompt?: string;
  timeoutMs?: number;
}): Promise<OpenRouterCallResult> {
  const startTime = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      modelId: input.modelId,
      modelLabel: modelLabel(input.modelId),
      text: "",
      inputTokens: 0,
      outputTokens: 0,
      costCny: 0,
      durationMs: 0,
      error: "OPENROUTER_API_KEY 未配置 —— 请在 Render Dashboard 设置后重试。"
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 60_000);

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // OpenRouter 推荐设置这两个 header（用于他们的 leaderboard 统计）
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://m0f.com",
        "X-Title": "初晓 OS 双模型对比"
      },
      body: JSON.stringify({
        model: input.modelId,
        messages: [
          ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
          { role: "user", content: input.prompt }
        ],
        // 不开 streaming，简化 UI（对比场景两个一起出比较好对照）
        stream: false
      }),
      signal: controller.signal
    });

    const payload = (await response.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        modelId: input.modelId,
        modelLabel: modelLabel(input.modelId),
        text: "",
        inputTokens: 0,
        outputTokens: 0,
        costCny: 0,
        durationMs: Date.now() - startTime,
        error: payload.error?.message ?? `请求失败 HTTP ${response.status}`
      };
    }

    const text = payload.choices?.[0]?.message?.content ?? "";
    const inputTokens = payload.usage?.prompt_tokens ?? 0;
    const outputTokens = payload.usage?.completion_tokens ?? 0;
    const costCny = estimateCostCny(input.modelId, inputTokens, outputTokens);

    return {
      modelId: input.modelId,
      modelLabel: modelLabel(input.modelId),
      text,
      inputTokens,
      outputTokens,
      costCny,
      durationMs: Date.now() - startTime
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? `请求超时（${(input.timeoutMs ?? 60_000) / 1000}s）`
          : error.message
        : "未知错误";
    return {
      modelId: input.modelId,
      modelLabel: modelLabel(input.modelId),
      text: "",
      inputTokens: 0,
      outputTokens: 0,
      costCny: 0,
      durationMs: Date.now() - startTime,
      error: message
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 并行调用 Claude 4.5 + GPT-5，对比两边的回答。
 * 一边失败不影响另一边（Promise.allSettled 风格）。
 */
export async function compareDualModels(input: {
  prompt: string;
  systemPrompt?: string;
}): Promise<{
  claude: OpenRouterCallResult;
  gpt: OpenRouterCallResult;
  totalCostCny: number;
}> {
  const [claude, gpt] = await Promise.all([
    callOpenRouter({
      modelId: "anthropic/claude-sonnet-4.5",
      prompt: input.prompt,
      systemPrompt: input.systemPrompt
    }),
    callOpenRouter({
      modelId: "openai/gpt-5",
      prompt: input.prompt,
      systemPrompt: input.systemPrompt
    })
  ]);

  return {
    claude,
    gpt,
    totalCostCny: Number((claude.costCny + gpt.costCny).toFixed(4))
  };
}
