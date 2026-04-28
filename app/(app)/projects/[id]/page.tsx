import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, FileText, MessageSquareText, Plus, RotateCcw } from "lucide-react";
import { updateProjectAction, updateProjectStatusAction } from "@/app/(app)/projects/actions";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/projects/progress-bar";
import { ProjectStatusBadge, formatDate, priorityLabel } from "@/components/projects/status";
import { TaskTable } from "@/components/projects/task-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMembers } from "@/lib/data/queries";
import { getProject, getTaskComments, getTaskFiles } from "@/lib/projects";

function projectProgress(tasks: Array<{ progress: number }>) {
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((sum, task) => sum + Number(task.progress), 0) / tasks.length);
}

function taskFileHref(file: { file_id?: string | null; file_url?: string | null }) {
  return file.file_id ? `/api/files/${file.file_id}` : file.file_url;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const tasks = project.tasks ?? [];
  const [members, nested] = await Promise.all([
    getMembers(),
    Promise.all(tasks.map(async (task) => ({
      task,
      comments: await getTaskComments(task.id),
      files: await getTaskFiles(task.id)
    })))
  ]);
  const comments = nested.flatMap((item) => item.comments.map((comment) => ({ ...comment, taskName: item.task.name }))).slice(-5);
  const files = nested.flatMap((item) => item.files.map((file) => ({ ...file, taskName: item.task.name }))).slice(0, 5);

  return (
    <>
      <PageHeader
        title={project.name}
        description="任务进展一目了然，团队协作无缝对接。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`/projects/${id}/review`}><RotateCcw className="h-4 w-4" />项目复盘</Link></Button>
            <Button asChild><Link href={`/projects/${id}/tasks`}><Plus className="h-4 w-4" />任务管理</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">项目状态</CardTitle></CardHeader>
          <CardContent><ProjectStatusBadge status={project.status} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">负责人</CardTitle></CardHeader>
          <CardContent className="font-medium">{project.owner?.display_name ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">优先级</CardTitle></CardHeader>
          <CardContent><Badge variant={project.priority >= 5 ? "danger" : "secondary"}>{priorityLabel(project.priority)}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">截止日期</CardTitle></CardHeader>
          <CardContent className="font-medium">{formatDate(project.due_date)}</CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>任务进度</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar value={projectProgress(tasks)} />
            <div className="mt-4">
              <TaskTable projectId={id} tasks={tasks} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>状态切换</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateProjectStatusAction} className="grid gap-3">
                <input type="hidden" name="id" value={project.id} />
                <select name="status" defaultValue={project.status} className="h-9 rounded-md border bg-background px-3 text-sm">
                  <option value="draft">草稿</option>
                  <option value="in_progress">进行中</option>
                  <option value="completed">已完成</option>
                </select>
                <Button type="submit" variant="outline">更新状态</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>编辑项目</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateProjectAction} className="space-y-3">
                <input type="hidden" name="id" value={project.id} />
                <div className="space-y-2">
                  <Label>项目名称</Label>
                  <Input name="name" defaultValue={project.name} />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea name="description" rows={3} defaultValue={project.description ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>负责人</Label>
                  <select name="owner_id" defaultValue={project.owner_id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>{member.display_name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>优先级</Label>
                    <Input name="priority" type="number" min="1" max="5" defaultValue={project.priority} />
                  </div>
                  <div className="space-y-2">
                    <Label>截止日期</Label>
                    <Input name="due_date" type="date" defaultValue={project.due_date?.slice(0, 10) ?? ""} />
                  </div>
                </div>
                <Button type="submit" className="w-full">保存项目</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><MessageSquareText className="h-4 w-4" />最近评论</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {comments.length ? comments.map((comment) => (
              <div key={comment.id} className="rounded-md border p-3">
                <div className="mb-1 flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>{comment.commenter?.display_name ?? "-"} · {comment.taskName}</span>
                  <span>{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-sm">{comment.comment_text}</p>
              </div>
            )) : <div className="text-sm text-muted-foreground">暂无任务评论。</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />任务附件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.length ? files.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">{file.file_name}</div>
                  <div className="text-xs text-muted-foreground">{file.taskName}</div>
                </div>
                {taskFileHref(file) ? <Button asChild variant="outline" size="sm"><a href={taskFileHref(file) ?? "#"}>下载</a></Button> : null}
              </div>
            )) : <div className="text-sm text-muted-foreground">暂无任务附件。</div>}
          </CardContent>
        </Card>
      </div>

      {project.review ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4" />最近复盘</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{project.review.summary}</p>
            <Button asChild className="mt-4" variant="outline"><Link href={`/projects/${id}/review`}>查看复盘</Link></Button>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
