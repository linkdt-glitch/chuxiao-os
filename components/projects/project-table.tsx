import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProgressBar } from "@/components/projects/progress-bar";
import { ProjectStatusBadge, formatDate, priorityLabel } from "@/components/projects/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Project } from "@/lib/projects/types";

function projectProgress(project: Project) {
  const tasks = project.tasks ?? [];
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((sum, task) => sum + Number(task.progress), 0) / tasks.length);
}

export function ProjectTable({ projects }: { projects: Project[] }) {
  if (!projects.length) {
    return <EmptyState title="暂无项目" description="创建第一个项目后，负责人、进度和截止日期会集中展示在这里。" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>项目名称</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>负责人</TableHead>
          <TableHead>优先级</TableHead>
          <TableHead>任务进度</TableHead>
          <TableHead>截止日期</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell>
              <Link href={`/projects/${project.id}`} className="font-medium hover:text-sky-700">
                {project.name}
              </Link>
              <div className="mt-1 line-clamp-1 max-w-[360px] text-xs text-muted-foreground">{project.description || "暂无描述"}</div>
            </TableCell>
            <TableCell><ProjectStatusBadge status={project.status} /></TableCell>
            <TableCell>{project.owner?.display_name ?? "-"}</TableCell>
            <TableCell><Badge variant={project.priority >= 5 ? "danger" : project.priority >= 4 ? "warning" : "secondary"}>{priorityLabel(project.priority)}</Badge></TableCell>
            <TableCell className="min-w-[180px]"><ProgressBar value={projectProgress(project)} /></TableCell>
            <TableCell>{formatDate(project.due_date)}</TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/${project.id}`}>进入<ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
