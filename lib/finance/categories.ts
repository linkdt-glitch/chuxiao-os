import { revalidatePath } from "next/cache";
import { getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinanceCategory, FinanceCategoryType } from "@/lib/finance/types";

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

export async function getFinanceCategories(type?: FinanceCategoryType | "all") {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoFinanceCategories;

  let query = supabase
    .from("finance_categories")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .order("sort_order");

  if (type && type !== "all") query = query.in("type", [type, "both"]);

  const { data, error } = await query;
  if (error) throw error;
  return nestCategories((data ?? []) as FinanceCategory[]);
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
  await logAction({ event_key: "finance.category.created", action: "create", module: "finance", related_record_type: "finance_category", related_record_id: data.id, after_data: data });
  await emitEvent({ event_key: "finance.category.created", module: "finance", payload: { id: data.id, name: data.name } });
  revalidatePath("/finance/categories");
  return data as FinanceCategory;
}

export async function updateFinanceCategory(id: string, input: Partial<Pick<FinanceCategory, "name" | "type" | "description" | "is_active" | "sort_order">>) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data: before } = await supabase.from("finance_categories").select("*").eq("organization_id", organization.id).eq("id", id).single();
  const { data, error } = await supabase.from("finance_categories").update(input).eq("organization_id", organization.id).eq("id", id).select().single();
  if (error) throw error;

  await logAction({ event_key: "finance.category.updated", action: "update", module: "finance", related_record_type: "finance_category", related_record_id: id, before_data: before, after_data: data });
  revalidatePath("/finance/categories");
  return data as FinanceCategory;
}
