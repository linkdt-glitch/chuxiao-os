import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProgressBar } from "@/components/projects/progress-bar";
import { TaskStatusBadge, formatDate } from "@/components/projects/status";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectTask } from "@/lib/projects/types";

export function TaskTable({ projectId, tasks }: { projectId: string; tasks: ProjectTask[] }) {
  if (!tasks.length) {
    return <EmptyState title="暂无任务" description="把项目目标拆成任务，并为每个任务指定负责人和截止日期。" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>任务名称</TableHead>
          <TableHead>负责人</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>进度</TableHead>
          <TableHead>截止日期</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Link href={`/projects/${projectId}/tasks/${task.id}`} className="font-medium hover:text-sky-700">
                {task.name}
              </Link>
              <div className="mt-1 line-clamp-1 max-w-[360px] text-xs text-muted-foreground">{task.description || "暂无描述"}</div>
            </TableCell>
            <TableCell>{task.assignee?.display_name ?? "-"}</TableCell>
            <TableCell><TaskStatusBadge status={task.status} /></TableCell>
            <TableCell className="min-w-[180px]"><ProgressBar value={task.progress} /></TableCell>
            <TableCell>{formatDate(task.due_date)}</TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${projectId}/tasks/${task.id}`}>详情<ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
