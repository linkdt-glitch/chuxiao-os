import Link from "next/link";
import { ArrowLeft, FileText, Save, Send } from "lucide-react";
import { createExpenseReportAction } from "@/app/(app)/finance/reimbursements/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Department, ExpenseTemplate } from "@/lib/finance/expense-types";
import type { FinanceCategory } from "@/lib/finance/types";

export function ExpenseReportForm({
  departments,
  categories,
  templates
}: {
  departments: Department[];
  categories: FinanceCategory[];
  templates: ExpenseTemplate[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const fieldClass = "h-11 rounded-xl border-slate-200/80 bg-white/80 text-base shadow-sm sm:h-10 sm:text-sm";
  const selectClass = `${fieldClass} w-full px-3`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> 新建报销单</CardTitle>
        <p className="text-sm text-muted-foreground">先保存草稿也可以；提交后进入财务中心的报销审批流。</p>
      </CardHeader>
      <CardContent>
        <form action={createExpenseReportAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="currency" value="CNY" />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="template_hint">常用模板</Label>
            <select id="template_hint" className={selectClass} defaultValue="">
              <option value="">不使用模板</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.amount ? `· ${template.amount} 元` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">第一版模板用于参考和沉淀常用项目，后续会支持一键填充。</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">报销标题</Label>
            <Input id="title" name="title" required placeholder="例如：供应商打样费报销" className={fieldClass} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">金额</Label>
            <Input id="amount" name="amount" required type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurred_at">发生日期</Label>
            <Input id="occurred_at" name="occurred_at" type="date" defaultValue={today} className={fieldClass} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_id">归属部门</Label>
            <select id="department_id" name="department_id" className={selectClass} defaultValue="">
              <option value="">暂不选择</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">报销类别</Label>
            <select id="category_id" name="category_id" className={selectClass} defaultValue="">
              <option value="">未分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant_name">商家 / 收款方</Label>
            <Input id="merchant_name" name="merchant_name" placeholder="例如：某供应商" className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">支付方式</Label>
            <Input id="payment_method" name="payment_method" placeholder="微信 / 支付宝 / 银行卡" className={fieldClass} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">说明</Label>
            <Textarea id="description" name="description" required placeholder="请说明用途、项目背景、是否需要报销等。" className="min-h-28 rounded-xl border-slate-200/80 bg-white/80 text-base shadow-sm sm:text-sm" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="receipt_files">发票 / 票据附件</Label>
            <Input id="receipt_files" name="receipt_files" type="file" multiple accept="image/*,.pdf" capture="environment" className={fieldClass} />
            <p className="text-xs text-muted-foreground">支持多张图片或 PDF。缺少票据会自动标记为红色异常，但不阻止保存草稿。</p>
          </div>

          <details className="rounded-2xl border border-slate-200/80 bg-white/55 p-4 md:col-span-2">
            <summary className="cursor-pointer text-sm font-medium">模板与备注</summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200/80 bg-white/65 px-3 text-sm">
                <input type="checkbox" name="save_as_template" className="h-4 w-4" />
                保存为常用模板
              </label>
              <div className="space-y-2">
                <Label htmlFor="template_name">模板名称</Label>
                <Input id="template_name" name="template_name" placeholder="例如：AI 工具订阅" className={fieldClass} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">内部备注</Label>
                <Textarea id="notes" name="notes" className="rounded-xl border-slate-200/80 bg-white/80 text-base shadow-sm sm:text-sm" />
              </div>
            </div>
          </details>

          <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-white/80 bg-white/82 p-3 shadow-[0_18px_46px_rgba(15,23,42,0.10)] backdrop-blur-xl md:static md:col-span-2 md:flex-row md:justify-end md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <Button type="button" variant="outline" asChild>
              <Link href="/finance/reimbursements"><ArrowLeft className="h-4 w-4" />返回</Link>
            </Button>
            <FormSubmitButton name="intent" value="draft" variant="outline" pendingText="保存中...">
              <Save className="h-4 w-4" />保存草稿
            </FormSubmitButton>
            <FormSubmitButton name="intent" value="submit" pendingText="提交中...">
              <Send className="h-4 w-4" />提交审批
            </FormSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
