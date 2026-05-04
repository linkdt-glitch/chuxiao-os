"use client";

import { useState } from "react";
import { Download, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ImageSize = "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";

const SIZE_OPTIONS: { value: ImageSize; label: string }[] = [
  { value: "square_hd", label: "1024×1024 方形" },
  { value: "square", label: "512×512 快速" },
  { value: "landscape_4_3", label: "1024×768 横向" },
  { value: "portrait_4_3", label: "768×1024 竖向" },
  { value: "landscape_16_9", label: "1024×576 宽屏" },
  { value: "portrait_16_9", label: "576×1024 竖屏" }
];

export function ImageGenWidget() {
  const [prompt, setPrompt] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("square_hd");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setImageUrl(null);

    try {
      const response = await fetch("/api/ai/image-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, image_size: imageSize })
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? "图片生成失败，请稍后重试。");
        return;
      }

      setImageUrl(data.url);
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
          <Sparkles className="h-4 w-4 text-orange-500" />
          AI 图片生成
          <span className="ml-auto text-xs font-normal text-muted-foreground">由 fal.ai 提供</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">图片描述</label>
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
          <span className="text-xs text-muted-foreground">
            {prompt.length}/500 · Cmd+Enter 快速生成
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">图片尺寸</label>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setImageSize(option.value)}
                disabled={loading}
                className={[
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-all duration-150",
                  imageSize === option.value
                    ? "border-orange-300 bg-orange-50 text-orange-700 shadow-sm"
                    : "border-slate-200/80 bg-white/60 text-slate-600 hover:border-orange-200 hover:bg-orange-50/60",
                  loading ? "cursor-not-allowed opacity-50" : ""
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中，请稍候...
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4" />
              生成图片
            </>
          )}
        </Button>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-orange-200 bg-orange-50/30">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-orange-400" />
            <p className="text-sm text-orange-600">fal.ai 正在绘制图片，通常需要 5–20 秒...</p>
          </div>
        )}

        {imageUrl && !loading ? (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white/40 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={prompt}
                className="h-auto w-full object-contain"
                style={{ maxHeight: "480px" }}
              />
            </div>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              下载图片
            </a>
          </div>
        ) : !loading && !error ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-muted/20 text-center">
            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">输入描述后点击生成，图片将在这里展示</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
