"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AIThinking } from "@/components/ui/ai-thinking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type TestResult = {
  message?: string;
  error?: string;
  provider?: {
    label: string;
    provider_name: string;
    model_name: string;
  };
  text?: string;
};

const defaultPrompt =
  "请用 5 条要点说明：初晓 OS 如何帮助小公司管理组织、审批、文件、AI Agent 和经营执行。";

export function ProviderTestCard() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function testProvider() {
    setPending(true);
    setResult(null);

    const response = await fetch("/api/ai/test-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const payload = (await response.json().catch(() => ({}))) as TestResult;
    setResult(payload);
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 一键测试</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-h-28"
          placeholder="输入一句你希望 AI 完成的任务"
        />
        <Button type="button" className="w-full" onClick={testProvider} disabled={pending}>
          <Sparkles className="h-4 w-4" />
          {pending ? "测试中..." : "测试当前 Provider"}
        </Button>
        {pending ? <AIThinking label="AI 测试中" variant="card" estimatedSeconds={6} /> : null}
        {result ? (
          <div
            className="rounded-lg p-3 text-sm"
            style={
              result.error
                ? {
                    background: "rgba(239,68,68,0.10)",
                    border: "1px solid rgba(239,68,68,0.32)",
                    color: "rgb(252,165,165)"
                  }
                : {
                    background: "#f8fafc",
                    border: "1px solid rgba(249,115,22,0.18)",
                    color: "rgb(226,232,240)"
                  }
            }
          >
            {result.error ? (
              result.error
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">
                  {result.provider?.label} · {result.provider?.model_name}
                </div>
                <div className="whitespace-pre-wrap leading-6">{result.text}</div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
