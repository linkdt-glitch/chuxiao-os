import { createProjectAction } from "@/app/(app)/projects/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMembers } from "@/lib/data/queries";
import Link from "next/link";

export default async function NewProjectPage() {
  const members = await getMembers();

  return (
    <>
      <PageHeader
        title="创建新项目"
        description="明确项目负责人、优先级和截止日期，创建后会记录操作日志并发出 projects.created 事件。"
      />
      <Card>
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProjectAction} className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label>项目名称</Label>
              <Input name="name" required placeholder="例如：项目A：开发新产品" />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>项目描述</Label>
              <Textarea name="description" rows={4} placeholder="说明项目目标、范围和关键交付物。" />
            </div>
            <div className="space-y-2">
              <Label>负责人</Label>
              <select name="owner_id" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.display_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <select name="status" defaultValue="draft" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                <option value="draft">草稿</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>优先级</Label>
              <Input name="priority" type="number" min="1" max="5" defaultValue="3" />
            </div>
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input name="start_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label>截止日期</Label>
              <Input name="due_date" type="date" />
            </div>
            <div className="flex justify-end gap-3 lg:col-span-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">取消</Link>
              </Button>
              <Button type="submit">创建项目</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
