"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  Download,
  ImageIcon,
  Loader2,
  Palette,
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
  buildPromptFromPreset,
  getPresetById,
  getPresetsByCategory,
  type AmazonAspectRatio,
  type AmazonImageSize,
  type PresetCategory
} from "@/lib/ai/amazon-presets";
import { ImageGenHelp } from "@/components/ai-workforce/image-gen-help";

// ── Constants ───────────────────────────────────────────────────────
type TabKind = "amazon" | "free";

const TABS: Array<{ kind: TabKind; category?: PresetCategory; label: string; sub: string }> = [
  { kind: "amazon", category: "main", label: "亚马逊主图", sub: "纯白底 / 抠图" },
  { kind: "amazon", category: "secondary", label: "亚马逊附图", sub: "厨房 · 生活方式 · 特写" },
  { kind: "amazon", category: "aplus", label: "A+ Content", sub: "Hero Banner / 图标" },
  { kind: "free", label: "自由合成", sub: "双图 · 全模型 · 自由 prompt" }
];

const FREE_SIZE_OPTIONS: { value: AmazonImageSize; label: string }[] = [
  { value: "square_hd", label: "1024×1024 方形" },
  { value: "landscape_4_3", label: "1024×768 横向" },
  { value: "portrait_4_3", label: "768×1024 竖向" },
  { value: "landscape_16_9", label: "1024×576 宽屏" },
  { value: "portrait_16_9", label: "576×1024 竖屏" }
];

const FREE_ASPECT_OPTIONS: { value: AmazonAspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1 方形" },
  { value: "4:3", label: "4:3 横向" },
  { value: "3:4", label: "3:4 竖向" },
  { value: "16:9", label: "16:9 宽屏" },
  { value: "9:16", label: "9:16 竖屏" }
];

const MAX_PRODUCT_REFS = 3;
const MAX_STYLE_REFS = 1;

// ── Types ───────────────────────────────────────────────────────────
type ReferenceImage = {
  id: string;
  url: string;
  bytes: number;
};

type GenerationResult = {
  url: string;
  modelLabel: string;
  costEstimateCny: number;
  prompt: string;
};

// ── Helpers ─────────────────────────────────────────────────────────
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
  const base64 = out.split(",", 2)[1] ?? "";
  const bytes = Math.round((base64.length * 3) / 4);
  return { url: out, bytes };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

// ── Style transfer instruction (appended when user provides a style ref) ──
const STYLE_TRANSFER_APPEND =
  " — IMPORTANT: the FIRST reference image(s) contain the actual product (preserve exactly). " +
  "The LAST reference image is a STYLE / MOOD reference — copy ONLY its visual aesthetic from it: " +
  "color palette, lighting style, atmosphere, composition style, post-processing tone. " +
  "Do NOT copy the subject or shape from the style reference — only its mood.";

// ── Reusable upload slot ────────────────────────────────────────────
function UploadSlot({
  title,
  hint,
  required,
  refs,
  onAddFiles,
  onRemove,
  max,
  loading,
  accentRgb,
  Icon
}: {
  title: string;
  hint: string;
  required: boolean;
  refs: ReferenceImage[];
  onAddFiles: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  max: number;
  loading: boolean;
  accentRgb: string; // e.g. "249,115,22"
  Icon: typeof Camera;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filled = refs.length > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: `rgba(${accentRgb},0.85)` }}>
          <Icon className="h-3 w-3" />
          {title}
          {required ? <span className="text-orange-400">*</span> : <span className="text-slate-500">（可选）</span>}
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          {refs.length}/{max}
        </span>
      </div>
      <div className="text-[10px] text-slate-500">{hint}</div>

      {!filled ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="group flex h-32 w-full flex-col items-center justify-center rounded-xl text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(180deg, rgba(8,13,28,0.55) 0%, rgba(4,8,20,0.65) 100%)`,
            border: `1.5px dashed rgba(${accentRgb},0.32)`,
            boxShadow: `inset 0 0 24px rgba(${accentRgb},0.04)`
          }}
        >
          <div
            className="mb-1.5 flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110"
            style={{
              background: `radial-gradient(circle at 50% 40%, rgba(${accentRgb},0.28), rgba(3,7,18,0.92))`,
              boxShadow: `0 0 18px rgba(${accentRgb},0.30), 0 0 0 1px rgba(${accentRgb},0.40)`
            }}
          >
            <Upload className="h-4 w-4" style={{ color: `rgba(${accentRgb},1)` }} />
          </div>
          <div className="text-xs font-semibold" style={{ color: `rgba(${accentRgb},1)` }}>
            点击上传
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">JPG / PNG / WEBP · ≤6MB</div>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {refs.map((r) => (
            <div
              key={r.id}
              className="group relative aspect-square overflow-hidden rounded-md"
              style={{
                background: "rgba(8,13,28,0.6)",
                border: `1px solid rgba(${accentRgb},0.30)`
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt="reference" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(r.id)}
                disabled={loading}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                style={{ background: "rgba(239,68,68,0.85)" }}
                aria-label="移除"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
              <span
                className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 font-mono text-[8px] tracking-wide text-slate-300"
                style={{ background: "rgba(0,0,0,0.55)" }}
              >
                {formatBytes(r.bytes)}
              </span>
            </div>
          ))}
          {refs.length < max ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="flex aspect-square flex-col items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "rgba(8,13,28,0.45)",
                border: `1.5px dashed rgba(${accentRgb},0.32)`,
                color: `rgba(${accentRgb},0.85)`
              }}
            >
              <Upload className="mb-0.5 h-3.5 w-3.5" />
              <span className="text-[10px]">+ 添加</span>
            </button>
          ) : null}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => onAddFiles(e.target.files)}
      />
    </div>
  );
}

// ── Reusable model dropdown ─────────────────────────────────────────
function ModelDropdown({
  models,
  value,
  onChange,
  loading,
  label
}: {
  models: ImageModel[];
  value: string;
  onChange: (id: string) => void;
  loading: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.id === value) ?? models[0];

  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
        {label}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={loading}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "rgba(8,13,28,0.65)",
            border: open
              ? "1px solid rgba(249,115,22,0.55)"
              : "1px solid rgba(249,115,22,0.18)",
            boxShadow: open
              ? "0 0 14px rgba(249,115,22,0.18), inset 0 0 16px rgba(249,115,22,0.04)"
              : undefined
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-orange-200">{selected.label}</span>
              {selected.tag ? (
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                  style={{
                    background: "rgba(249,115,22,0.10)",
                    color: "rgba(251,146,60,0.85)",
                    border: "1px solid rgba(249,115,22,0.25)"
                  }}
                >
                  {selected.tag}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
              {selected.description}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-right">
              <div className="font-mono text-xs font-bold tabular-nums text-emerald-300">
                {formatPriceCny(selected.pricePerImageCny)}
              </div>
              <div className="font-mono text-[9px] text-slate-500">~{selected.approxSeconds}s</div>
            </span>
            <ChevronDown
              className="h-4 w-4 text-slate-400 transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </div>
        </button>

        {open ? (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-96 overflow-auto rounded-lg shadow-2xl"
            style={{
              background: "rgba(4,8,20,0.98)",
              border: "1px solid rgba(249,115,22,0.32)",
              boxShadow:
                "0 24px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(249,115,22,0.08) inset"
            }}
          >
            {models.map((m) => {
              const active = m.id === value;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-start justify-between gap-3 border-b border-orange-500/[0.08] px-4 py-3 text-left transition-colors last:border-0 hover:bg-orange-500/[0.06]"
                  style={{
                    background: active ? "rgba(249,115,22,0.10)" : "transparent"
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          active
                            ? "text-sm font-semibold text-orange-200"
                            : "text-sm font-medium text-slate-200"
                        }
                      >
                        {m.label}
                      </span>
                      {m.tag ? (
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                          style={{
                            background: "rgba(249,115,22,0.10)",
                            color: "rgba(251,146,60,0.85)",
                            border: "1px solid rgba(249,115,22,0.25)"
                          }}
                        >
                          {m.tag}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                      {m.description}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-bold tabular-nums text-emerald-300">
                      {formatPriceCny(m.pricePerImageCny)}
                    </div>
                    <div className="flex items-center justify-end gap-1 font-mono text-[9px] text-slate-500">
                      <Zap className="h-2.5 w-2.5" />~{m.approxSeconds}s
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main widget ─────────────────────────────────────────────────────
export function ImageGenWidget() {
  const allImg2Img = useMemo(() => getModelsByShape("img2img"), []);
  const allText2Img = useMemo(() => getModelsByShape("text2img"), []);
  const defaultImg2Img = allImg2Img[0]; // Nano Banana Pro Edit
  const defaultText2Img = allText2Img[0]; // Flux Pro Ultra

  // ── Tab + preset state ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<{ kind: TabKind; category?: PresetCategory }>({
    kind: "amazon",
    category: "main"
  });
  const initialPresetId = useMemo(() => getPresetsByCategory("main")[0]?.id ?? "", []);
  const [presetId, setPresetId] = useState<string>(initialPresetId);
  const [presetValues, setPresetValues] = useState<Record<string, string>>({});

  // ── Reference image upload state (split into two slots) ─────────
  const [productRefs, setProductRefs] = useState<ReferenceImage[]>([]);
  const [styleRefs, setStyleRefs] = useState<ReferenceImage[]>([]);
  const [uploadError, setUploadError] = useState("");

  // ── Model override (亚马逊 Tab — 默认用 preset 推荐，可改) ──────
  const [overrideModelId, setOverrideModelId] = useState<string | null>(null);

  // ── Free mode state ─────────────────────────────────────────────
  const [freeModelId, setFreeModelId] = useState<string>(defaultImg2Img.id);
  const [freePrompt, setFreePrompt] = useState("");
  const [freeSize, setFreeSize] = useState<AmazonImageSize>("square_hd");
  const [freeAspect, setFreeAspect] = useState<AmazonAspectRatio>("1:1");

  // ── Generation state ────────────────────────────────────────────
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Derived ─────────────────────────────────────────────────────
  const activePresets = activeTab.category ? getPresetsByCategory(activeTab.category) : [];
  const activePreset = activeTab.kind === "amazon" ? getPresetById(presetId) : undefined;
  const presetNeedsUpload = activePreset?.mode === "edit";

  const usedModel: ImageModel = useMemo(() => {
    if (activeTab.kind === "amazon" && activePreset) {
      const idToUse = overrideModelId ?? activePreset.recommendedModelId;
      return IMAGE_MODELS.find((m) => m.id === idToUse) ?? defaultImg2Img;
    }
    return IMAGE_MODELS.find((m) => m.id === freeModelId) ?? defaultImg2Img;
  }, [activeTab, activePreset, overrideModelId, freeModelId, defaultImg2Img]);

  // ── Handlers ────────────────────────────────────────────────────
  function selectTab(kind: TabKind, category?: PresetCategory) {
    setActiveTab({ kind, category });
    if (kind === "amazon" && category) {
      const first = getPresetsByCategory(category)[0];
      if (first) {
        setPresetId(first.id);
        setPresetValues({});
        setOverrideModelId(null);
      }
    }
    setError("");
  }

  function selectPreset(id: string) {
    setPresetId(id);
    setPresetValues({});
    setOverrideModelId(null); // reset override when preset changes
    setError("");
  }

  function setField(key: string, value: string) {
    setPresetValues((prev) => ({ ...prev, [key]: value }));
  }

  async function ingestFiles(
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<ReferenceImage[]>>,
    cap: number
  ) {
    if (!files?.length) return;
    setUploadError("");
    setter((current) => {
      const remaining = cap - current.length;
      if (remaining <= 0) {
        setUploadError(`此槽位最多 ${cap} 张。`);
        return current;
      }
      // Process synchronously isn't possible; do in async loop after
      return current;
    });
    const slots = Array.from(files);
    for (const f of slots) {
      if (!f.type.startsWith("image/")) {
        setUploadError("只支持图片 (JPG / PNG / WEBP)。");
        continue;
      }
      try {
        const compressed = await compressImage(f);
        setter((current) => {
          if (current.length >= cap) return current;
          return [
            ...current,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              ...compressed
            }
          ];
        });
      } catch {
        setUploadError("图片读取失败，请换一张试试。");
      }
    }
  }

  function removeRef(id: string, kind: "product" | "style") {
    if (kind === "product") setProductRefs((p) => p.filter((r) => r.id !== id));
    else setStyleRefs((p) => p.filter((r) => r.id !== id));
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
      modelId = overrideModelId ?? activePreset.recommendedModelId;

      if (activePreset.mode === "edit") {
        if (productRefs.length === 0) {
          setError("此场景需要先上传产品照（左侧槽）。");
          return;
        }
        aspectRatio = activePreset.aspectRatio ?? "1:1";
        // Product refs first, then style refs at the end (last image is style ref).
        imageUrls = [...productRefs.map((r) => r.url), ...styleRefs.map((r) => r.url)];
        if (styleRefs.length > 0) prompt = prompt + STYLE_TRANSFER_APPEND;
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
      const m = IMAGE_MODELS.find((mm) => mm.id === modelId);
      if (m?.apiShape === "img2img") {
        if (productRefs.length === 0) {
          setError("图生图模型需要先上传产品照。");
          return;
        }
        aspectRatio = freeAspect;
        imageUrls = [...productRefs.map((r) => r.url), ...styleRefs.map((r) => r.url)];
        if (styleRefs.length > 0) prompt = prompt + STYLE_TRANSFER_APPEND;
      } else {
        imageSize = freeSize;
      }
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

  const freeModelObj = IMAGE_MODELS.find((m) => m.id === freeModelId) ?? defaultImg2Img;
  const freeIsImg2Img = freeModelObj.apiShape === "img2img";

  // ── Render ──────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-400" />
          AI 图片生成 · 亚马逊卖家直出
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
            FAL.AI · 7 旗舰模型
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
            {/* Step indicator */}
            {(() => {
              const stepUploaded = !presetNeedsUpload || productRefs.length > 0;
              const stepReady = stepUploaded && Boolean(activePreset);
              const stepGenerated = Boolean(result);
              const steps = [
                { n: 1, label: "上传产品照", done: productRefs.length > 0, active: presetNeedsUpload && productRefs.length === 0 },
                { n: 2, label: "选场景 + 模型", done: stepReady, active: stepUploaded && !stepGenerated },
                { n: 3, label: "AI 生成", done: stepGenerated, active: stepReady && !stepGenerated && !loading },
                { n: 4, label: "下载 / 上传 ASIN", done: false, active: stepGenerated }
              ];
              return (
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {steps.map((s, i) => (
                    <div key={s.n} className="flex shrink-0 items-center gap-2">
                      <div
                        className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors"
                        style={{
                          background: s.done ? "rgba(74,222,128,0.10)" : s.active ? "rgba(249,115,22,0.14)" : "rgba(8,13,28,0.55)",
                          border: s.done ? "1px solid rgba(74,222,128,0.40)" : s.active ? "1px solid rgba(249,115,22,0.55)" : "1px solid rgba(249,115,22,0.10)",
                          boxShadow: s.active ? "0 0 12px rgba(249,115,22,0.20)" : undefined
                        }}
                      >
                        <span
                          className="grid h-5 w-5 place-items-center rounded-full font-mono text-[10px] font-bold"
                          style={{
                            background: s.done ? "rgba(74,222,128,0.30)" : s.active ? "rgba(249,115,22,0.30)" : "rgba(15,23,42,0.85)",
                            color: s.done ? "#86efac" : s.active ? "#fbbf24" : "rgb(100,116,139)"
                          }}
                        >
                          {s.done ? "✓" : s.n}
                        </span>
                        <span
                          className="text-[11px] font-medium"
                          style={{ color: s.done ? "#86efac" : s.active ? "#fbbf24" : "rgb(148,163,184)" }}
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < steps.length - 1 ? (
                        <span className="h-px w-3 shrink-0" style={{ background: "rgba(249,115,22,0.20)" }} />
                      ) : null}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ── Dual upload zone ───────────────────────────────── */}
            {presetNeedsUpload ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <UploadSlot
                    title="产品照 // PRODUCT"
                    hint="必填 · 你拍的产品（背景/光线乱也没关系，AI 会换）"
                    required
                    refs={productRefs}
                    onAddFiles={(f) => ingestFiles(f, setProductRefs, MAX_PRODUCT_REFS)}
                    onRemove={(id) => removeRef(id, "product")}
                    max={MAX_PRODUCT_REFS}
                    loading={loading}
                    accentRgb="249,115,22"
                    Icon={Camera}
                  />
                  <UploadSlot
                    title="想要的效果 // STYLE"
                    hint="可选 · 想要的效果参考图（杂志风 / 网图 / 竞品）— AI 会借鉴它的色彩、光线、氛围"
                    required={false}
                    refs={styleRefs}
                    onAddFiles={(f) => ingestFiles(f, setStyleRefs, MAX_STYLE_REFS)}
                    onRemove={(id) => removeRef(id, "style")}
                    max={MAX_STYLE_REFS}
                    loading={loading}
                    accentRgb="74,222,128"
                    Icon={Palette}
                  />
                </div>
                {uploadError ? <div className="text-[11px] text-red-300">{uploadError}</div> : null}
                <div
                  className="rounded-md p-2.5 text-[11px] leading-relaxed text-slate-400"
                  style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.18)" }}
                >
                  🔒 <span className="text-emerald-300">隐私保护</span>：浏览器本地压缩到 1280px 后才发送，
                  <strong className="text-emerald-200">原图不会上传到我们的服务器</strong>。
                  传"产品照 + 风格参考图"两张时，AI 会保留你的产品形状/颜色不变，只借鉴风格图的视觉效果。
                </div>
              </>
            ) : null}

            {/* ── Model dropdown (override preset's recommended) ─── */}
            <ModelDropdown
              models={allImg2Img}
              value={overrideModelId ?? activePreset?.recommendedModelId ?? defaultImg2Img.id}
              onChange={(id) => setOverrideModelId(id)}
              loading={loading}
              label={`大模型 // MODEL ${overrideModelId ? "（已自选）" : "（推荐）"}`}
            />

            {/* ── Preset cards ───────────────────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                  场景 // PRESET
                </span>
                <span className="font-mono text-[10px] tracking-wide text-slate-500">
                  📷 = 图生图（需上传）· ✏️ = 文生图（无需图）
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
                        border: active ? "1px solid rgba(249,115,22,0.45)" : "1px solid rgba(249,115,22,0.10)"
                      }}
                    >
                      <div className={active ? "text-sm font-semibold text-orange-200" : "text-sm font-medium text-slate-200"}>
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

            {/* Compliance hint */}
            {activePreset?.category === "main" ? (
              <div
                className="flex items-start gap-2 rounded-lg p-3 text-[11px] leading-relaxed text-amber-200/85"
                style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.28)" }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-300" />
                <div>
                  <span className="font-medium text-amber-200">亚马逊主图官方规格</span>
                  ：最低 1000×1000，推荐 2000×2000+，纯白底 RGB(255,255,255)，文件 ≤10MB，最多 9 张/ASIN。
                  AI 生成后请用 Topaz / fal upscaler / Photoshop 把 1024 放大到 2000+ 再上传。
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
                                border: selected ? "1px solid rgba(249,115,22,0.45)" : "1px solid rgba(249,115,22,0.12)",
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
                style={{ background: "rgba(8,13,28,0.45)", border: "1px solid rgba(249,115,22,0.10)" }}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide">
                  <span className="text-orange-300/80">使用模型</span>
                  <span className="text-slate-200">{usedModel.label}</span>
                  <span className="text-orange-300/80">单张约</span>
                  <span className="tabular-nums text-emerald-300">{formatPriceCny(usedModel.pricePerImageCny)}</span>
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
            <ModelDropdown
              models={[...allImg2Img, ...allText2Img]}
              value={freeModelId}
              onChange={setFreeModelId}
              loading={loading}
              label="选大模型 // MODEL（11 个全模型 · 选了图生图自动出双槽上传）"
            />

            {freeIsImg2Img ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <UploadSlot
                    title="产品照 // PRODUCT"
                    hint="必填"
                    required
                    refs={productRefs}
                    onAddFiles={(f) => ingestFiles(f, setProductRefs, MAX_PRODUCT_REFS)}
                    onRemove={(id) => removeRef(id, "product")}
                    max={MAX_PRODUCT_REFS}
                    loading={loading}
                    accentRgb="249,115,22"
                    Icon={Camera}
                  />
                  <UploadSlot
                    title="想要的效果 // STYLE"
                    hint="可选 — 借鉴它的色彩与光线"
                    required={false}
                    refs={styleRefs}
                    onAddFiles={(f) => ingestFiles(f, setStyleRefs, MAX_STYLE_REFS)}
                    onRemove={(id) => removeRef(id, "style")}
                    max={MAX_STYLE_REFS}
                    loading={loading}
                    accentRgb="74,222,128"
                    Icon={Palette}
                  />
                </div>
                {uploadError ? <div className="text-[11px] text-red-300">{uploadError}</div> : null}
              </>
            ) : null}

            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                描述 // PROMPT (英文效果更佳)
              </label>
              <Textarea
                placeholder={
                  freeIsImg2Img
                    ? "例如：put this product on a marble countertop, soft morning light, photorealistic..."
                    : "例如：a golden fox running in snowy mountains, digital art style, highly detailed..."
                }
                value={freePrompt}
                onChange={(e) => setFreePrompt(e.target.value)}
                disabled={loading}
                rows={3}
                maxLength={1500}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{freePrompt.length}/1500</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-400/70">
                {freeIsImg2Img ? "比例 // ASPECT" : "尺寸 // SIZE"}
              </label>
              <div className="flex flex-wrap gap-2">
                {(freeIsImg2Img ? FREE_ASPECT_OPTIONS : FREE_SIZE_OPTIONS).map((option) => {
                  const active = freeIsImg2Img ? freeAspect === option.value : freeSize === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (freeIsImg2Img) setFreeAspect(option.value as AmazonAspectRatio);
                        else setFreeSize(option.value as AmazonImageSize);
                      }}
                      disabled={loading}
                      className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: active ? "rgba(249,115,22,0.14)" : "rgba(8,13,28,0.55)",
                        border: active ? "1px solid rgba(249,115,22,0.45)" : "1px solid rgba(249,115,22,0.12)",
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
              {presetNeedsUpload && productRefs.length === 0
                ? "请先上传产品照"
                : `生成图片 · 本次 ≈ ${formatPriceCny(usedModel.pricePerImageCny)}`}
            </>
          )}
        </Button>

        {error && (
          <div
            className="rounded-md px-3 py-2 text-sm text-red-300"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            className="flex min-h-32 flex-col items-center justify-center rounded-lg p-6"
            style={{ background: "rgba(8,13,28,0.55)", border: "1px dashed rgba(249,115,22,0.30)" }}
          >
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-orange-400" />
            <p className="text-sm text-orange-300">
              {usedModel.label} 正在绘制，约 {usedModel.approxSeconds} 秒...
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
              <img src={result.url} alt="generated" className="h-auto w-full object-contain" style={{ maxHeight: 480 }} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-mono tracking-wide text-slate-500">
                <span className="text-orange-300">{result.modelLabel}</span>
                {" · 本次约 "}
                <span className="tabular-nums text-emerald-300">{formatPriceCny(result.costEstimateCny)}</span>
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
              style={{ background: "rgba(8,13,28,0.45)", border: "1px solid rgba(249,115,22,0.10)" }}
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
            style={{ background: "rgba(8,13,28,0.45)", border: "1px dashed rgba(249,115,22,0.18)" }}
          >
            <ImageIcon className="mb-2 h-8 w-8 text-orange-400/40" />
            <p className="text-sm text-slate-400">
              {activeTab.kind === "amazon"
                ? presetNeedsUpload
                  ? "上传产品照（必）+ 想要的效果（可选） + 点生成"
                  : "选场景、填关键字、点生成"
                : "选模型 → 上传/输入 → 点生成"}
            </p>
          </div>
        ) : null}

        {/* ── Help / Cheat sheet ───────────────────────────────────── */}
        <div className="pt-2">
          <ImageGenHelp />
        </div>
      </CardContent>
    </Card>
  );
}
