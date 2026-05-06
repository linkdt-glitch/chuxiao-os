"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  IMAGE_MODELS,
  formatPriceCny,
  getDefaultModel,
  getModelsByShape,
  type ImageModel
} from "@/lib/ai/image-models";
import {
  AMAZON_PRESETS,
  buildPromptFromPreset,
  getPresetById,
  getPresetsByCategory,
  type AmazonAspectRatio,
  type AmazonImageSize,
  type PresetCategory
} from "@/lib/ai/amazon-presets";

type TabKind = "amazon" | "free";

const TABS: Array<{ kind: TabKind; category?: PresetCategory; label: string; sub: string }> = [
  { kind: "amazon", category: "main", label: "亚马逊主图", sub: "纯白底 / 抠图" },
  { kind: "amazon", category: "secondary", label: "亚马逊附图", sub: "厨房 · 生活方式 · 特写" },
  { kind: "amazon", category: "aplus", label: "A+ Content", sub: "Hero Banner / 图标" },
  { kind: "free", label: "自由生成", sub: "完整 prompt + 自选模型" }
];

const FREE_SIZE_OPTIONS: { value: AmazonImageSize; label: string }[] = [
  { value: "square_hd", label: "1024×1024 方形" },
  { value: "landscape_4_3", label: "1024×768 横向" },
  { value: "portrait_4_3", label: "768×1024 竖向" },
  { value: "landscape_16_9", label: "1024×576 宽屏" },
  { value: "portrait_16_9", label: "576×1024 竖屏" }
];

const MAX_REFS = 4;

type ReferenceImage = {
  id: string;
  url: string; // data URI (jpeg)
  bytes: number;
};

type GenerationResult = {
  url: string;
  modelLabel: string;
  costEstimateCny: number;
  prompt: string;
};

// ── Client-side compression: max 1280px long edge, JPEG q=0.85 ──────
async function compressImage(file: File): Promise<{ url: string; bytes: number }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = dataUrl;
  });

  const max = 1280;
  let { width, height } = img;
  if (width > max || height > max) {
    if (width >= height) {
      height = Math.round((height * max) / width);
      width = max;
    } else {
      width = Math.round((width * max) / height);
      height = max;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas ctx unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL("image/jpeg", 0.85);
  // estimate size from base64
  const base64 = out.split(",", 2)[1] ?? "";
  const bytes = Math.round((base64.length * 3) / 4);
  return { url: out, bytes };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function ImageGenWidget() {
  const defaultModel = useMemo(() => getDefaultModel(), []);
  const text2imgModels = useMemo(() => getModelsByShape("text2img"), []);

  // ── Tab + preset state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<{ kind: TabKind; category?: PresetCategory }>({
    kind: "amazon",
    category: "main"
  });
  const initialPresetId = useMemo(() => getPresetsByCategory("main")[0]?.id ?? "", []);
  const [presetId, setPresetId] = useState<string>(initialPresetId);
  const [presetValues, setPresetValues] = useState<Record<string, string>>({});

  // ── Reference image upload state (for img2img presets) ──────────
  const [refs, setRefs] = useState<ReferenceImage[]>([]);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Free mode state ─────────────────────────────────────────────
  const [freePrompt, setFreePrompt] = useState("");
  const [freeSize, setFreeSize] = useState<AmazonImageSize>("square_hd");
  const [freeModelId, setFreeModelId] = useState<string>(
    text2imgModels[0]?.id ?? defaultModel.id
  );

  // ── Generation state ────────────────────────────────────────────
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Derived ─────────────────────────────────────────────────────
  const activePresets = activeTab.category ? getPresetsByCategory(activeTab.category) : [];
  const activePreset = activeTab.kind === "amazon" ? getPresetById(presetId) : undefined;
  const usedModel: ImageModel =
    activeTab.kind === "amazon" && activePreset
      ? IMAGE_MODELS.find((m) => m.id === activePreset.recommendedModelId) ?? defaultModel
      : IMAGE_MODELS.find((m) => m.id === freeModelId) ?? defaultModel;

  const presetNeedsUpload = activePreset?.mode === "edit";

  // ── Handlers ────────────────────────────────────────────────────
  function selectTab(kind: TabKind, category?: PresetCategory) {
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

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError("");
    const remaining = MAX_REFS - refs.length;
    if (remaining <= 0) {
      setUploadError(`最多上传 ${MAX_REFS} 张参考图。`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    const next: ReferenceImage[] = [];
    for (const f of list) {
      if (!f.type.startsWith("image/")) {
        setUploadError("只支持图片文件 (JPG / PNG / WEBP)。");
        continue;
      }
      try {
        const compressed = await compressImage(f);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...compressed
        });
      } catch {
        setUploadError("图片读取失败，请换一张试试。");
      }
    }
    if (next.length) setRefs((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeRef(id: string) {
    setRefs((prev) => prev.filter((r) => r.id !== id));
    setUploadError("");
  }

  // ── Submit ──────────────────────────────────────────────────────
  async function handleGenerate() {
    if (loading) return;

    let prompt = "";
    let modelId = "";
    let imageSize: AmazonImageSize | undefined;
    let aspectRatio: AmazonAspectRatio | undefined;
    let imageUrls: string[] | undefined;

    if (activeTab.kind === "amazon" && activePreset) {
      const built = buildPromptFromPreset(activePreset, presetValues);
      if (built.missing.length) {
        setError(`请填写：${built.missing.join("、")}`);
        return;
      }
      prompt = built.prompt;
      modelId = activePreset.recommendedModelId;

      if (activePreset.mode === "edit") {
        if (refs.length === 0) {
          setError("此场景需要先上传至少 1 张产品照片。");
          return;
        }
        aspectRatio = activePreset.aspectRatio ?? "1:1";
        imageUrls = refs.map((r) => r.url);
      } else {
        imageSize = activePreset.imageSize ?? "square_hd";
      }
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
        body: JSON.stringify({
          prompt,
          model: modelId,
          ...(imageSize ? { image_size: imageSize } : {}),
          ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
          ...(imageUrls ? { image_urls: imageUrls } : {})
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

  // ── Render ──────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-400" />
          AI 图片生成 · 亚马逊卖家直出
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
            FAL.AI · NANO BANANA + FLUX
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TABS.map((tab) => {
            const isActive =
              tab.kind === "free"
                ? activeTab.kind === "free"
                : activeTab.kind === "amazon" && activeTab.category === tab.category;
            return (
              <button
                key={`${tab.kind}-${tab.category ?? "free"}`}
                type="button"
                onClick={() =>
                  tab.kind === "free" ? selectTab("free") : selectTab("amazon", tab.category)
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

        {/* ── Amazon mode ─────────────────────────────────────────── */}
        {activeTab.kind === "amazon" && (
          <>
            {/* Preset cards */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                  场景 // PRESET
                </span>
                <span className="font-mono text-[10px] tracking-wide text-slate-500">
                  📷 = 上传图 ↗ 出图 · ✏️ = 文字生成
                </span>
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
                      <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[10px] tracking-wide">
                        <span className="text-orange-300/80">{preset.spec}</span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] uppercase"
                          style={{
                            background: preset.mode === "edit" ? "rgba(74,222,128,0.10)" : "rgba(249,115,22,0.08)",
                            color: preset.mode === "edit" ? "#86efac" : "rgba(251,146,60,0.85)",
                            border: `1px solid ${preset.mode === "edit" ? "rgba(74,222,128,0.30)" : "rgba(249,115,22,0.20)"}`
                          }}
                        >
                          {preset.mode === "edit" ? "图生图" : "文生图"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compliance hint for main category */}
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
                  <span className="font-medium text-amber-200">亚马逊主图合规</span>
                  ：纯白底 #FFFFFF 是硬要求；AI 生成后请人工核对，必要时用 remove.bg / Photoshop 抹底。
                  fal 单次最大约 1024×1024，建议再用 Topaz Photo AI 或 fal upscaler 放大至 2000+ 才符合放大功能要求。
                </div>
              </div>
            ) : null}

            {/* Upload zone (only for edit-mode presets) */}
            {presetNeedsUpload ? (
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                  上传产品照 // REFERENCE PHOTOS
                  <span className="ml-2 normal-case tracking-normal text-slate-500">
                    （手机拍的就行 · 自动压缩 · 最多 {MAX_REFS} 张）
                  </span>
                </div>

                {/* upload tiles */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {refs.map((r) => (
                    <div
                      key={r.id}
                      className="group relative aspect-square overflow-hidden rounded-lg"
                      style={{
                        background: "rgba(8,13,28,0.6)",
                        border: "1px solid rgba(249,115,22,0.18)"
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.url} alt="reference" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeRef(r.id)}
                        disabled={loading}
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                        style={{
                          background: "rgba(239,68,68,0.85)",
                          boxShadow: "0 0 8px rgba(239,68,68,0.5)"
                        }}
                        aria-label="移除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <span
                        className="absolute bottom-0 left-0 right-0 px-2 py-1 font-mono text-[9px] tracking-wide text-slate-300"
                        style={{ background: "rgba(0,0,0,0.55)" }}
                      >
                        {formatBytes(r.bytes)}
                      </span>
                    </div>
                  ))}

                  {refs.length < MAX_REFS ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex aspect-square flex-col items-center justify-center rounded-lg text-orange-400/80 transition-colors hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "rgba(8,13,28,0.45)",
                        border: "1px dashed rgba(249,115,22,0.30)"
                      }}
                    >
                      <Upload className="mb-1.5 h-5 w-5" />
                      <span className="text-xs">上传产品照</span>
                      <span className="mt-0.5 font-mono text-[9px] text-slate-500">
                        {refs.length}/{MAX_REFS}
                      </span>
                    </button>
                  ) : null}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                {uploadError ? (
                  <div className="text-[11px] text-red-300">{uploadError}</div>
                ) : null}

                <div
                  className="rounded-md p-2 text-[11px] leading-relaxed text-slate-400"
                  style={{
                    background: "rgba(8,13,28,0.45)",
                    border: "1px solid rgba(249,115,22,0.10)"
                  }}
                >
                  <span className="text-orange-300">提示：</span>
                  上传 1 张产品正面清晰照即可。多角度拍 2-3 张能让 AI 更准确还原产品。
                  图片在你浏览器本地压缩到 1280px 后才发送，**原图不会上传到服务器**。
                </div>
              </div>
            ) : null}

            {/* Field form */}
            {activePreset && activePreset.fields.length > 0 ? (
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
                                background: selected ? "rgba(249,115,22,0.14)" : "rgba(8,13,28,0.55)",
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
              </div>
            ) : null}

            {/* Spec recap */}
            {activePreset ? (
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
            ) : null}
          </>
        )}

        {/* ── Free mode ───────────────────────────────────────────── */}
        {activeTab.kind === "free" && (
          <>
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                模型 // MODEL（仅文生图，图生图请用「亚马逊」标签下的 📷 场景）
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {text2imgModels.map((model) => {
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

        {/* ── Submit ───────────────────────────────────────────────── */}
        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              {presetNeedsUpload && refs.length === 0
                ? "请先上传产品照"
                : `生成图片 · 本次 ≈ ${formatPriceCny(usedModel.pricePerImageCny)}`}
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
                ? presetNeedsUpload
                  ? "上传产品照、（可选）填字段、点生成"
                  : "选场景、填关键字、点生成"
                : "输入英文描述、选模型与尺寸、点生成"}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
