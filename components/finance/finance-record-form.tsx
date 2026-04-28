import { createFinanceRecordAction } from "@/app/(app)/finance/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FinanceAccount, FinanceCategory, ParsedFinanceRecord } from "@/lib/finance/types";

function flattenCategories(categories: FinanceCategory[]) {
  return categories.flatMap((category) => [category, ...(category.children ?? [])]);
}

function rootCategoryFor(categories: FinanceCategory[], name?: string) {
  if (!name) return undefined;
  return categories.find((item) => item.name === name || item.children?.some((child) => child.name === name));
}

export function FinanceRecordForm({
  categories,
  accounts,
  defaults,
  action = createFinanceRecordAction,
  submitLabel = "保存记录"
}: {
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  defaults?: Partial<ParsedFinanceRecord> & { parse_log_id?: string };
  action?: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
}) {
  const flatCategories = flattenCategories(categories);
  const category = rootCategoryFor(categories, defaults?.category_name) ?? rootCategoryFor(categories, defaults?.subcategory_name);
  const subcategory = flatCategories.find((item) => item.name === defaults?.subcategory_name);
  const account = accounts.find((item) => item.name === defaults?.account_name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>记账信息</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          {defaults?.parse_log_id ? <input type="hidden" name="parse_log_id" value={defaults.parse_log_id} /> : null}
          <input type="hidden" name="currency" value={defaults?.currency ?? "CNY"} />
          <input type="hidden" name="quantity" value={defaults?.quantity ?? 1} />
          <div className="space-y-2">
            <Label htmlFor="record_type">类型</Label>
            <select id="record_type" name="record_type" defaultValue={defaults?.record_type ?? "expense"} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="income">收入</option>
              <option value="expense">支出</option>
              <option value="reimbursement">报销</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">金额</Label>
            <Input id="amount" name="amount" type="number" min="0" step="0.01" required defaultValue={defaults?.amount ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurred_at">日期</Label>
            <Input id="occurred_at" name="occurred_at" type="date" defaultValue={defaults?.occurred_at ?? new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">核心类目</Label>
            <select id="category_id" name="category_id" defaultValue={category?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">先不分类</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account_id">账户</Label>
            <select id="account_id" name="account_id" defaultValue={account?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">未选择</option>
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">说明</Label>
            <Textarea id="description" name="description" required defaultValue={defaults?.description ?? ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="receipt_files">票据附件</Label>
            <Input id="receipt_files" name="receipt_files" type="file" multiple />
          </div>
          <details className="rounded-md border bg-muted/20 p-3 md:col-span-2">
            <summary className="cursor-pointer text-sm font-medium">更多信息</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subcategory_id">细分</Label>
                <select id="subcategory_id" name="subcategory_id" defaultValue={subcategory?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">不选</option>
                  {flatCategories.filter((item) => item.parent_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">支付方式</Label>
                <Input id="payment_method" name="payment_method" defaultValue={defaults?.payment_method ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterparty_name">供应商 / 客户</Label>
                <Input id="counterparty_name" name="counterparty_name" defaultValue={defaults?.counterparty_name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_name">项目</Label>
                <Input id="project_name" name="project_name" defaultValue={defaults?.project_name ?? ""} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} />
              </div>
            </div>
          </details>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="reimbursement_required" defaultChecked={defaults?.reimbursement_required} />
            需要报销
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="submit_for_approval" defaultChecked={defaults?.need_approval} />
            提交审批
          </label>
          <div className="md:col-span-2">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
