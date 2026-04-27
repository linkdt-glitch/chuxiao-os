import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lightbulb, ListChecks, RotateCcw, TriangleAlert } from "lucide-react";
import { upsertProjectReviewAction } from "@/app/(app)/projects/actions";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/projects/progress-bar";
import { TaskStatusBadge, formatDate } from "@/components/projects/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProject, getProjectReview, getProjectTasks } from "@/lib/projects";

export default async function ProjectReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, tasks, review] = await Promise.all([
    getProject(id),
    getProjectTasks(id),
    getProjectReview(id)
  ]);
  if (!project) notFound();

  return (
    <>
      <PageHeader
        title="项目复盘"
        description="总结经验，优化流程，让下一个项目更高效。"
        action={<Button asChild variant="outline"><Link href={`/projects/${id}`}><ArrowLeft className="h-4 w-4" />返回项目</Link></Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RotateCcw className="h-4 w-4" />复盘记录</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={upsertProjectReviewAction} className="space-y-4">
              <input type="hidden" name="project_id" value={id} />
              <div className="space-y-2">
                <Label>项目总结</Label>
                <Textarea name="summary" rows={5} required defaultValue={review?.summary ?? ""} placeholder="概括项目目标、执行结果、整体质量和关键结论。" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />成功因素</Label>
                  <Textarea name="successful_factors" rows={5} defaultValue={review?.successful_factors ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-amber-600" />失败因素</Label>
                  <Textarea name="failure_factors" rows={5} defaultValue={review?.failure_factors ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-sky-600" />经验教训</Label>
                <Textarea name="lessons_learned" rows={4} defaultValue={review?.lessons_learned ?? ""} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-blue-600" />下一步行动</Label>
                <Textarea name="next_actions" rows={4} defaultValue={review?.next_actions ?? ""} />
              </div>
              <Button type="submit">保存复盘</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>项目概览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">项目</span><span className="font-medium">{project.name}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">负责人</span><span>{project.owner?.display_name ?? "-"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">截止日期</span><span>{formatDate(project.due_date)}</span></div>
              <div className="pt-2">
                <ProgressBar value={tasks.length ? Math.round(tasks.reduce((sum, task) => sum + Number(task.progress), 0) / tasks.length) : 0} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>任务回顾</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length ? tasks.map((task) => (
                <div key={task.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-medium">{task.name}</div>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <ProgressBar value={task.progress} />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {task.assignee?.display_name ?? "-"} · 截止 {formatDate(task.due_date)}
                  </div>
                </div>
              )) : <div className="text-sm text-muted-foreground">项目暂无任务，复盘保存后可先沉淀项目层面的经验。</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
