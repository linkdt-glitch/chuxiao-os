"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, ImageIcon, Loader2, Sparkles, Wand2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  IMAGE_MODELS,
  formatPriceCny,
  getDefaultModel,
  type ImageModel
} from "@/lib/ai/image-models";
import {
  AMAZON_PRESETS,
  buildPromptFromPreset,
  getPresetById,
  getPresetsByCategory,
  type AmazonImageSize,
  type AmazonPreset,
  type PresetCategory
} from "@/lib/ai/amazon-presets";

type Mode =
  | { kind: "amazon"; category: PresetCategory; presetId: string }
  | { kind: "free" };

const TABS: Array<{ value: Mode["kind"]; category?: PresetCategory; label: string; sub: string }> = [
  { value: "amazon", category: "main", label: "亚马逊主图", sub: "纯白底，强制规格" },
  { value: "amazon", category: "secondary", label: "亚马逊附图", sub: "生活方式 / 特写 / 场景" },
  { value: "amazon", category: "aplus", label: "A+ Content", sub: "横幅 / 图标 / 比较卡" },
  { value: "free", label: "自由生成", sub: "自己写完整 prompt" }
];

type GenerationResult = {
  url: string;
  modelLabel: string;
  costEstimateCny: number;
  prompt: string;
};

const FREE_SIZE_OPTIONS: { value: AmazonImageSize; label: string }[] = [
  { value: "square_hd", label: "1024×1024 方形" },
  { value: "landscape_4_3", label: "1024×768 横向" },
  { value: "portrait_4_3", label: "768×1024 竖向" },
  { value: "landscape_16_9", label: "1024×576 宽屏" },
  { value: "portrait_16_9", label: "576×1024 竖屏" }
];

export function ImageGenWidget() {
  const defaultModel = useMemo(() => getDefaultModel(), []);

  // Tab + preset state
  const [activeTab, setActiveTab] = useState<{ kind: Mode["kind"]; category?: PresetCategory }>(
    { kind: "amazon", category: "main" }
  );
  const initialPresetId = useMemo(() => getPresetsByCategory("main")[0]?.id ?? "", []);
  const [presetId, setPresetId] = useState<string>(initialPresetId);
  const [presetValues, setPresetValues] = useState<Record<string, string>>({});

  // Free-mode state
  const [freePrompt, setFreePrompt] = useState("");
  const [freeSize, setFreeSize] = useState<AmazonImageSize>("square_hd");
  const [freeModelId, setFreeModelId] = useState<string>(defaultModel.id);

  // Generation state (shared)
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Helpers ───────────────────────────────────────────────────────
  const activePresets = activeTab.category ? getPresetsByCategory(activeTab.category) : [];
  const activePreset = activeTab.kind === "amazon" ? getPresetById(presetId) : undefined;

  // The model actually used: preset's recommendation, or free-mode user choice.
  const usedModel: ImageModel =
    activeTab.kind === "amazon" && activePreset
      ? IMAGE_MODELS.find((m) => m.id === activePreset.recommendedModelId) ?? defaultModel
      : IMAGE_MODELS.find((m) => m.id === freeModelId) ?? defaultModel;

  function selectTab(kind: Mode["kind"], category?: PresetCategory) {
    setActiveTab({ kind, category });
    if (kind === "amazon" && category) {
      const first = getPresetsByCategory(category)[0];
      if (first) {
        setPresetId(first.id);
        setPresetValues({});
      }
    }
    setError("");
  }

  function selectPreset(id: string) {
    setPresetId(id);
    setPresetValues({});
    setError("");
  }

  function setField(key: string, value: string) {
    setPresetValues((prev) => ({ ...prev, [key]: value }));
  }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (loading) return;

    let prompt = "";
    let modelId = "";
    let imageSize: AmazonImageSize = "square_hd";

    if (activeTab.kind === "amazon" && activePreset) {
      const built = buildPromptFromPreset(activePreset, presetValues);
      if (built.missing.length) {
        setError(`请填写：${built.missing.join("、")}`);
        return;
      }
      prompt = built.prompt;
      modelId = activePreset.recommendedModelId;
      imageSize = activePreset.imageSize;
    } else {
      const trimmed = freePrompt.trim();
      if (!trimmed) {
        setError("请输入 prompt 描述。");
        return;
      }
      prompt = trimmed;
      modelId = freeModelId;
      imageSize = freeSize;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/ai/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: modelId, image_size: imageSize })
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
        modelLabel: data.model_label ?? usedModel.label,
        costEstimateCny: data.cost_estimate_cny ?? usedModel.pricePerImageCny,
        prompt
      });
    } catch {
      setError("网络错误，请检查连接后重试。");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-400" />
          AI 图片生成 · 亚马逊卖家直出
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
            FAL.AI · {IMAGE_MODELS.length} 旗舰模型
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TABS.map((tab) => {
            const isActive =
              tab.value === "free"
                ? activeTab.kind === "free"
                : activeTab.kind === "amazon" && activeTab.category === tab.category;
            return (
              <button
                key={`${tab.value}-${tab.category ?? "free"}`}
                type="button"
                onClick={() =>
                  tab.value === "free" ? selectTab("free") : selectTab("amazon", tab.category)
                }
                disabled={loading}
                className="rounded-lg p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: isActive ? "rgba(249,115,22,0.12)" : "rgba(8,13,28,0.55)",
                  border: isActive
                    ? "1px solid rgba(249,115,22,0.50)"
                    : "1px solid rgba(249,115,22,0.10)",
                  boxShadow: isActive
                    ? "0 0 14px rgba(249,115,22,0.10), inset 0 0 16px rgba(249,115,22,0.06)"
                    : undefined
                }}
              >
                <div
                  className={
                    isActive
                      ? "text-sm font-semibold text-orange-200"
                      : "text-sm font-medium text-slate-200"
                  }
                >
                  {tab.label}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">{tab.sub}</div>
              </button>
            );
          })}
        </div>

        {/* ── Amazon mode: preset cards + form ────────────────────── */}
        {activeTab.kind === "amazon" && (
          <>
            {/* Preset cards */}
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                场景 // PRESET
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {activePresets.map((preset) => {
                  const active = preset.id === presetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset.id)}
                      disabled={loading}
                      className="rounded-lg p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: active ? "rgba(249,115,22,0.10)" : "rgba(8,13,28,0.45)",
                        border: active
                          ? "1px solid rgba(249,115,22,0.45)"
                          : "1px solid rgba(249,115,22,0.10)"
                      }}
                    >
                      <div
                        className={
                          active
                            ? "text-sm font-semibold text-orange-200"
                            : "text-sm font-medium text-slate-200"
                        }
                      >
                        {preset.title}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                        {preset.blurb}
                      </p>
                      <div className="mt-1.5 font-mono text-[10px] tracking-wide text-orange-300/80">
                        {preset.spec}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compliance hint for current preset */}
            {activePreset?.category === "main" ? (
              <div
                className="flex items-start gap-2 rounded-lg p-3 text-[11px] leading-relaxed text-amber-200/85"
                style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.28)"
                }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-300" />
                <div>
                  <span className="font-medium text-amber-200">亚马逊主图合规提醒</span>
                  ：纯白底是硬要求；AI 生成后请人工核对背景是否真为 #FFFFFF（必要时用
                  remove.bg / Photoshop 抹底）。fal 单次最大 1024×1024，建议再用 Topaz Photo AI
                  或 fal upscaler 放大至 2000+ 才符合亚马逊放大功能。
                </div>
              </div>
            ) : null}

            {/* Field form for selected preset */}
            {activePreset ? (
              <div className="space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                  填空 // INPUTS
                </div>
                {activePreset.fields.map((field) => {
                  const value = presetValues[field.key] ?? field.defaultValue ?? "";
                  if (field.kind === "text") {
                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">
                          {field.label}
                          {field.required ? <span className="ml-1 text-orange-400">*</span> : null}
                        </label>
                        <Textarea
                          value={value}
                          onChange={(e) => setField(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          disabled={loading}
                          rows={2}
                          maxLength={300}
                          className="resize-none"
                        />
                      </div>
                    );
                  }
                  // select kind
                  return (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-medium text-slate-300">{field.label}</label>
                      <div className="flex flex-wrap gap-2">
                        {field.options?.map((opt) => {
                          const selected = value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setField(field.key, opt.value)}
                              disabled={loading}
                              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              style={{
                                background: selected
                                  ? "rgba(249,115,22,0.14)"
                                  : "rgba(8,13,28,0.55)",
                                border: selected
                                  ? "1px solid rgba(249,115,22,0.45)"
                                  : "1px solid rgba(249,115,22,0.12)",
                                color: selected ? "#fbbf24" : "rgb(203,213,225)"
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Spec recap */}
                <div
                  className="rounded-md p-2.5 text-[11px] leading-relaxed text-slate-400"
                  style={{
                    background: "rgba(8,13,28,0.45)",
                    border: "1px solid rgba(249,115,22,0.10)"
                  }}
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide">
                    <span className="text-orange-300/80">推荐模型</span>
                    <span className="text-slate-200">{usedModel.label}</span>
                    <span className="text-orange-300/80">单张约</span>
                    <span className="tabular-nums text-emerald-300">
                      {formatPriceCny(usedModel.pricePerImageCny)}
                    </span>
                    <span className="text-orange-300/80">输出</span>
                    <span className="text-slate-200">{activePreset.dimensionsHint}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}

        {/* ── Free mode ────────────────────────────────────────────── */}
        {activeTab.kind === "free" && (
          <>
            {/* Model picker */}
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                模型 // MODEL
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {IMAGE_MODELS.map((model) => {
                  const active = model.id === freeModelId;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setFreeModelId(model.id)}
                      disabled={loading}
                      className="rounded-lg p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: active ? "rgba(249,115,22,0.10)" : "rgba(8,13,28,0.55)",
                        border: active
                          ? "1px solid rgba(249,115,22,0.45)"
                          : "1px solid rgba(249,115,22,0.10)"
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
                              background: "rgba(249,115,22,0.10)",
                              color: "rgba(251,146,60,0.85)",
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
                      <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[10px] tracking-wide">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Zap className="h-3 w-3" />~{model.approxSeconds}s
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

            {/* Free prompt */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                描述 // PROMPT (英文效果更佳)
              </label>
              <Textarea
                placeholder="例如：a golden fox running in snowy mountains, digital art style, highly detailed..."
                value={freePrompt}
                onChange={(e) => setFreePrompt(e.target.value)}
                disabled={loading}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{freePrompt.length}/500</span>
              </div>
            </div>

            {/* Free size */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                尺寸 // SIZE
              </label>
              <div className="flex flex-wrap gap-2">
                {FREE_SIZE_OPTIONS.map((option) => {
                  const active = freeSize === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFreeSize(option.value)}
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
          </>
        )}

        {/* ── Submit ─────────────────────────────────────────────── */}
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              生成图片 · 本次 ≈ {formatPriceCny(usedModel.pricePerImageCny)}
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
              {usedModel.label} 正在绘制图片，约 {usedModel.approxSeconds} 秒...
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
                alt="generated"
                className="h-auto w-full object-contain"
                style={{ maxHeight: 480 }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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
            <details
              className="rounded-md p-2.5 text-[11px] leading-relaxed text-slate-400"
              style={{
                background: "rgba(8,13,28,0.45)",
                border: "1px solid rgba(249,115,22,0.10)"
              }}
            >
              <summary className="cursor-pointer text-slate-300 hover:text-orange-300">
                查看本次完整 prompt（用于复刻）
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[10px] text-slate-400">
                {result.prompt}
              </pre>
            </details>
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
              {activeTab.kind === "amazon"
                ? "选场景、填关键字、点生成"
                : "输入英文描述、选模型与尺寸、点生成"}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
