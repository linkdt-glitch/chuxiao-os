import { Badge } from "@/components/ui/badge";
import type { ProjectStatus, TaskStatus } from "@/lib/projects/types";

const projectLabels: Record<ProjectStatus, string> = {
  draft: "草稿",
  in_progress: "进行中",
  completed: "已完成"
};

const taskLabels: Record<TaskStatus, string> = {
  to_do: "待办",
  in_progress: "进行中",
  completed: "已完成",
  archived: "已归档"
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const variant = status === "completed" ? "success" : status === "in_progress" ? "warning" : "secondary";
  return <Badge variant={variant}>{projectLabels[status]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const variant =
    status === "completed"
      ? "success"
      : status === "in_progress"
        ? "warning"
        : status === "archived"
          ? "secondary"
          : "outline";
  return <Badge variant={variant}>{taskLabels[status]}</Badge>;
}

export function priorityLabel(priority: number) {
  if (priority >= 5) return "P5 高";
  if (priority >= 4) return "P4 较高";
  if (priority <= 1) return "P1 低";
  return `P${priority}`;
}

export function TaskPriorityBadge({ priority }: { priority: number }) {
  const variant = priority >= 5 ? "danger" : priority >= 4 ? "warning" : priority <= 2 ? "secondary" : "outline";
  return <Badge variant={variant}>{priorityLabel(priority)}</Badge>;
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(value));
}
