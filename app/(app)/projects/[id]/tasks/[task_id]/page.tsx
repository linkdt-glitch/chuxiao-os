import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, Paperclip, Send } from "lucide-react";
import {
  archiveTaskAction,
  createTaskCommentAction,
  updateTaskAction,
  uploadTaskFileAction
} from "@/app/(app)/projects/actions";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/projects/progress-bar";
import { TaskStatusBadge, formatDate } from "@/components/projects/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMembers } from "@/lib/data/queries";
import { getProject, getTask, getTaskComments, getTaskFiles } from "@/lib/projects";

function taskFileHref(file: { file_id?: string | null; file_url?: string | null }) {
  return file.file_id ? `/api/files/${file.file_id}` : file.file_url;
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string; task_id: string }> }) {
  const { id, task_id: taskId } = await params;
  const [project, task, members, comments, files] = await Promise.all([
    getProject(id),
    getTask(taskId),
    getMembers(),
    getTaskComments(taskId),
    getTaskFiles(taskId)
  ]);
  if (!project || !task || task.project_id !== id) notFound();

  return (
    <>
      <PageHeader
        title={task.name}
        description="更新任务状态、同步进展评论，并上传相关附件。"
        action={<Button asChild variant="outline"><Link href={`/projects/${id}/tasks`}><ArrowLeft className="h-4 w-4" />返回任务</Link></Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">任务状态</CardTitle></CardHeader>
          <CardContent><TaskStatusBadge status={task.status} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">负责人</CardTitle></CardHeader>
          <CardContent className="font-medium">{task.assignee?.display_name ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">截止日期</CardTitle></CardHeader>
          <CardContent className="font-medium">{formatDate(task.due_date)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">所属项目</CardTitle></CardHeader>
          <CardContent><Badge variant="secondary">{project.name}</Badge></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>任务进度</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressBar value={task.progress} />
              <p className="mt-4 text-sm text-muted-foreground">{task.description || "暂无任务描述。"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>评论区</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={createTaskCommentAction} className="space-y-3">
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="task_id" value={task.id} />
                <Textarea name="comment_text" rows={4} required placeholder="记录进展、风险、问题或下一步动作。" />
                <Button type="submit"><Send className="h-4 w-4" />发表评论</Button>
              </form>
              <div className="space-y-3">
                {comments.length ? comments.map((comment) => (
                  <div key={comment.id} className="rounded-md border bg-white/60 p-3">
                    <div className="mb-1 flex justify-between gap-3 text-xs text-muted-foreground">
                      <span>{comment.commenter?.display_name ?? "-"}</span>
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{comment.comment_text}</p>
                  </div>
                )) : <div className="text-sm text-muted-foreground">暂无评论，写下第一条任务进展吧。</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>更新任务</CardTitle>
            </CardHeader>
            <CardContent>
              {task.status === "archived" ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  该任务已归档，任务信息已锁定。如需重新处理，请创建新任务或由管理员在数据库层恢复状态。
                </div>
              ) : (
                <form action={updateTaskAction} className="space-y-3">
                  <input type="hidden" name="id" value={task.id} />
                  <input type="hidden" name="project_id" value={id} />
                  <div className="space-y-2">
                    <Label>任务名称</Label>
                    <Input name="name" defaultValue={task.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>负责人</Label>
                    <select name="assigned_to" defaultValue={task.assigned_to ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>{member.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>状态</Label>
                      <select name="status" defaultValue={task.status} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                        <option value="to_do">待办</option>
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>进度</Label>
                      <Input name="progress" type="number" min="0" max="100" defaultValue={task.progress} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>截止日期</Label>
                    <Input name="due_date" type="date" defaultValue={task.due_date?.slice(0, 10) ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>描述</Label>
                    <Textarea name="description" rows={3} defaultValue={task.description ?? ""} />
                  </div>
                  <Button type="submit" className="w-full">保存任务</Button>
                </form>
              )}
              {task.status !== "archived" ? (
                <form action={archiveTaskAction} className="mt-3">
                  <input type="hidden" name="id" value={task.id} />
                  <ConfirmSubmitButton confirmText="确认提交任务归档审批？审批通过后任务才会正式归档。" variant="destructive">
                    <Archive className="h-4 w-4" />归档任务
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Paperclip className="h-4 w-4" />任务附件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={uploadTaskFileAction} className="space-y-3">
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="task_id" value={task.id} />
                <Input name="task_file" type="file" />
                <Input name="file_url" placeholder="或填写外部文件链接" />
                <Input name="file_name" placeholder="外部链接文件名" />
                <Button type="submit" variant="outline" className="w-full">上传/关联附件</Button>
              </form>
              <div className="space-y-2">
                {files.length ? files.map((file) => (
                  <div key={file.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{file.file_name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{file.uploader?.display_name ?? "-"} · {formatDate(file.created_at)}</div>
                    {taskFileHref(file) ? <Button asChild variant="outline" size="sm" className="mt-3"><a href={taskFileHref(file) ?? "#"}>下载</a></Button> : null}
                  </div>
                )) : <div className="text-sm text-muted-foreground">暂无附件。</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
