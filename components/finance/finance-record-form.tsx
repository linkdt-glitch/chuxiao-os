import { createFinanceRecordAction } from "@/app/(app)/finance/actions";
import { Button } from "@/components/ui/button";
import { FormPendingOverlay } from "@/components/ui/form-pending-overlay";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import Link from "next/link";
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
  submitLabel = "保存记录",
  canRecordExpense = true
}: {
  categories: FinanceCategory[];
  accounts: FinanceAccount[];
  defaults?: Partial<ParsedFinanceRecord> & { parse_log_id?: string };
  action?: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
  /**
   * 是否允许记录公司「支出」类型。
   * 默认 true（向后兼容）；非 owner/admin 应该传 false，
   * 这样会从类型下拉去掉「支出」选项 + 从类目下拉过滤掉 type=expense 的类目。
   */
  canRecordExpense?: boolean;
}) {
  // 非特权用户：去掉所有「纯支出」类目（type === "expense"），保留 income / both
  // both 类目（如「其他」）保留 —— 既可记收入也可记支出，灵活
  const visibleCategories = canRecordExpense
    ? categories
    : categories.filter((c) => c.type !== "expense");
  const flatCategories = flattenCategories(visibleCategories);
  const category = rootCategoryFor(visibleCategories, defaults?.category_name) ?? rootCategoryFor(visibleCategories, defaults?.subcategory_name);
  const subcategory = flatCategories.find((item) => item.name === defaults?.subcategory_name);
  const account = accounts.find((item) => item.name === defaults?.account_name);
  const fieldClass = "h-11 rounded-xl border-slate-200/80 bg-white/80 text-base shadow-sm sm:h-10 sm:text-sm";
  const selectClass = `${fieldClass} w-full px-3`;
  // 非特权用户的默认类型不应该是「支出」，改成「报销」（他们最常用的）
  const defaultRecordType = defaults?.record_type ?? (canRecordExpense ? "expense" : "reimbursement");

  return (
    <Card>
      <CardHeader>
        <CardTitle>记账信息</CardTitle>
        <p className="text-sm text-muted-foreground">先把核心信息记录清楚；需要审批的支出或报销会留在财务中心处理。</p>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <FormPendingOverlay label="正在保存记账..." estimatedSeconds={2} />
          {defaults?.parse_log_id ? <input type="hidden" name="parse_log_id" value={defaults.parse_log_id} /> : null}
          <input type="hidden" name="currency" value={defaults?.currency ?? "CNY"} />
          <input type="hidden" name="quantity" value={defaults?.quantity ?? 1} />
          <div className="space-y-2">
            <Label htmlFor="record_type">类型</Label>
            <select id="record_type" name="record_type" defaultValue={defaultRecordType} className={selectClass}>
              <option value="income">收入</option>
              {canRecordExpense ? <option value="expense">支出</option> : null}
              <option value="reimbursement">报销</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">金额</Label>
            <Input id="amount" name="amount" type="number" min="0" step="0.001" required defaultValue={defaults?.amount ?? ""} className={fieldClass} inputMode="decimal" placeholder="0.000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurred_at">日期</Label>
            <Input id="occurred_at" name="occurred_at" type="date" defaultValue={defaults?.occurred_at ?? new Date().toISOString().slice(0, 10)} className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">核心类目</Label>
            <select id="category_id" name="category_id" defaultValue={category?.id ?? ""} className={selectClass}>
              <option value="">先不分类</option>
              {visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account_id">账户</Label>
            <select id="account_id" name="account_id" defaultValue={account?.id ?? ""} className={selectClass}>
              <option value="">未选择</option>
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">说明</Label>
            <Textarea id="description" name="description" required defaultValue={defaults?.description ?? ""} className="min-h-28 rounded-xl border-slate-200/80 bg-white/80 text-base shadow-sm sm:text-sm" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="receipt_files">票据附件</Label>
            <Input id="receipt_files" name="receipt_files" type="file" multiple className={fieldClass} accept="image/*,.pdf" />
          </div>
          <details className="rounded-2xl border border-slate-200/80 bg-white/50 p-4 md:col-span-2">
            <summary className="cursor-pointer text-sm font-medium">更多信息</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subcategory_id">细分</Label>
                <select id="subcategory_id" name="subcategory_id" defaultValue={subcategory?.id ?? ""} className={selectClass}>
                  <option value="">不选</option>
                  {flatCategories.filter((item) => item.parent_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">支付方式</Label>
                <Input id="payment_method" name="payment_method" defaultValue={defaults?.payment_method ?? ""} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counterparty_name">供应商 / 客户</Label>
                <Input id="counterparty_name" name="counterparty_name" defaultValue={defaults?.counterparty_name ?? ""} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_name">项目</Label>
                <Input id="project_name" name="project_name" defaultValue={defaults?.project_name ?? ""} className={fieldClass} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">备注</Label>
                <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ""} className="rounded-xl border-slate-200/80 bg-white/80 text-base shadow-sm sm:text-sm" />
              </div>
            </div>
          </details>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200/80 bg-white/65 px-3 text-sm">
            <input type="checkbox" name="reimbursement_required" defaultChecked={defaults?.reimbursement_required} className="h-4 w-4" />
            需要报销
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200/80 bg-white/65 px-3 text-sm">
            <input type="checkbox" name="submit_for_approval" defaultChecked={defaults?.need_approval} className="h-4 w-4" />
            提交审批
          </label>
          {/* sticky 提交栏：之前 bottom-20 (80px) 不够，被 mobile-tabbar (h≈90px+safe-area) 挡住。
              改成跟 AssistantChat composer 同样的算法，让按钮永远浮在 tabbar 上方。 */}
          <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col-reverse gap-3 rounded-2xl border border-white/80 bg-white/82 p-3 shadow-[0_18px_46px_rgba(15,23,42,0.10)] backdrop-blur-xl md:static md:col-span-2 md:flex-row md:justify-end md:border-0 md:bg-transparent md:p-0 md:shadow-none md:bottom-auto">
            <Button type="button" variant="outline" asChild>
              <Link href="/finance/records">取消</Link>
            </Button>
            <FormSubmitButton pendingText="保存中...">{submitLabel}</FormSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
