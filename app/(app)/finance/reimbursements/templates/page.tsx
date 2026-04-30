import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { createExpenseTemplateAction } from "@/app/(app)/finance/reimbursements/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getExpenseCategories, getExpenseTemplates, money } from "@/lib/finance/expenses";

export default async function ExpenseTemplatesPage() {
  const [templates, categories] = await Promise.all([
    getExpenseTemplates(),
    getExpenseCategories()
  ]);

  return (
    <>
      <PageHeader
        title="报销模板"
        description="沉淀常用报销项目，后续新建报销时可以快速复用。"
        action={<Button asChild variant="outline"><Link href="/finance/reimbursements"><ArrowLeft className="h-4 w-4" />返回报销</Link></Button>}
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>新增模板</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createExpenseTemplateAction} className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">模板名称</Label>
                <Input id="name" name="name" required placeholder="例如：AI 工具月费" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">类别</Label>
                <select id="category_id" name="category_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="">未分类</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">常用金额</Label>
                <Input id="amount" name="amount" type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchant_name">商家</Label>
                <Input id="merchant_name" name="merchant_name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">说明</Label>
                <Textarea id="description" name="description" />
              </div>
              <FormSubmitButton><Plus className="h-4 w-4" />保存模板</FormSubmitButton>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>我的模板</CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{template.merchant_name || "未设置商家"}</div>
                      </div>
                      {template.amount ? <Badge variant="info">{money(template.amount)}</Badge> : null}
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">{template.description || "暂无说明"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                还没有模板。保存常用报销项目后，新建时会更快。
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
