/**
 * Amazon seller image presets — 直出工作流定义
 *
 * 每个 preset 把"亚马逊场景"翻译成 fal.ai 的：
 *   - 推荐模型 (modelId)
 *   - 推荐图片尺寸 (imageSize)
 *   - prompt 模板（含 {field} 占位符）
 *   - 用户需要填的字段及其选项
 *
 * 前端选 preset → 用户填空 → buildPrompt() 拼出英文 prompt → 调 /api/ai/image-gen
 */

export type PresetCategory = "main" | "secondary" | "aplus";

export type PresetField = {
  /** Field key used in prompt template like `{product_name}`. */
  key: string;
  /** Chinese label shown in UI. */
  label: string;
  /** "text" — free text; "select" — radio chips. */
  kind: "text" | "select";
  /** Placeholder hint for text inputs. */
  placeholder?: string;
  /** For select kind: options + their English mapping for prompt. */
  options?: Array<{ value: string; label: string; promptText: string }>;
  /** Optional default value. */
  defaultValue?: string;
  required?: boolean;
};

export type AmazonImageSize =
  | "square_hd"
  | "square"
  | "portrait_4_3"
  | "portrait_16_9"
  | "landscape_4_3"
  | "landscape_16_9";

export type AmazonPreset = {
  id: string;
  category: PresetCategory;
  /** Chinese title shown on the preset card. */
  title: string;
  /** One-line description shown on card. */
  blurb: string;
  /** Amazon spec note — surfaced as a hint in the form. */
  spec: string;
  /** fal endpoint id (must be in IMAGE_MODELS). */
  recommendedModelId: string;
  /** fal image_size enum. */
  imageSize: AmazonImageSize;
  /** Output dimensions hint (for UI). */
  dimensionsHint: string;
  /** prompt template with `{field_key}` placeholders. */
  promptTemplate: string;
  /** User-fillable fields. */
  fields: PresetField[];
};

const angleField: PresetField = {
  key: "angle",
  label: "拍摄角度",
  kind: "select",
  defaultValue: "front",
  options: [
    { value: "front", label: "正面", promptText: "front view, straight-on angle" },
    { value: "three_quarter", label: "45° 斜角", promptText: "three-quarter view, 45-degree angle" },
    { value: "top_down", label: "俯视", promptText: "top-down overhead view" },
    { value: "side", label: "侧面", promptText: "side profile view" }
  ]
};

const personField: PresetField = {
  key: "person",
  label: "使用人物",
  kind: "select",
  defaultValue: "young_woman",
  options: [
    { value: "young_woman", label: "年轻女性", promptText: "young woman in her 20s-30s" },
    { value: "young_man", label: "年轻男性", promptText: "young man in his 20s-30s" },
    { value: "family", label: "家庭", promptText: "happy family with parents and child" },
    { value: "elderly", label: "中老年", promptText: "person in their 50s-60s" },
    { value: "kid", label: "儿童", promptText: "happy child, age 6-10" },
    { value: "hands_only", label: "只露双手", promptText: "only hands visible, no face" }
  ]
};

const sceneField: PresetField = {
  key: "scene",
  label: "使用场景",
  kind: "select",
  defaultValue: "modern_living_room",
  options: [
    { value: "modern_living_room", label: "现代客厅", promptText: "bright modern living room with natural light" },
    { value: "kitchen", label: "厨房", promptText: "clean modern kitchen counter" },
    { value: "bedroom", label: "卧室", promptText: "cozy bedroom with soft natural light" },
    { value: "office", label: "办公室", promptText: "minimalist home office desk" },
    { value: "outdoor", label: "户外", promptText: "outdoor natural setting, sunlight" },
    { value: "gym", label: "健身房", promptText: "modern gym interior" },
    { value: "bathroom", label: "浴室", promptText: "clean bright bathroom" }
  ]
};

export const AMAZON_PRESETS: AmazonPreset[] = [
  // ── 主图 (Main Image) ─────────────────────────────────────────
  {
    id: "main_white",
    category: "main",
    title: "标准主图（纯白底）",
    blurb: "亚马逊强制：纯白背景 #FFFFFF，商品占图 85%，不可有人物 / 文字 / 配件。",
    spec: "≥1000×1000（推荐 2000+）· 纯白底必须",
    recommendedModelId: "fal-ai/flux-pro/v1.1-ultra",
    imageSize: "square_hd",
    dimensionsHint: "1024×1024（建议生成后 upscale 至 2000+）",
    promptTemplate:
      "Professional Amazon main product photography of {product_name}, {extra_details}, isolated on PURE WHITE background (RGB 255,255,255, no shadows on background), studio lighting, soft realistic shadows under product only, sharp focus, perfectly centered, product fills 85% of frame, {angle}, hyperrealistic, commercial e-commerce photography, ultra-detailed, 8k, no text, no watermark, no people, no accessories",
    fields: [
      {
        key: "product_name",
        label: "产品",
        kind: "text",
        placeholder: "例如：white ceramic coffee mug, 350ml",
        required: true
      },
      {
        key: "extra_details",
        label: "颜色 / 材质（可选）",
        kind: "text",
        placeholder: "例如：matte black aluminum, with subtle texture",
        defaultValue: ""
      },
      angleField
    ]
  },

  // ── 附图 (Secondary Images) ────────────────────────────────────
  {
    id: "sec_lifestyle",
    category: "secondary",
    title: "附图 · 生活方式",
    blurb: "真人使用场景，自然光、环境感，激发购买欲。",
    spec: "≥1000×1000，背景不限，可以有人和场景",
    recommendedModelId: "fal-ai/flux-pro/v1.1",
    imageSize: "square_hd",
    dimensionsHint: "1024×1024",
    promptTemplate:
      "Lifestyle photography: {person} happily using {product_name} in {scene}, natural lighting, photorealistic, candid genuine moment, shallow depth of field, warm tones, commercial editorial style, no text overlay",
    fields: [
      {
        key: "product_name",
        label: "产品",
        kind: "text",
        placeholder: "例如：white ceramic coffee mug",
        required: true
      },
      personField,
      sceneField
    ]
  },
  {
    id: "sec_closeup",
    category: "secondary",
    title: "附图 · 特写细节",
    blurb: "强调材质、纹理、工艺、按键、接口等细节卖点。",
    spec: "≥1000×1000，背景柔和，主体清晰",
    recommendedModelId: "fal-ai/flux-pro/v1.1-ultra",
    imageSize: "square_hd",
    dimensionsHint: "1024×1024（建议 upscale 至 2000+）",
    promptTemplate:
      "Macro extreme closeup product photography of {product_name}, highlighting {detail}, ultra-sharp details, shallow depth of field, soft studio lighting, gradient white background, premium commercial product photography, 8k, no text",
    fields: [
      {
        key: "product_name",
        label: "产品",
        kind: "text",
        placeholder: "例如：leather wallet",
        required: true
      },
      {
        key: "detail",
        label: "强调部位",
        kind: "select",
        defaultValue: "texture",
        options: [
          { value: "texture", label: "材质纹理", promptText: "the texture and material" },
          { value: "stitching", label: "接缝/工艺", promptText: "the stitching and craftsmanship" },
          { value: "buttons", label: "按键/接口", promptText: "the buttons, ports and controls" },
          { value: "logo", label: "logo / 品牌标识", promptText: "the embossed logo and brand mark" },
          { value: "edge", label: "边缘/曲线", promptText: "the curves and edges" }
        ]
      }
    ]
  },
  {
    id: "sec_inuse",
    category: "secondary",
    title: "附图 · 应用场景（手部）",
    blurb: "手在使用产品，强调功能、操作方式。比 lifestyle 更聚焦。",
    spec: "≥1000×1000",
    recommendedModelId: "fal-ai/flux-pro/v1.1",
    imageSize: "square_hd",
    dimensionsHint: "1024×1024",
    promptTemplate:
      "Hands using {product_name} for {use_case}, only hands and product visible, photorealistic, professional product photography, soft natural lighting, clean blurred background, focus on the action, commercial editorial style",
    fields: [
      {
        key: "product_name",
        label: "产品",
        kind: "text",
        placeholder: "例如：electric toothbrush",
        required: true
      },
      {
        key: "use_case",
        label: "用途/动作",
        kind: "text",
        placeholder: "例如：gently brushing teeth in the morning",
        required: true
      }
    ]
  },
  {
    id: "sec_packaging",
    category: "secondary",
    title: "附图 · 包装展示",
    blurb: "产品 + 包装盒，凸显礼品感、品牌质感。",
    spec: "≥1000×1000",
    recommendedModelId: "fal-ai/flux-pro/v1.1",
    imageSize: "square_hd",
    dimensionsHint: "1024×1024",
    promptTemplate:
      "{product_name} together with its {packaging_style} packaging box, both elegantly arranged, soft studio lighting, gradient light gray to white background, premium unboxing presentation, commercial product photography, 8k, no text",
    fields: [
      {
        key: "product_name",
        label: "产品",
        kind: "text",
        placeholder: "例如：bluetooth earbuds",
        required: true
      },
      {
        key: "packaging_style",
        label: "包装风格",
        kind: "select",
        defaultValue: "premium_giftbox",
        options: [
          { value: "premium_giftbox", label: "高端礼盒", promptText: "premium luxury gift box" },
          { value: "minimalist", label: "极简", promptText: "minimalist clean white box" },
          { value: "kraft_eco", label: "环保牛皮纸", promptText: "eco-friendly kraft paper packaging" },
          { value: "colorful", label: "彩色印刷", promptText: "colorful printed retail box" }
        ]
      }
    ]
  },

  // ── A+ Content ────────────────────────────────────────────────
  {
    id: "aplus_hero_text",
    category: "aplus",
    title: "A+ Hero Banner（带文字）",
    blurb: "横版主视觉，可叠加 Slogan / 卖点文字。Ideogram v2 文字渲染强。",
    spec: "横版 16:9，建议 970×600 或 1464×600（需 upscale）",
    recommendedModelId: "fal-ai/ideogram/v2",
    imageSize: "landscape_16_9",
    dimensionsHint: "1024×576（再 upscale）",
    promptTemplate:
      'Wide cinematic Amazon A+ hero banner, {product_name} as hero subject on the left third, {theme} atmosphere, dramatic professional studio lighting, leaving negative space on the right two-thirds for text overlay, large bold text saying "{headline}" rendered clearly on the right side, premium commercial banner, ultra-wide composition',
    fields: [
      {
        key: "product_name",
        label: "产品",
        kind: "text",
        placeholder: "例如：smart water bottle",
        required: true
      },
      {
        key: "headline",
        label: "标题文字（英文，会渲染到图里）",
        kind: "text",
        placeholder: "例如：HYDRATE SMARTER",
        required: true
      },
      {
        key: "theme",
        label: "氛围",
        kind: "select",
        defaultValue: "premium",
        options: [
          { value: "premium", label: "高端奢华", promptText: "luxurious dark premium" },
          { value: "warm", label: "温馨家庭", promptText: "warm cozy homey" },
          { value: "tech", label: "科技未来", promptText: "futuristic tech with blue accent lights" },
          { value: "natural", label: "自然环保", promptText: "natural earthy with greenery" },
          { value: "fitness", label: "活力健身", promptText: "energetic fitness with motion" }
        ]
      }
    ]
  },
  {
    id: "aplus_lifestyle_banner",
    category: "aplus",
    title: "A+ 生活方式横幅",
    blurb: "纯图无文字的宽横幅，配合后期排版工具加字。",
    spec: "横版 16:9，建议 970×600",
    recommendedModelId: "fal-ai/flux-pro/v1.1",
    imageSize: "landscape_16_9",
    dimensionsHint: "1024×576",
    promptTemplate:
      "Wide cinematic Amazon A+ lifestyle banner, {person} using {product_name} in {scene}, natural lighting, ultra-wide aspect ratio, commercial editorial photography, leaving space at top and right for text, no text overlay, no watermark",
    fields: [
      {
        key: "product_name",
        label: "产品",
        kind: "text",
        placeholder: "例如：smart water bottle",
        required: true
      },
      personField,
      sceneField
    ]
  },
  {
    id: "aplus_icon",
    category: "aplus",
    title: "A+ 图标 / 比较卡",
    blurb: "扁平矢量图标，用于 A+ 比较表、卖点 icon、特性图。",
    spec: "方形，建议 600×600",
    recommendedModelId: "fal-ai/recraft-v3",
    imageSize: "square_hd",
    dimensionsHint: "1024×1024",
    promptTemplate:
      "Flat vector minimalist icon representing {concept}, single subject, clean modern brand-friendly style, white background, simple two-color palette, no text, suitable for Amazon A+ comparison chart",
    fields: [
      {
        key: "concept",
        label: "图标描述（英文）",
        kind: "text",
        placeholder: "例如：water-resistant shield, leaf, lightning bolt for fast charging",
        required: true
      }
    ]
  }
];

const PRESET_BY_ID = new Map(AMAZON_PRESETS.map((p) => [p.id, p]));

export function getPresetById(id: string | undefined | null): AmazonPreset | undefined {
  if (!id) return undefined;
  return PRESET_BY_ID.get(id);
}

export function getPresetsByCategory(category: PresetCategory) {
  return AMAZON_PRESETS.filter((p) => p.category === category);
}

/**
 * Compose final fal prompt from preset template + user-filled values.
 * - text fields: trim and inject directly
 * - select fields: look up the option's promptText (English mapping)
 * - missing optional fields: replace with empty + collapse leftover commas/spaces
 */
export function buildPromptFromPreset(
  preset: AmazonPreset,
  values: Record<string, string>
): { prompt: string; missing: string[] } {
  const missing: string[] = [];
  let prompt = preset.promptTemplate;

  for (const field of preset.fields) {
    const raw = (values[field.key] ?? field.defaultValue ?? "").trim();
    if (field.required && !raw) {
      missing.push(field.label);
    }

    let injected = raw;
    if (field.kind === "select" && raw) {
      const option = field.options?.find((o) => o.value === raw);
      injected = option?.promptText ?? raw;
    }

    prompt = prompt.replaceAll(`{${field.key}}`, injected);
  }

  // Tidy: collapse "  ", " ,", ", ," etc that appear when optional fields were empty.
  prompt = prompt
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*$/g, "")
    .trim();

  return { prompt, missing };
}
