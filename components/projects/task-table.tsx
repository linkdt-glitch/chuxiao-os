import Link from "next/link";
import { ArrowRight, MessageSquareText, Paperclip } from "lucide-react";
import { ProgressBar } from "@/components/projects/progress-bar";
import { TaskPriorityBadge, TaskStatusBadge, formatDate } from "@/components/projects/status";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectTask } from "@/lib/projects/types";

function dueTone(value?: string | null) {
  if (!value) return "text-muted-foreground";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(value);
  due.setHours(0, 0, 0, 0);
  return due < today ? "text-red-700" : due.getTime() === today.getTime() ? "text-amber-700" : "text-foreground";
}

export function TaskTable({
  projectId,
  tasks,
  showProject = false
}: {
  projectId?: string;
  tasks: ProjectTask[];
  showProject?: boolean;
}) {
  if (!tasks.length) {
    return <EmptyState title="暂无匹配任务" description="调整筛选条件，或创建一条带负责人、优先级和截止日期的新任务。" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>任务名称</TableHead>
          {showProject ? <TableHead>项目</TableHead> : null}
          <TableHead>负责人</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>优先级</TableHead>
          <TableHead>进度</TableHead>
          <TableHead>截止日期</TableHead>
          <TableHead>协作</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => {
          const resolvedProjectId = projectId ?? task.project_id;
          return (
          <TableRow key={task.id}>
            <TableCell>
              <Link href={`/projects/${resolvedProjectId}/tasks/${task.id}`} className="font-medium hover:text-sky-700">
                {task.name}
              </Link>
              <div className="mt-1 line-clamp-1 max-w-[360px] text-xs text-muted-foreground">{task.description || "暂无描述"}</div>
            </TableCell>
            {showProject ? (
              <TableCell>
                <Link href={`/projects/${resolvedProjectId}`} className="text-sm hover:text-sky-700">
                  {task.project?.name ?? "-"}
                </Link>
              </TableCell>
            ) : null}
            <TableCell>{task.assignee?.display_name ?? "-"}</TableCell>
            <TableCell><TaskStatusBadge status={task.status} /></TableCell>
            <TableCell><TaskPriorityBadge priority={task.priority ?? 3} /></TableCell>
            <TableCell className="min-w-[180px]"><ProgressBar value={task.progress} /></TableCell>
            <TableCell className={dueTone(task.due_date)}>{formatDate(task.due_date)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MessageSquareText className="h-3.5 w-3.5" />{task.comment_count ?? 0}</span>
                <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{task.file_count ?? 0}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${resolvedProjectId}/tasks/${task.id}`}>详情<ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </TableCell>
          </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
