import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { createTaskAction } from "@/app/(app)/projects/actions";
import { PageHeader } from "@/components/layout/page-header";
import { TaskTable } from "@/components/projects/task-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMembers } from "@/lib/data/queries";
import { getProject, getProjectTasks } from "@/lib/projects";

export default async function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, tasks, members] = await Promise.all([
    getProject(id),
    getProjectTasks(id),
    getMembers()
  ]);
  if (!project) notFound();

  return (
    <>
      <PageHeader
        title="任务管理"
        description="任务进展一目了然，团队协作无缝对接。"
        action={<Button asChild variant="outline"><Link href={`/projects/${id}`}><ArrowLeft className="h-4 w-4" />返回项目</Link></Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />创建任务</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTaskAction} className="space-y-4">
              <input type="hidden" name="project_id" value={id} />
              <div className="space-y-2">
                <Label>任务名称</Label>
                <Input name="name" required placeholder="例如：设计 UI 界面" />
              </div>
              <div className="space-y-2">
                <Label>任务描述</Label>
                <Textarea name="description" rows={4} placeholder="说明交付物、验收标准和协作注意事项。" />
              </div>
              <div className="space-y-2">
                <Label>负责人</Label>
                <select name="assigned_to" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>状态</Label>
                  <select name="status" defaultValue="to_do" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="to_do">待办</option>
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>进度</Label>
                  <Input name="progress" type="number" min="0" max="100" defaultValue="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <select name="priority" defaultValue="3" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="5">P5 高</option>
                  <option value="4">P4 较高</option>
                  <option value="3">P3</option>
                  <option value="2">P2</option>
                  <option value="1">P1 低</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>截止日期</Label>
                <Input name="due_date" type="date" />
              </div>
              <Button type="submit" className="w-full">创建任务</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{project.name} · 任务列表</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskTable projectId={id} tasks={tasks} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
