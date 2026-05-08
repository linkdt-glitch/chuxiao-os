import { redirect } from "next/navigation";
import { createFinanceCategoryAction } from "@/app/(app)/finance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getFinanceCategories } from "@/lib/finance/categories";
import { canViewAllFinance } from "@/lib/finance/permissions";

export default async function FinanceCategoriesPage() {
  // 类目管理仅 owner / admin 可见（普通成员通过下拉框选用即可）
  if (!(await canViewAllFinance())) {
    redirect("/finance");
  }
  const categories = await getFinanceCategories("all");

  return (
    <>
      <PageHeader title="财务类目" description="核心类目保持长期稳定；平台、国家、店铺、供应商和项目不要做成类目。" />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>少量补充</CardTitle>
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
              <Button type="submit" className="w-full">添加</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>核心类目</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => (
              <div key={category.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{category.name}</div>
                  <div className="flex gap-2">
                    <Badge variant={category.type === "income" ? "success" : "secondary"}>{category.type === "income" ? "收入" : category.type === "expense" ? "支出" : "通用"}</Badge>
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
