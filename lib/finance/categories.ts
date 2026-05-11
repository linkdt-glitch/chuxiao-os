import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { runAfter } from "@/lib/server/after";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinanceCategory, FinanceCategoryType } from "@/lib/finance/types";

// ──────────────────────────────────────────────────────────────────
// 缓存策略：类目改动极少（owner 一次性建好就不动），但几乎每个财务页都要读。
// HK/SZ 员工 → Render Oregon → Supabase 一次往返 ~150-200ms。
// 用 unstable_cache 缓存 5 分钟，命中后服务端零 DB 查询，纯内存返回。
// 任何 mutation 后用 revalidateTag 立即失效，不影响数据实时性。
// ──────────────────────────────────────────────────────────────────
const categoriesTag = (orgId: string) => `finance:${orgId}:categories`;

/**
 * 极简 6 大类（跨境电商 + AI 原生公司，第一性原理）：
 *   - 货物与物流：产品采购 / 国际物流 / 仓储 / 关税清关
 *   - 平台与渠道：平台月费佣金 / 广告投放 / 红人 Affiliate / 支付通道
 *   - AI 与软件工具：AI 模型调用 / SaaS 订阅 / 云服务 / 域名代码库
 *   - 人员与外包：工资奖金 / 社保公积金 / 外包兼职 / 招聘培训
 *   - 办公与差旅：房租水电 / 办公设备 / 差旅交通 / 商务餐饮 / 通讯
 *   - 品牌与其他：品牌设计 / 内容拍摄 / 法务税务 / 其他兜底
 *
 * 所有 type='both'，让收入 / 支出 / 报销都能用同一套。
 */
const MINIMAL_6_CATEGORIES = [
  { code: "goods_logistics", name: "货物与物流", description: "产品采购 / 国际物流 / 仓储 / 关税清关", sort_order: 10 },
  { code: "platform_channel", name: "平台与渠道", description: "平台月费佣金 / 广告投放 / 红人 Affiliate / 支付通道", sort_order: 20 },
  { code: "ai_tools", name: "AI 与软件工具", description: "AI 模型调用 / SaaS 订阅 / 云服务 / 域名代码库", sort_order: 30 },
  { code: "people", name: "人员与外包", description: "工资奖金 / 社保公积金 / 外包兼职 / 招聘培训", sort_order: 40 },
  { code: "office_travel", name: "办公与差旅", description: "房租水电 / 办公设备 / 差旅交通 / 商务餐饮 / 通讯", sort_order: 50 },
  { code: "brand_others", name: "品牌与其他", description: "品牌设计 / 内容拍摄 / 法务税务 / 其他兜底", sort_order: 60 }
] as const;

const MINIMAL_6_CODES = new Set(MINIMAL_6_CATEGORIES.map((c) => c.code));

/**
 * 确保组织的财务类目已迁移到「极简 6 大类」。幂等。
 *
 * 第一次调用（旧的 18+ 类目还在）：
 *   1. DELETE 该组织所有 finance_categories（子类目 cascade，旧流水的 category_id 因
 *      on delete set null 自动置空 → UI 显示「未分类」，老板可后续手动归类）
 *   2. INSERT 6 大类，type='both'，is_system=true，code 用作迁移标记
 *
 * 后续调用（已经是 6 大类）：直接返回，不做任何写操作。
 *
 * 用 admin client 是为了绕过 RLS（DELETE + INSERT 需要服务端权限）；
 * 调用方应当确保只在 owner/admin 视图上触发（避免普通员工误触发）。
 */
export async function ensureMinimal6FinanceCategories(organizationId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return; // 没有 service role key（本地 demo 模式）→ 直接跳过

  // 检查标记：只要 6 个新 code 任意一个已存在，就认为已经迁移过
  const { data: marker, error: markerError } = await admin
    .from("finance_categories")
    .select("id")
    .eq("organization_id", organizationId)
    .in("code", Array.from(MINIMAL_6_CODES))
    .limit(1);

  if (markerError) {
    // 表/字段不存在等 schema 问题 → 静默放过，不要拖死页面加载
    console.warn("[ensureMinimal6FinanceCategories] marker check failed:", markerError.message);
    return;
  }
  if (marker && marker.length > 0) return; // 已经是 6 大类，无需操作

  // 旧类目还在 → 全删后插入 6 大类
  const { error: deleteError } = await admin
    .from("finance_categories")
    .delete()
    .eq("organization_id", organizationId);
  if (deleteError) {
    console.warn("[ensureMinimal6FinanceCategories] delete old categories failed:", deleteError.message);
    return;
  }

  const { error: insertError } = await admin.from("finance_categories").insert(
    MINIMAL_6_CATEGORIES.map((c) => ({
      organization_id: organizationId,
      name: c.name,
      type: "both" as const,
      code: c.code,
      description: c.description,
      is_system: true,
      is_active: true,
      sort_order: c.sort_order
    }))
  );
  if (insertError) {
    console.warn("[ensureMinimal6FinanceCategories] insert new categories failed:", insertError.message);
    return;
  }
  // 迁移成功后让所有缓存失效，下次 getFinanceCategories 会拿到新的 6 大类
  revalidateTag("finance_categories");
}

export const demoFinanceCategories: FinanceCategory[] = [
  { id: "cat_product_sales", organization_id: "org_qiming", name: "商品销售收入", type: "income", description: "跨境电商商品销售", is_system: true, is_active: true, sort_order: 10, created_at: "", updated_at: "" },
  { id: "cat_service_subscription", organization_id: "org_qiming", name: "服务与订阅收入", type: "income", description: "AI 软件、技术服务和订阅", is_system: true, is_active: true, sort_order: 20, created_at: "", updated_at: "" },
  { id: "cat_other_income", organization_id: "org_qiming", name: "其他经营收入", type: "income", description: "", is_system: true, is_active: true, sort_order: 30, created_at: "", updated_at: "" },
  { id: "cat_sales_adjustment", organization_id: "org_qiming", name: "退款与销售调整", type: "income", description: "", is_system: true, is_active: true, sort_order: 40, created_at: "", updated_at: "" },
  { id: "cat_cogs", organization_id: "org_qiming", name: "商品成本", type: "expense", description: "采购、生产、包装、质检、打样", is_system: true, is_active: true, sort_order: 110, created_at: "", updated_at: "", children: [
    { id: "cat_cogs_purchase", organization_id: "org_qiming", parent_id: "cat_cogs", name: "采购 / 生产", type: "expense", description: "", is_system: true, is_active: true, sort_order: 111, created_at: "", updated_at: "" },
    { id: "cat_cogs_sample", organization_id: "org_qiming", parent_id: "cat_cogs", name: "包装 / 质检 / 打样", type: "expense", description: "", is_system: true, is_active: true, sort_order: 112, created_at: "", updated_at: "" }
  ] },
  { id: "cat_logistics", organization_id: "org_qiming", name: "物流仓储", type: "expense", description: "", is_system: true, is_active: true, sort_order: 120, created_at: "", updated_at: "" },
  { id: "cat_platform", organization_id: "org_qiming", name: "平台与渠道费用", type: "expense", description: "", is_system: true, is_active: true, sort_order: 130, created_at: "", updated_at: "" },
  { id: "cat_growth", organization_id: "org_qiming", name: "广告与增长", type: "expense", description: "", is_system: true, is_active: true, sort_order: 140, created_at: "", updated_at: "" },
  { id: "cat_payment_finance", organization_id: "org_qiming", name: "支付与金融费用", type: "expense", description: "", is_system: true, is_active: true, sort_order: 150, created_at: "", updated_at: "" },
  { id: "cat_ai_cloud", organization_id: "org_qiming", name: "软件、AI 与云服务", type: "expense", description: "", is_system: true, is_active: true, sort_order: 160, created_at: "", updated_at: "" },
  { id: "cat_people", organization_id: "org_qiming", name: "人工与外包", type: "expense", description: "", is_system: true, is_active: true, sort_order: 170, created_at: "", updated_at: "" },
  { id: "cat_rd", organization_id: "org_qiming", name: "研发与产品", type: "expense", description: "", is_system: true, is_active: true, sort_order: 180, created_at: "", updated_at: "" },
  { id: "cat_office", organization_id: "org_qiming", name: "办公与行政", type: "expense", description: "", is_system: true, is_active: true, sort_order: 190, created_at: "", updated_at: "" },
  { id: "cat_compliance", organization_id: "org_qiming", name: "专业服务与合规", type: "expense", description: "", is_system: true, is_active: true, sort_order: 200, created_at: "", updated_at: "" },
  { id: "cat_travel", organization_id: "org_qiming", name: "差旅与招待", type: "expense", description: "", is_system: true, is_active: true, sort_order: 210, created_at: "", updated_at: "" },
  { id: "cat_tax", organization_id: "org_qiming", name: "税费", type: "expense", description: "", is_system: true, is_active: true, sort_order: 220, created_at: "", updated_at: "" },
  { id: "cat_assets", organization_id: "org_qiming", name: "资产与折旧", type: "expense", description: "", is_system: true, is_active: true, sort_order: 230, created_at: "", updated_at: "" },
  { id: "cat_loss", organization_id: "org_qiming", name: "异常损失与调整", type: "expense", description: "", is_system: true, is_active: true, sort_order: 240, created_at: "", updated_at: "" }
];

function nestCategories(categories: FinanceCategory[]) {
  const byId = new Map(categories.map((category) => [category.id, { ...category, children: [] as FinanceCategory[] }]));
  const roots: FinanceCategory[] = [];
  byId.forEach((category) => {
    if (category.parent_id && byId.has(category.parent_id)) {
      byId.get(category.parent_id)?.children?.push(category);
    } else {
      roots.push(category);
    }
  });
  return roots.sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * 真正的 DB 读取，被 unstable_cache 包起来：
 *   - 缓存 key 包含 orgId，多组织不会串
 *   - 用 admin client 因为 unstable_cache 回调在请求上下文外执行（拿不到 cookies）
 *   - 安全：getFinanceCategories 入口已经 await getCurrentOrganization() 做了用户鉴权
 *   - 拉 active=true 的所有类目（无 type 过滤），过滤逻辑放到 caller 内存里做，
 *     避免 type 不同造成多份缓存（owner / member 同时打开各拉一份就浪费）
 */
const _getActiveFinanceCategoriesByOrg = unstable_cache(
  async (orgId: string): Promise<FinanceCategory[]> => {
    const admin = createSupabaseAdminClient();
    if (!admin) return [];
    const { data, error } = await admin
      .from("finance_categories")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as FinanceCategory[];
  },
  ["finance_categories_active_by_org"],
  { revalidate: 300, tags: ["finance_categories"] }
);

export async function getFinanceCategories(type?: FinanceCategoryType | "all") {
  const organization = await getCurrentOrganization();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoFinanceCategories;

  // 命中缓存就是 0ms 的内存返回；缓存 miss 走一次 admin 客户端
  const all = await _getActiveFinanceCategoriesByOrg(organization.id);

  // 过滤 type 在内存里做（不同 type 共享同一份缓存）
  const filtered = type && type !== "all"
    ? all.filter((c) => c.type === type || c.type === "both")
    : all;

  return nestCategories(filtered);
}

export async function createFinanceCategory(input: {
  name: string;
  type: FinanceCategoryType;
  parent_id?: string | null;
  code?: string | null;
  description?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data, error } = await supabase
    .from("finance_categories")
    .insert({
      organization_id: organization.id,
      name: input.name,
      type: input.type,
      parent_id: input.parent_id || null,
      code: input.code || null,
      description: input.description ?? "",
      is_system: false
    })
    .select()
    .single();

  if (error) throw error;
  // 立即让所有 getFinanceCategories 的缓存失效（不阻塞响应）
  revalidateTag("finance_categories");
  revalidatePath("/finance/categories");
  // 审计 + 事件 fire-and-forget，用户不需要等
  runAfter("finance.category.created", () => logAction({ event_key: "finance.category.created", action: "create", module: "finance", related_record_type: "finance_category", related_record_id: data.id, after_data: data }));
  runAfter("finance.category.created.event", () => emitEvent({ event_key: "finance.category.created", module: "finance", payload: { id: data.id, name: data.name } }));
  return data as FinanceCategory;
}

export async function updateFinanceCategory(id: string, input: Partial<Pick<FinanceCategory, "name" | "type" | "description" | "is_active" | "sort_order">>) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data: before } = await supabase.from("finance_categories").select("*").eq("organization_id", organization.id).eq("id", id).single();
  const { data, error } = await supabase.from("finance_categories").update(input).eq("organization_id", organization.id).eq("id", id).select().single();
  if (error) throw error;

  revalidateTag("finance_categories");
  revalidatePath("/finance/categories");
  runAfter("finance.category.updated", () => logAction({ event_key: "finance.category.updated", action: "update", module: "finance", related_record_type: "finance_category", related_record_id: id, before_data: before, after_data: data }));
  return data as FinanceCategory;
}
