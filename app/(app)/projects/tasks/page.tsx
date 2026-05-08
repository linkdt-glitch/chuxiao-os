import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardCheck, ListFilter, Plus, Rows3, Search } from "lucide-react";
import { approveProjectApprovalAction, rejectProjectApprovalAction } from "@/app/(app)/projects/actions";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { TaskTable } from "@/components/projects/task-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { getMembers } from "@/lib/data/queries";
import { getProjectApprovalRequests, getProjects, getTasks } from "@/lib/projects";
import { formatDate } from "@/lib/utils";

function activeTasks(tasks: Awaited<ReturnType<typeof getTasks>>) {
  return tasks.filter((task) => task.status !== "completed" && task.status !== "archived");
}

function overdueTasks(tasks: Awaited<ReturnType<typeof getTasks>>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tasks.filter((task) => {
    if (!task.due_date || task.status === "completed" || task.status === "archived") return false;
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });
}

export default async function ProjectTasksWorkbenchPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [tasks, members, projects, projectApprovals] = await Promise.all([
    getTasks({
      q: params.q,
      status: params.status ?? "all",
      assigned_to: params.assigned_to,
      priority: params.priority ?? "all",
      project_id: params.project_id,
      due: params.due ?? "all"
    }),
    getMembers(),
    getProjects(),
    getProjectApprovalRequests({ status: "pending", limit: 20 })
  ]);
  const pendingProjectApprovals = projectApprovals.filter((approval) => approval.status === "pending");

  const cards = [
    { label: "全部任务", value: tasks.length, icon: Rows3 },
    { label: "进行中", value: activeTasks(tasks).length, icon: CalendarClock },
    { label: "已完成", value: tasks.filter((task) => task.status === "completed").length, icon: CheckCircle2 },
    { label: "已逾期", value: overdueTasks(tasks).length, icon: ListFilter },
    { label: "任务审批", value: pendingProjectApprovals.length, icon: ClipboardCheck }
  ];

  return (
    <>
      <NoticeBanner error={params.error} notice={params.notice} />
      <PageHeader
        title="任务表"
        description="像优秀任务应用一样，用一张表聚合项目、负责人、优先级、截止日期和协作动态。"
        action={<Button asChild><Link href="/projects"><Plus className="h-4 w-4" />从项目创建任务</Link></Button>}
      />

      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{item.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            项目内审批
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingProjectApprovals.length ? (
            <div className="space-y-3">
              {pendingProjectApprovals.map((approval) => (
                <div key={approval.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge value={approval.risk_level} />
                        <StatusBadge value={approval.status} />
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                          {approval.metadata?.action === "archive_task" ? "任务归档" : approval.related_module}
                        </span>
                      </div>
                      <div className="mt-2 text-base font-semibold text-slate-950">{approval.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {approval.task?.project?.name ?? "项目"} · {approval.task?.name ?? approval.description ?? "待处理任务审批"} · {formatDate(approval.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {approval.task ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/projects/${approval.task.project_id}/tasks/${approval.task.id}`}>查看任务</Link>
                        </Button>
                      ) : null}
                      <form action={approveProjectApprovalAction}>
                        <input type="hidden" name="approval_id" value={approval.id} />
                        <ConfirmSubmitButton confirmText="确认通过这个项目审批？" variant="secondary">通过</ConfirmSubmitButton>
                      </form>
                      <form action={rejectProjectApprovalAction}>
                        <input type="hidden" name="approval_id" value={approval.id} />
                        <ConfirmSubmitButton confirmText="确认驳回这个项目审批？" variant="destructive">驳回</ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="暂无项目审批" description="任务归档、关键项目变更等审批会留在项目中心处理。" />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" />筛选任务</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[1fr_160px_180px_160px_180px_160px_120px]">
            <Input name="q" defaultValue={params.q ?? ""} placeholder="搜索任务名称或描述" />
            <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="all">全部状态</option>
              <option value="to_do">待办</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
              <option value="archived">已归档</option>
            </select>
            <select name="assigned_to" defaultValue={params.assigned_to ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">全部负责人</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.display_name}</option>
              ))}
            </select>
            <select name="priority" defaultValue={params.priority ?? "all"} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="all">全部优先级</option>
              <option value="5">P5 高</option>
              <option value="4">P4 较高</option>
              <option value="3">P3</option>
              <option value="2">P2</option>
              <option value="1">P1 低</option>
            </select>
            <select name="project_id" defaultValue={params.project_id ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">全部项目</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <select name="due" defaultValue={params.due ?? "all"} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="all">全部日期</option>
              <option value="overdue">已逾期</option>
              <option value="today">今天到期</option>
              <option value="week">7 天内</option>
              <option value="none">无截止日</option>
            </select>
            <Button type="submit" variant="outline">应用</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskTable tasks={tasks} showProject />
        </CardContent>
      </Card>
    </>
  );
}
