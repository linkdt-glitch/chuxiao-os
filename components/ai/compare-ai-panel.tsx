"use client";

import { useState } from "react";
import { AlertTriangle, Brain, Send, Sparkles, Timer, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCostCny } from "@/lib/ai/models-catalog";

type ModelResult = {
  modelId: string;
  modelLabel: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  costCny: number;
  durationMs: number;
  error?: string;
};

type CompareState = {
  loading: boolean;
  prompt?: string;
  claude?: ModelResult;
  gpt?: ModelResult;
  totalCostCny?: number;
  error?: string;
};

/**
 * 创始人专用：并排展示 Claude Sonnet 4.5 + GPT-5 的回答。
 * 设计意图：让创始人在做战略决策时同时看到两个顶级模型的不同思路，
 *           避免单一模型的偏见 / 盲点。
 */
export function CompareAIPanel() {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<CompareState>({ loading: false });

  async function submit() {
    const trimmed = prompt.trim();
    if (!trimmed || state.loading) return;

    setState({ loading: true, prompt: trimmed });

    try {
      const response = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed })
      });
      const data = await response.json();
      if (!response.ok) {
        setState({ loading: false, error: data.error ?? "请求失败" });
        return;
      }
      setState({
        loading: false,
        prompt: trimmed,
        claude: data.claude,
        gpt: data.gpt,
        totalCostCny: data.totalCostCny
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "网络错误"
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* 输入框 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <Sparkles className="h-4 w-4 text-orange-600" /> 同一个问题问两个模型
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            提示词建议清晰具体，越接近真实决策场景越能体现两个模型的差异。
            例：「我们要不要把财务系统从美国 Render 搬到新加坡？分析利弊。」
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
            }}
            placeholder="问一个关键决策问题... (Ctrl/Cmd+Enter 快捷提交)"
            className="min-h-[100px] resize-y rounded-xl border-slate-200 bg-white/80 text-base shadow-sm sm:text-sm"
            disabled={state.loading}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              一次对比预计 ¥0.05-0.15（取决于问答长度）
            </div>
            <Button onClick={submit} disabled={!prompt.trim() || state.loading} className="h-10">
              {state.loading ? (
                <>
                  <Brain className="h-4 w-4 animate-pulse" /> 两个模型并行思考中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> 同时问两个模型
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {state.error ? (
        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="flex items-start gap-2 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <div className="font-medium text-rose-900">对比失败</div>
              <p className="mt-1 text-sm text-rose-800">{state.error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 总成本汇总 */}
      {state.totalCostCny !== undefined && !state.loading ? (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-700" />
              <span className="text-sm font-medium text-emerald-900">本次对比总成本：</span>
              <span className="text-lg font-bold text-emerald-700">{formatCostCny(state.totalCostCny)}</span>
            </div>
            <div className="text-xs text-emerald-700/80">
              （Claude: {formatCostCny(state.claude?.costCny ?? 0)} + GPT-5: {formatCostCny(state.gpt?.costCny ?? 0)}）
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 双模型并排对比 */}
      {(state.loading || state.claude || state.gpt) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ModelResultCard
            title="Claude Sonnet 4.5"
            vendor="Anthropic"
            tone="orange"
            result={state.claude}
            loading={state.loading}
          />
          <ModelResultCard
            title="GPT-5"
            vendor="OpenAI"
            tone="cyan"
            result={state.gpt}
            loading={state.loading}
          />
        </div>
      ) : null}
    </div>
  );
}

function ModelResultCard({
  title,
  vendor,
  tone,
  result,
  loading
}: {
  title: string;
  vendor: string;
  tone: "orange" | "cyan";
  result?: ModelResult;
  loading: boolean;
}) {
  const palette = tone === "orange"
    ? { border: "border-orange-200", bg: "bg-orange-50/30", titleColor: "text-orange-900", vendorBg: "bg-orange-100 text-orange-800" }
    : { border: "border-cyan-200", bg: "bg-cyan-50/30", titleColor: "text-cyan-900", vendorBg: "bg-cyan-100 text-cyan-800" };

  return (
    <Card className={`${palette.border} ${palette.bg}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className={`text-[15px] ${palette.titleColor}`}>{title}</CardTitle>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${palette.vendorBg}`}>
            {vendor}
          </span>
          {result && !result.error ? (
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {(result.durationMs / 1000).toFixed(1)}s
              </span>
              <span className="flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                {formatCostCny(result.costCny)}
              </span>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/60" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200/60" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200/60" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/60" />
          </div>
        ) : result?.error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <div className="font-medium">调用失败</div>
            <div className="mt-1 text-xs">{result.error}</div>
          </div>
        ) : result ? (
          <>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {result.text || "（模型未返回内容）"}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-200/60 pt-3 text-[11px] text-muted-foreground">
              <span>输入 {result.inputTokens} tokens</span>
              <span>·</span>
              <span>输出 {result.outputTokens} tokens</span>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">等待提交</div>
        )}
      </CardContent>
    </Card>
  );
}
