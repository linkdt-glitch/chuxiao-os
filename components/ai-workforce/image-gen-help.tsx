"use client";

import { useState } from "react";
import { ChevronDown, BookOpen, FileImage, HelpCircle, Sparkles } from "lucide-react";

type Section = {
  id: string;
  icon: typeof BookOpen;
  title: string;
  body: React.ReactNode;
};

/**
 * Help accordion shown beneath the image-gen widget.
 *
 * Source of truth for Amazon image specs is the official Seller Central docs.
 * Numbers below are aligned to 2026 guidance:
 *  - Main image: ≥1000×1000 (zoom requires); recommended 2000–3000 longest edge.
 *  - Background: pure white RGB(255,255,255) for main image only.
 *  - File: JPEG / PNG / TIFF / GIF (no animated GIF), ≤10MB, single side ≤10000px.
 *  - Aspect ratio max 5:1.
 *  - Up to 9 images per listing (some categories also allow video).
 */
const SECTIONS: Section[] = [
  {
    id: "steps",
    icon: BookOpen,
    title: "怎么用 · 4 步直出",
    body: (
      <ol className="space-y-3">
        <li className="flex gap-3">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold text-orange-700"
            style={{
              background: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.35)"
            }}
          >
            1
          </span>
          <div>
            <div className="font-medium text-slate-900">用手机拍 1-3 张产品照</div>
            <div className="text-[11px] leading-relaxed text-slate-600">
              背景乱、光线一般都没关系，AI 会换。重点：产品**完整入镜、对焦清楚**就行。
              多角度拍 2-3 张能让 AI 更准确还原产品形状（最多 4 张）。
            </div>
          </div>
        </li>
        <li className="flex gap-3">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold text-orange-700"
            style={{
              background: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.35)"
            }}
          >
            2
          </span>
          <div>
            <div className="font-medium text-slate-900">选场景 + 上传</div>
            <div className="text-[11px] leading-relaxed text-slate-600">
              <span className="text-orange-700">主图</span>用「📷 抠图换纯白底」，
              <span className="text-orange-700">附图</span>挑「大理石晨光 / 木质农舍 / 北欧极简 / 工业不锈钢」之一，
              <span className="text-orange-700">A+</span>用「Hero Banner 产品图」。点上传区把产品照丢进去。
            </div>
          </div>
        </li>
        <li className="flex gap-3">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold text-orange-700"
            style={{
              background: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.35)"
            }}
          >
            3
          </span>
          <div>
            <div className="font-medium text-slate-900">点生成 → 等 6-20 秒出图</div>
            <div className="text-[11px] leading-relaxed text-slate-600">
              用 Nano Banana 系列（Google Gemini Image），保持产品形状不变只换环境。
              不满意可改 prompt 重生成，或换更高质量模型（Pro 顶配）再来一张。
            </div>
          </div>
        </li>
        <li className="flex gap-3">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold text-orange-700"
            style={{
              background: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.35)"
            }}
          >
            4
          </span>
          <div>
            <div className="font-medium text-slate-900">下载 → upscale → 上传 ASIN</div>
            <div className="text-[11px] leading-relaxed text-slate-600">
              fal 单次最大约 1024px，**主图建议先用 Topaz Photo AI / fal upscaler / Photoshop 神经
              网络放大到 2000-3000px** 再传亚马逊（亚马逊主图最低 1000×1000，推荐 2000+ 才能
              触发放大功能）。附图直接 1024 也合规。
            </div>
          </div>
        </li>
      </ol>
    )
  },
  {
    id: "specs",
    icon: FileImage,
    title: "亚马逊图片官方规格速查（2026）",
    body: (
      <div className="space-y-3 text-[11px] leading-relaxed text-slate-600">
        <div>
          <div className="mb-1.5 font-medium text-slate-900">主图（Main Image）— 强制规则</div>
          <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60">
            <li>纯白背景：<span className="font-mono text-orange-700">RGB 255, 255, 255</span>（off-white、灰底都会被拒）</li>
            <li>最低分辨率：<span className="font-mono text-orange-700">1000 × 1000 px</span>（触发放大功能必须达到）</li>
            <li>推荐分辨率：<span className="font-mono text-emerald-700">2000 × 2000 px 以上</span>，甜区 2000-3000</li>
            <li>仅产品本体，<span className="text-amber-800">不能有人物、配件、文字、logo、水印</span></li>
            <li>产品占图 ≥ 85%</li>
            <li>对焦清晰 + 真实色彩，**不能用展示框/模型图**</li>
          </ul>
        </div>
        <div>
          <div className="mb-1.5 font-medium text-slate-900">附图（Additional Images）— 限制宽松</div>
          <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60">
            <li>背景颜色不限，可以放生活方式、特写、对比、尺寸图</li>
            <li>同样建议 ≥1000×1000，推荐 2000+</li>
            <li>可以加文字、人物、场景、对比图</li>
          </ul>
        </div>
        <div>
          <div className="mb-1.5 font-medium text-slate-900">通用技术规格</div>
          <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60">
            <li>文件格式：<span className="font-mono">JPEG / PNG / TIFF / GIF</span>（不允许动画 GIF）</li>
            <li>文件体积：<span className="font-mono text-orange-700">≤ 10 MB / 张</span></li>
            <li>最大单边：<span className="font-mono">10,000 px</span>（超过被拒）</li>
            <li>最大宽高比：<span className="font-mono">5 : 1</span></li>
            <li>色彩空间：<span className="font-mono">sRGB</span> 或 <span className="font-mono">CMYK</span></li>
            <li>每个 ASIN 最多 <span className="font-mono text-orange-700">9 张图</span>（部分类目还可以 1 个视频）</li>
          </ul>
        </div>
        <div>
          <div className="mb-1.5 font-medium text-slate-900">A+ Content（品牌内容）</div>
          <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60">
            <li>Hero / Banner：横版常用 970×600 或 1464×600</li>
            <li>Standard image：300×300、600×180、970×300 多种 module</li>
            <li>比较卡缩略图：100×100</li>
            <li>logo：600×180 推荐 PNG 透明底</li>
            <li>具体每个 module 的尺寸看亚马逊后台 A+ 编辑器即时提示</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "常见问题",
    body: (
      <div className="space-y-3 text-[11px] leading-relaxed text-slate-600">
        <div>
          <div className="font-medium text-slate-900">Q: AI 把我的产品形状/颜色改了怎么办？</div>
          <div className="mt-0.5">
            场景已经在 prompt 里硬编码"keep the product EXACTLY identical"。如果还是变了，
            <strong className="text-orange-700">换更高质量的模型</strong>：把 preset 切到「📷 工业不锈钢」
            或「📷 A+ Hero Banner 产品图」（这两个用的是 Nano Banana <strong>Pro</strong>，
            形状保真比 v1/v2 强一截，¥1.08/张）。或者再上传一张更清晰的正面照。
          </div>
        </div>
        <div>
          <div className="font-medium text-slate-900">Q: 主图生成后背景看着不够白？</div>
          <div className="mt-0.5">
            肉眼看不出来不代表 RGB 255。建议过一道
            <strong className="text-orange-700">remove.bg / Photoshop 抠图</strong>
            把背景重新铺成纯白再传。或者拿到 Photoshop 里"色阶"把白点拉到 255。
            亚马逊审核很严，灰白会被退。
          </div>
        </div>
        <div>
          <div className="font-medium text-slate-900">Q: 1024×1024 出图够亚马逊主图用吗？</div>
          <div className="mt-0.5">
            <strong className="text-amber-600">勉强达标但不推荐</strong>。
            亚马逊主图 1000×1000 才能触发放大镜功能，1024 是过线。但 2000+ 才能让放大体验好。
            建议出图后再用：
            <ul className="ml-3 mt-1 list-disc marker:text-orange-600/60">
              <li><span className="font-mono">fal-ai/clarity-upscaler</span>（fal 内置，¥0.30/张 × 4×）</li>
              <li>Topaz Photo AI（桌面端，效果最好）</li>
              <li>Photoshop "图像 → 图像大小 → 保留细节 2.0"</li>
            </ul>
          </div>
        </div>
        <div>
          <div className="font-medium text-slate-900">Q: 上传的产品照会被存到哪？</div>
          <div className="mt-0.5">
            <strong className="text-emerald-700">不会上服务器</strong>。
            浏览器本地用 canvas 压到 1280px JPEG，base64 编码后**直接 POST 给 fal.ai**，
            我们的 Render 服务端只是中转，不落 Supabase Storage、不写 audit_log 的图片字段
            （只写 prompt 预览）。fal.ai 自己也只会临时保留几小时用于查询历史。
          </div>
        </div>
        <div>
          <div className="font-medium text-slate-900">Q: 一张图 1.08 元，跑批 10 张就 10 块，能不能更便宜？</div>
          <div className="mt-0.5">
            草稿阶段把 preset 切到「📷 大理石台面 · 晨光」（Nano Banana 2，¥0.58/张）跑 3-5 张
            选构图，定稿后再用 Pro 跑最终版。或者直接用「📷 抠图换纯白底」用 v1（¥0.28，但形状保真稍弱）
            做主图初版。
          </div>
        </div>
      </div>
    )
  },
  {
    id: "tips",
    icon: Sparkles,
    title: "高级技巧",
    body: (
      <ul className="space-y-2 text-[11px] leading-relaxed text-slate-600">
        <li>
          <strong className="text-orange-700">多角度上传：</strong>
          上传 2-3 张同一产品不同角度（正面 + 45° + 侧面），Nano Banana Pro 会综合使用，
          出图角度更可控、形状更准。
        </li>
        <li>
          <strong className="text-orange-700">用产品照 + 包装盒：</strong>
          一张产品独立照 + 一张产品+包装合影 → 选"包装展示"的自由风格 prompt，
          生成更高级的开箱合成图。
        </li>
        <li>
          <strong className="text-orange-700">A+ Hero 留位法：</strong>
          用 16:9 留出右侧 2/3 空间（preset 已经在 prompt 里指定）；
          下载后到 Canva / Figma 加 Slogan 文字。比直接 Ideogram 写文字可控得多。
        </li>
        <li>
          <strong className="text-orange-700">批量出图：</strong>
          准备 5 个 ASIN？依次切换 preset，每个 preset 跑 1 张草图（¥0.58 × 5 ≈ ¥3），
          挑出风格满意的再用 Pro 出最终稿。
        </li>
        <li>
          <strong className="text-orange-700">提示词复刻：</strong>
          每次出图后展开"查看完整 prompt"，复制保存到 Notion；下次同款产品改一个词就复用。
        </li>
        <li>
          <strong className="text-orange-700">人工 review：</strong>
          AI 偶尔会改细节（按钮位置、logo 朝向），上传亚马逊前过一遍肉眼对比，必要时 PS 修。
        </li>
      </ul>
    )
  }
];

export function ImageGenHelp() {
  const [openId, setOpenId] = useState<string | null>("steps");

  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] tracking-[0.18em] text-orange-600/70">
        使用说明
      </div>
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const isOpen = openId === section.id;
        return (
          <div
            key={section.id}
            className="overflow-hidden rounded-lg"
            style={{
              background: "#f8fafc",
              border: isOpen
                ? "1px solid rgba(249,115,22,0.32)"
                : "1px solid rgba(249,115,22,0.10)"
            }}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-500/[0.04]"
            >
              <div className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-slate-900">{section.title}</span>
              </div>
              <ChevronDown
                className="h-4 w-4 text-slate-500 transition-transform"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {isOpen ? (
              <div
                className="px-4 pb-4 pt-1"
                style={{
                  borderTop: "1px solid rgba(249,115,22,0.08)"
                }}
              >
                {section.body}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
