"use client";

import { useMemo, useState } from "react";
import { Download, ImageIcon, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  IMAGE_MODELS,
  formatPriceCny,
  getDefaultModel,
  type ImageModel
} from "@/lib/ai/image-models";

type ImageSize =
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9";

const SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: "square_hd", label: "1024×1024 方形" },
  { value: "square", label: "512×512 快速" },
  { value: "landscape_4_3", label: "1024×768 横向" },
  { value: "portrait_4_3", label: "768×1024 竖向" },
  { value: "landscape_16_9", label: "1024×576 宽屏" },
  { value: "portrait_16_9", label: "576×1024 竖屏" }
];

type GenerationResult = {
  url: string;
  modelLabel: string;
  costEstimateCny: number;
};

export function ImageGenWidget() {
  const defaultModel = useMemo(() => getDefaultModel(), []);
  const [modelId, setModelId] = useState<string>(defaultModel.id);
  const [prompt, setPrompt] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("square_hd");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedModel: ImageModel =
    IMAGE_MODELS.find((m) => m.id === modelId) ?? defaultModel;

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/ai/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          image_size: imageSize,
          model: modelId
        })
      });

      const data = (await response.json()) as {
        url?: string;
        model_label?: string;
        cost_estimate_cny?: number;
        error?: string;
      };

      if (!response.ok || !data.url) {
        setError(data.error ?? "图片生成失败，请稍后重试。");
        return;
      }

      setResult({
        url: data.url,
        modelLabel: data.model_label ?? selectedModel.label,
        costEstimateCny: data.cost_estimate_cny ?? selectedModel.pricePerImageCny
      });
    } catch {
      setError("网络错误，请检查连接后重试。");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      void handleGenerate();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-400" />
          AI 图片生成
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
            POWERED BY FAL.AI
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Model picker ───────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
              模型 // MODEL
            </label>
            <span className="text-xs text-slate-500">
              单张 ≈ {formatPriceCny(selectedModel.pricePerImageCny)} · 约 {selectedModel.approxSeconds}s
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {IMAGE_MODELS.map((model) => {
              const active = model.id === modelId;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setModelId(model.id)}
                  disabled={loading}
                  className="group rounded-lg p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: active
                      ? "rgba(249,115,22,0.10)"
                      : "rgba(8,13,28,0.55)",
                    border: active
                      ? "1px solid rgba(249,115,22,0.45)"
                      : "1px solid rgba(249,115,22,0.10)",
                    boxShadow: active
                      ? "inset 0 0 16px rgba(249,115,22,0.06), 0 0 14px rgba(249,115,22,0.10)"
                      : undefined
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={
                        active
                          ? "text-sm font-semibold text-orange-200"
                          : "text-sm font-medium text-slate-200"
                      }
                    >
                      {model.label}
                    </span>
                    {model.tag ? (
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                        style={{
                          background: active
                            ? "rgba(249,115,22,0.20)"
                            : "rgba(249,115,22,0.08)",
                          color: active ? "#fbbf24" : "rgba(251,146,60,0.85)",
                          border: "1px solid rgba(249,115,22,0.25)"
                        }}
                      >
                        {model.tag}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                    {model.description}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[10px] tracking-wide text-slate-500">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {model.speed === "fast"
                        ? "极速"
                        : model.speed === "medium"
                          ? "中速"
                          : "慢速"}
                    </span>
                    <span className="tabular-nums text-orange-300">
                      {formatPriceCny(model.pricePerImageCny)}/张
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Prompt ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
            描述 // PROMPT
          </label>
          <Textarea
            placeholder="例如：a golden fox running in snowy mountains, digital art style, highly detailed..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={3}
            maxLength={500}
            className="resize-none"
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{prompt.length}/500</span>
            <span>Cmd/Ctrl + Enter 快速生成</span>
          </div>
        </div>

        {/* ── Size ───────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
            尺寸 // SIZE
          </label>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((option) => {
              const active = imageSize === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setImageSize(option.value)}
                  disabled={loading}
                  className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: active ? "rgba(249,115,22,0.14)" : "rgba(8,13,28,0.55)",
                    border: active
                      ? "1px solid rgba(249,115,22,0.45)"
                      : "1px solid rgba(249,115,22,0.12)",
                    color: active ? "#fbbf24" : "rgb(203,213,225)"
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Submit ─────────────────────────────────────────────────── */}
        <Button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4" />
              生成图片 · 本次 ≈ {formatPriceCny(selectedModel.pricePerImageCny)}
            </>
          )}
        </Button>

        {error && (
          <div
            className="rounded-md px-3 py-2 text-sm text-red-300"
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.30)"
            }}
          >
            {error}
          </div>
        )}

        {/* ── Result / placeholder ──────────────────────────────────── */}
        {loading && (
          <div
            className="flex min-h-32 flex-col items-center justify-center rounded-lg p-6"
            style={{
              background: "rgba(8,13,28,0.55)",
              border: "1px dashed rgba(249,115,22,0.30)"
            }}
          >
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-orange-400" />
            <p className="text-sm text-orange-300">
              {selectedModel.label} 正在绘制图片，约 {selectedModel.approxSeconds} 秒...
            </p>
          </div>
        )}

        {result && !loading ? (
          <div className="space-y-2">
            <div
              className="overflow-hidden rounded-lg"
              style={{
                background: "rgba(8,13,28,0.55)",
                border: "1px solid rgba(249,115,22,0.18)",
                boxShadow: "0 18px 40px rgba(0,0,0,0.45)"
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt={prompt}
                className="h-auto w-full object-contain"
                style={{ maxHeight: 480 }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-mono tracking-wide text-slate-500">
                <span className="text-orange-300">{result.modelLabel}</span>
                {" · 本次约 "}
                <span className="tabular-nums text-emerald-300">
                  {formatPriceCny(result.costEstimateCny)}
                </span>
              </span>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 text-orange-300 hover:text-orange-200 hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                下载图片
              </a>
            </div>
          </div>
        ) : !loading && !error ? (
          <div
            className="flex min-h-32 flex-col items-center justify-center rounded-lg p-6 text-center"
            style={{
              background: "rgba(8,13,28,0.45)",
              border: "1px dashed rgba(249,115,22,0.18)"
            }}
          >
            <ImageIcon className="mb-2 h-8 w-8 text-orange-400/40" />
            <p className="text-sm text-slate-400">
              输入描述后点击生成，图片将显示在这里
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
