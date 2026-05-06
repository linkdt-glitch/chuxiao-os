/**
 * Amazon seller image presets — 直出工作流定义
 *
 * 两种工作模式：
 *  - mode: "edit"  →  用户上传 1+ 张产品照 → Nano Banana edit → 风格化
 *  - mode: "text"  →  无上传 → 纯文字生成 → Flux / Recraft / Ideogram
 *
 * 每个 preset 把"亚马逊场景"翻译成 fal.ai 调用所需的：
 *   - 推荐模型 (modelId)
 *   - 图片尺寸 / aspect ratio（按 fal API 形态）
 *   - prompt 模板（含 {field} 占位符）
 *   - 用户需要填的字段
 *
 * Prompt 风格基于：
 *  - Amazon 卖家产品摄影社区 2026 通用 prompt
 *  - "5-element formula"：产品 + 背景 + 光线 + 角度 + 氛围
 *  - 厨房/小家电品类常用场景：大理石晨光 / 木质农舍 / 北欧极简 / 工业风
 */

export type PresetCategory = "main" | "secondary" | "aplus";

export type PresetMode = "edit" | "text";

export type PresetField = {
  key: string;
  label: string;
  kind: "text" | "select";
  placeholder?: string;
  options?: Array<{ value: string; label: string; promptText: string }>;
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

/** Nano Banana edit aspect ratios. */
export type AmazonAspectRatio =
  | "1:1"
  | "4:5"
  | "5:4"
  | "3:4"
  | "4:3"
  | "2:3"
  | "3:2"
  | "9:16"
  | "16:9"
  | "21:9";

export type AmazonPreset = {
  id: string;
  category: PresetCategory;
  /** "edit" needs uploaded reference photos; "text" is pure text-to-image. */
  mode: PresetMode;
  title: string;
  blurb: string;
  /** Compliance / spec note shown on card. */
  spec: string;
  /** fal endpoint id (must be in IMAGE_MODELS). */
  recommendedModelId: string;
  /** For mode:"text" — fal image_size enum. */
  imageSize?: AmazonImageSize;
  /** For mode:"edit" — aspect ratio enum for Nano Banana. */
  aspectRatio?: AmazonAspectRatio;
  /** Output dimensions hint (UI). */
  dimensionsHint: string;
  /** prompt template with `{field_key}` placeholders. */
  promptTemplate: string;
  fields: PresetField[];
};

// ── Reusable fields ───────────────────────────────────────────────
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

const themeField: PresetField = {
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
};

// ── Constants used in many "edit" prompts to lock the product ────
const KEEP_INSTRUCTION =
  "keep the product EXACTLY identical in shape, color, material, proportions and details — do not redraw, restyle or replace it";

export const AMAZON_PRESETS: AmazonPreset[] = [
  // ──────────────────────────────────────────────────────────────
  // 主图 (Main Image)
  // ──────────────────────────────────────────────────────────────
  {
    id: "main_edit_white",
    category: "main",
    mode: "edit",
    title: "📷 上传照 → 抠图换纯白底",
    blurb: "上传你手机拍的产品照（背景乱也没事），AI 抠图换纯白底 + 加柔和投影，亚马逊主图直出。",
    spec: "纯白底 #FFFFFF · 1:1 · 主图必用",
    recommendedModelId: "fal-ai/nano-banana-pro/edit",
    aspectRatio: "1:1",
    dimensionsHint: "约 1024×1024，建议后期 upscale 至 2000+",
    promptTemplate:
      "Transform this product photo into a professional Amazon main image: cleanly remove and replace the entire background with PURE WHITE (RGB 255,255,255, no off-white, no gradient), " +
      KEEP_INSTRUCTION +
      ", add only a single subtle realistic soft drop shadow directly beneath the product (no other shadows on the white background), sharp focus, perfectly centered, product fills 85% of frame, studio softbox lighting, commercial e-commerce photography, no text, no watermark, no people, no accessories.",
    fields: []
  },
  {
    id: "main_text_white",
    category: "main",
    mode: "text",
    title: "✏️ 纯文字生成主图（无原图）",
    blurb: "没有产品照？纯文字描述生成。建议用 Flux Pro Ultra 拿真实感。",
    spec: "≥1000×1000（推荐 2000+）· 纯白底",
    recommendedModelId: "fal-ai/flux-pro/v1.1-ultra",
    imageSize: "square_hd",
    dimensionsHint: "1024×1024",
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

  // ──────────────────────────────────────────────────────────────
  // 附图 — 厨房 / 小家电场景化（图生图）
  // ──────────────────────────────────────────────────────────────
  {
    id: "sec_edit_marble_morning",
    category: "secondary",
    mode: "edit",
    title: "📷 大理石台面 · 晨光",
    blurb: "把产品摆在白色大理石厨房台面，窗边晨光，柔和阴影。**厨房小家电首选**。",
    spec: "1:1 · 厨房品类生活方式",
    recommendedModelId: "fal-ai/nano-banana-2/edit",
    aspectRatio: "1:1",
    dimensionsHint: "约 1024×1024",
    promptTemplate:
      "Place this exact product on a clean white marble kitchen countertop, soft warm morning light streaming in from a large window on the right side, gentle directional shadows under the product, slightly blurred background showing a bright modern kitchen with white cabinets and a hint of greenery, natural daylight, shallow depth of field, photorealistic commercial lifestyle photography, " +
      KEEP_INSTRUCTION +
      ", no text, no watermark.",
    fields: []
  },
  {
    id: "sec_edit_farmhouse_wood",
    category: "secondary",
    mode: "edit",
    title: "📷 木质农舍 · 温暖风",
    blurb: "产品放温暖木质台面，悬挂铜锅，秋日金色光。**有机/手作/家用厨具风**。",
    spec: "1:1 · 厨房品类生活方式",
    recommendedModelId: "fal-ai/nano-banana-2/edit",
    aspectRatio: "1:1",
    dimensionsHint: "约 1024×1024",
    promptTemplate:
      "Place this exact product on a rustic warm wooden farmhouse kitchen table with visible wood grain, golden afternoon sunlight streaming from the side, slightly blurred cozy farmhouse kitchen background with hanging copper pots and pans, autumn warm tones, soft directional shadows, photorealistic editorial commercial product photography, shallow depth of field, " +
      KEEP_INSTRUCTION +
      ", no text, no watermark.",
    fields: []
  },
  {
    id: "sec_edit_scandi_minimalist",
    category: "secondary",
    mode: "edit",
    title: "📷 北欧极简 · 浅木+白墙",
    blurb: "浅橡木台面、白墙、自然柔光，极简性冷淡风。**现代家电品牌偏好**。",
    spec: "1:1 · 北欧/极简品牌调性",
    recommendedModelId: "fal-ai/nano-banana-2/edit",
    aspectRatio: "1:1",
    dimensionsHint: "约 1024×1024",
    promptTemplate:
      "Place this exact product in a bright Scandinavian minimalist kitchen, light oak wooden countertop, clean white walls, natural soft daylight from a large window, very clean composition with generous negative space, slightly blurred minimalist background with at most one ceramic vase or small plant, neutral color palette, photorealistic commercial photography, shallow depth of field, " +
      KEEP_INSTRUCTION +
      ", no text, no watermark.",
    fields: []
  },
  {
    id: "sec_edit_industrial_chef",
    category: "secondary",
    mode: "edit",
    title: "📷 工业不锈钢 · 主厨级",
    blurb: "拉丝不锈钢台面、戏剧侧光、暗调背景。**高端厨电、专业感**。",
    spec: "1:1 · 高端/专业厨房调性",
    recommendedModelId: "fal-ai/nano-banana-pro/edit",
    aspectRatio: "1:1",
    dimensionsHint: "约 1024×1024",
    promptTemplate:
      "Place this exact product on a brushed stainless steel countertop in a professional chef's industrial kitchen, dramatic side lighting from the left, dark moody background with subtle reflections, rim lighting on the product highlighting its premium build, photorealistic high-end commercial product photography emphasizing quality and craftsmanship, " +
      KEEP_INSTRUCTION +
      ", no text, no watermark.",
    fields: []
  },
  {
    id: "sec_edit_in_use_hands",
    category: "secondary",
    mode: "edit",
    title: "📷 手部使用 · 应用场景",
    blurb: "加一只手在使用产品，自然光厨房，无人脸。**展示功能、操作方式**。",
    spec: "1:1 · 应用场景图",
    recommendedModelId: "fal-ai/nano-banana-2/edit",
    aspectRatio: "1:1",
    dimensionsHint: "约 1024×1024",
    promptTemplate:
      "Show a hand naturally {hand_action} this exact product in a clean modern kitchen, soft natural lighting from a window, only the hand and product clearly visible, slightly blurred kitchen background with subtle styling, photorealistic candid editorial moment capturing the action, shallow depth of field, " +
      KEEP_INSTRUCTION +
      ", no text, no watermark.",
    fields: [
      {
        key: "hand_action",
        label: "手部动作（英文）",
        kind: "text",
        placeholder: "例如：holding gently / pressing the button / pouring coffee from",
        required: true,
        defaultValue: "holding"
      }
    ]
  },
  {
    id: "sec_edit_freestyle",
    category: "secondary",
    mode: "edit",
    title: "📷 自由风格 · 你描述",
    blurb: "自己写场景描述（中文/英文都行），产品保持不变，只换环境。",
    spec: "1:1 · 完全自定义",
    recommendedModelId: "fal-ai/nano-banana-2/edit",
    aspectRatio: "1:1",
    dimensionsHint: "约 1024×1024",
    promptTemplate:
      "{custom_scene}, " +
      KEEP_INSTRUCTION +
      ", photorealistic commercial product photography, shallow depth of field, no text, no watermark.",
    fields: [
      {
        key: "custom_scene",
        label: "你想要的场景（英文效果更好）",
        kind: "text",
        placeholder: "例如：Place this product on a sun-drenched outdoor patio with greenery, golden hour light",
        required: true
      }
    ]
  },

  // ── 文生图附图（不需要原图） ─────────────────────────────────────
  {
    id: "sec_text_lifestyle",
    category: "secondary",
    mode: "text",
    title: "✏️ 文生图 · 生活方式",
    blurb: "无原图：纯文字生成真人使用场景。",
    spec: "1024×1024 · 文生图",
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
    id: "sec_text_closeup",
    category: "secondary",
    mode: "text",
    title: "✏️ 文生图 · 特写细节",
    blurb: "无原图：宏观特写凸显材质 / 工艺 / 接口卖点。",
    spec: "1024×1024 · 文生图",
    recommendedModelId: "fal-ai/flux-pro/v1.1-ultra",
    imageSize: "square_hd",
    dimensionsHint: "1024×1024",
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

  // ──────────────────────────────────────────────────────────────
  // A+ Content
  // ──────────────────────────────────────────────────────────────
  {
    id: "aplus_edit_hero",
    category: "aplus",
    mode: "edit",
    title: "📷 A+ Hero Banner · 产品图",
    blurb: "上传产品图 → 自动放进宽幅戏剧光 banner，右侧留出文字空间（你后期 PS 加字）。",
    spec: "16:9 横版 · 留文字空间",
    recommendedModelId: "fal-ai/nano-banana-pro/edit",
    aspectRatio: "16:9",
    dimensionsHint: "约 1280×720",
    promptTemplate:
      "Use this exact product as the hero subject placed on the LEFT THIRD of a wide cinematic Amazon A+ Hero Banner, {theme} atmosphere, dramatic professional studio lighting from above-left, leaving the RIGHT TWO-THIRDS as clean negative space for text overlay (no text in the image itself), premium commercial banner photography, shallow depth of field, " +
      KEEP_INSTRUCTION +
      ".",
    fields: [themeField]
  },
  {
    id: "aplus_text_hero_with_text",
    category: "aplus",
    mode: "text",
    title: "✏️ A+ Hero Banner · 带 Slogan",
    blurb: "无原图：纯文字生成 + 直接把英文 Slogan 渲染到图里（Ideogram 文字最强）。",
    spec: "16:9 · 文字渲染",
    recommendedModelId: "fal-ai/ideogram/v2",
    imageSize: "landscape_16_9",
    dimensionsHint: "1024×576",
    promptTemplate:
      'Wide cinematic Amazon A+ hero banner, {product_name} as hero subject on the left third, {theme} atmosphere, dramatic professional studio lighting, large bold text saying "{headline}" rendered clearly on the right side, premium commercial banner, ultra-wide composition',
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
        label: "标题文字（英文，会写到图里）",
        kind: "text",
        placeholder: "例如：HYDRATE SMARTER",
        required: true
      },
      themeField
    ]
  },
  {
    id: "aplus_text_icon",
    category: "aplus",
    mode: "text",
    title: "✏️ A+ 图标 / 比较卡",
    blurb: "无原图：扁平矢量图标，A+ 比较表 / 卖点 icon 用。",
    spec: "方形 · 矢量插画",
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
 * - missing required fields: returned in `missing[]` for UI to surface
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

  prompt = prompt
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*$/g, "")
    .trim();

  return { prompt, missing };
}
