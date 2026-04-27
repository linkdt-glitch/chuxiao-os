import { revalidatePath } from "next/cache";
import { getCurrentOrganization } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FinanceAccount, FinanceAccountType } from "@/lib/finance/types";

export const demoFinanceAccounts: FinanceAccount[] = [
  { id: "acc_cash", organization_id: "org_qiming", name: "公司现金", account_type: "cash", currency: "CNY", opening_balance: 0, current_balance: 8600, is_active: true, metadata: {}, created_at: "", updated_at: "" },
  { id: "acc_bank", organization_id: "org_qiming", name: "公司银行账户", account_type: "bank", currency: "CNY", opening_balance: 0, current_balance: 126000, is_active: true, metadata: {}, created_at: "", updated_at: "" },
  { id: "acc_wechat", organization_id: "org_qiming", name: "微信支付", account_type: "wechat", currency: "CNY", opening_balance: 0, current_balance: 5600, is_active: true, metadata: {}, created_at: "", updated_at: "" },
  { id: "acc_paypal", organization_id: "org_qiming", name: "PayPal", account_type: "paypal", currency: "USD", opening_balance: 0, current_balance: 3200, is_active: true, metadata: {}, created_at: "", updated_at: "" }
];

export async function getFinanceAccounts() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoFinanceAccounts;

  const { data, error } = await supabase
    .from("finance_accounts")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at");

  if (error) throw error;
  return (data ?? []) as FinanceAccount[];
}

export async function createFinanceAccount(input: {
  name: string;
  account_type: FinanceAccountType;
  currency: string;
  opening_balance?: number;
  current_balance?: number;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const openingBalance = input.opening_balance ?? 0;
  const { data, error } = await supabase
    .from("finance_accounts")
    .insert({
      organization_id: organization.id,
      name: input.name,
      account_type: input.account_type,
      currency: input.currency || "CNY",
      opening_balance: openingBalance,
      current_balance: input.current_balance ?? openingBalance
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({ event_key: "finance.account.created", action: "create", module: "finance", related_record_type: "finance_account", related_record_id: data.id, after_data: data });
  await emitEvent({ event_key: "finance.account.created", module: "finance", payload: { id: data.id, name: data.name } });
  revalidatePath("/finance/accounts");
  return data as FinanceAccount;
}

export async function updateFinanceAccount(id: string, input: Partial<Pick<FinanceAccount, "name" | "account_type" | "currency" | "current_balance" | "is_active">>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { data: before } = await supabase.from("finance_accounts").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("finance_accounts").update(input).eq("id", id).select().single();
  if (error) throw error;

  await logAction({ event_key: "finance.account.updated", action: "update", module: "finance", related_record_type: "finance_account", related_record_id: id, before_data: before, after_data: data });
  revalidatePath("/finance/accounts");
  return data as FinanceAccount;
}
