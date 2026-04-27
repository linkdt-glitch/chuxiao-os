import { createFinanceCategoryAction } from "@/app/(app)/finance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getFinanceCategories } from "@/lib/finance/categories";

export default async function FinanceCategoriesPage() {
  const categories = await getFinanceCategories("all");

  return (
    <>
      <PageHeader title="财务类目" description="维护收入与支出类目，默认类目可直接用于 AI 解析和手动记账。" />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>新增类目</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFinanceCategoryAction} className="space-y-4">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <select name="type" defaultValue="expense" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="income">收入</option>
                  <option value="expense">支出</option>
                  <option value="both">通用</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>父类目</Label>
                <select name="parent_id" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">无</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>编码</Label>
                <Input name="code" />
              </div>
              <Button type="submit" className="w-full">创建类目</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>类目列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{category.name}</div>
                  <div className="flex gap-2">
                    <Badge variant={category.type === "income" ? "success" : "secondary"}>{category.type}</Badge>
                    {category.is_system ? <Badge variant="info">system</Badge> : null}
                  </div>
                </div>
                {category.children?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {category.children.map((child) => <Badge key={child.id} variant="outline">{child.name}</Badge>)}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
