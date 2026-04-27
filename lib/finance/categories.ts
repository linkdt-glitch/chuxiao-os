import { revalidatePath } from "next/cache";
import { getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinanceCategory, FinanceCategoryType } from "@/lib/finance/types";

export const demoFinanceCategories: FinanceCategory[] = [
  { id: "cat_sales", organization_id: "org_qiming", name: "销售收入", type: "income", description: "", is_system: true, is_active: true, sort_order: 10, created_at: "", updated_at: "" },
  { id: "cat_service", organization_id: "org_qiming", name: "服务收入", type: "income", description: "", is_system: true, is_active: true, sort_order: 20, created_at: "", updated_at: "" },
  { id: "cat_product", organization_id: "org_qiming", name: "产品成本", type: "expense", description: "", is_system: true, is_active: true, sort_order: 110, created_at: "", updated_at: "", children: [
    { id: "cat_sample", organization_id: "org_qiming", parent_id: "cat_product", name: "打样费", type: "expense", description: "", is_system: true, is_active: true, sort_order: 112, created_at: "", updated_at: "" },
    { id: "cat_purchase", organization_id: "org_qiming", parent_id: "cat_product", name: "采购成本", type: "expense", description: "", is_system: true, is_active: true, sort_order: 111, created_at: "", updated_at: "" }
  ] },
  { id: "cat_software", organization_id: "org_qiming", name: "软件与 AI 成本", type: "expense", description: "", is_system: true, is_active: true, sort_order: 140, created_at: "", updated_at: "" },
  { id: "cat_travel", organization_id: "org_qiming", name: "差旅招待", type: "expense", description: "", is_system: true, is_active: true, sort_order: 170, created_at: "", updated_at: "" }
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
  if (!supabase) return { ok: true };

  const { data: before } = await supabase.from("finance_categories").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("finance_categories").update(input).eq("id", id).select().single();
  if (error) throw error;

  await logAction({ event_key: "finance.category.updated", action: "update", module: "finance", related_record_type: "finance_category", related_record_id: id, before_data: before, after_data: data });
  revalidatePath("/finance/categories");
  return data as FinanceCategory;
}
