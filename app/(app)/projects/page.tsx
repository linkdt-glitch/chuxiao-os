import Link from "next/link";
import { CheckCircle2, Clock3, ListTodo, Plus, Target } from "lucide-react";
import { ProjectTable } from "@/components/projects/project-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMembers } from "@/lib/data/queries";
import { getProjectSummary } from "@/lib/projects";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [summary, members] = await Promise.all([
    getProjectSummary({ status: params.status ?? "all", owner_id: params.owner_id }),
    getMembers()
  ]);

  const cards = [
    { label: "项目总数", value: summary.totalProjects, icon: Target },
    { label: "进行中", value: summary.activeProjects, icon: Clock3 },
    { label: "已完成", value: summary.completedProjects, icon: CheckCircle2 },
    { label: "平均进度", value: `${summary.averageProgress}%`, icon: ListTodo }
  ];

  return (
    <>
      <PageHeader
        title="计划任务中心"
        description="简化管理，明确责任，跟踪项目进度，让团队高效协作。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/projects/tasks"><ListTodo className="h-4 w-4" />任务表</Link></Button>
            <Button asChild><Link href="/projects/new"><Plus className="h-4 w-4" />创建新项目</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
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
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[220px_260px_120px]">
            <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
            <select name="owner_id" defaultValue={params.owner_id ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">全部负责人</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.display_name}</option>
              ))}
            </select>
            <Button type="submit" variant="outline">应用筛选</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>项目列表</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectTable projects={summary.projects} />
        </CardContent>
      </Card>
    </>
  );
}
