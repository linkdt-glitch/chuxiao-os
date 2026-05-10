"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, FileText, ReceiptText, Save, Send } from "lucide-react";
import { createExpenseReportAction } from "@/app/(app)/finance/reimbursements/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormPendingOverlay } from "@/components/ui/form-pending-overlay";
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
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(today);
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [description, setDescription] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const fieldClass = "h-11 rounded-xl border-slate-200/80 bg-white/80 text-base shadow-sm sm:h-10 sm:text-sm";
  const selectClass = `${fieldClass} w-full px-3`;
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectedDepartment = departments.find((department) => department.id === departmentId);
  const numericAmount = Number(amount) || 0;
  const dateAge = useMemo(() => {
    const timestamp = new Date(occurredAt).getTime();
    if (!timestamp) return 0;
    return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  }, [occurredAt]);
  const warnings = [
    dateAge > 90 ? "发生日期超过 90 天，审批时会重点关注。" : "",
    numericAmount >= 5000 ? "金额较高，请补充清楚用途和票据。" : "",
    fileCount === 0 ? "未上传票据，提交后会被标记为异常。" : ""
  ].filter(Boolean);

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setTitle(template.name);
    setAmount(template.amount ? String(template.amount) : "");
    setCategoryId(template.category_id ?? "");
    setMerchantName(template.merchant_name ?? "");
    setDescription(template.description ?? "");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> 新建报销单</CardTitle>
        <p className="text-sm text-muted-foreground">先保存草稿也可以；提交后进入财务中心的报销审批流。</p>
      </CardHeader>
      <CardContent>
        <form action={createExpenseReportAction} className="grid gap-4 md:grid-cols-2">
          <FormPendingOverlay label="正在提交报销..." estimatedSeconds={2} />
          <input type="hidden" name="currency" value="CNY" />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="template_hint">常用模板</Label>
            <select id="template_hint" className={selectClass} defaultValue="" onChange={(event) => applyTemplate(event.target.value)}>
              <option value="">不使用模板</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.amount ? `· ${template.amount} 元` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">选择模板会自动填入标题、金额、类别、商家和说明。</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">报销标题</Label>
            <Input id="title" name="title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：供应商打样费报销" className={fieldClass} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">金额</Label>
            <Input id="amount" name="amount" required type="number" min="0" step="0.001" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.000" className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurred_at">发生日期</Label>
            <Input id="occurred_at" name="occurred_at" type="date" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} className={fieldClass} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_id">归属部门</Label>
            <select id="department_id" name="department_id" className={selectClass} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">暂不选择</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category_id">报销类别</Label>
            <select id="category_id" name="category_id" className={selectClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">未分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant_name">商家 / 收款方</Label>
            <Input id="merchant_name" name="merchant_name" value={merchantName} onChange={(event) => setMerchantName(event.target.value)} placeholder="例如：某供应商" className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">支付方式</Label>
            <Input id="payment_method" name="payment_method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} placeholder="微信 / 支付宝 / 银行卡" className={fieldClass} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">说明</Label>
            <Textarea id="description" name="description" required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="请说明用途、项目背景、是否需要报销等。" className="min-h-28 rounded-xl border-slate-200/80 bg-white/80 text-base shadow-sm sm:text-sm" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="receipt_files">发票 / 票据附件</Label>
            {/* 注意：不要在多文件 input 上加 capture，iOS Safari 会强制只能拍照而无法选 PDF。
                想从相册多选 + 拍照 + 选 PDF 三种都能用，最稳的就是不写 capture 属性。 */}
            <Input
              id="receipt_files"
              name="receipt_files"
              type="file"
              multiple
              accept="image/*,.pdf"
              className={fieldClass}
              onChange={(event) => setFileCount(event.target.files?.length ?? 0)}
            />
            <p className="text-xs text-muted-foreground">支持多张图片或 PDF（手机上可点击后选拍照 / 相册 / 文件）。缺少票据会自动标记为红色异常，但不阻止保存草稿。</p>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-950">
              <ReceiptText className="h-4 w-4" />
              提交前快速检查
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">金额</div>
                <div className="mt-1 font-semibold">{numericAmount ? `¥${numericAmount.toFixed(2)}` : "未填写"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">部门</div>
                <div className="mt-1 font-semibold">{selectedDepartment?.name ?? "未选择"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">类别</div>
                <div className="mt-1 font-semibold">{selectedCategory?.name ?? "未分类"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">票据</div>
                <div className="mt-1 font-semibold">{fileCount ? `${fileCount} 个附件` : "未上传"}</div>
              </div>
            </div>
            {warnings.length ? (
              <div className="mt-3 space-y-1 text-sm text-amber-800">
                {warnings.map((warning) => (
                  <div key={warning} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-emerald-700">核心信息完整，提交后审批会更顺畅。</div>
            )}
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

          <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col-reverse gap-3 rounded-2xl border border-white/80 bg-white/82 p-3 shadow-[0_18px_46px_rgba(15,23,42,0.10)] backdrop-blur-xl md:static md:col-span-2 md:flex-row md:justify-end md:border-0 md:bg-transparent md:p-0 md:shadow-none md:bottom-auto">
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
