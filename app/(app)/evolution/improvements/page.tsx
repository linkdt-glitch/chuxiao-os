import { CreateImprovementForm } from "@/components/evolution/create-improvement-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getImprovementSuggestions } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { changeImprovementStatusAction } from "../actions";

const statuses = ["new", "accepted", "rejected", "in_progress", "done"];

export default async function ImprovementsPage() {
  const improvements = await getImprovementSuggestions();

  return (
    <>
      <PageHeader
        title="优化建议"
        description="成长飞轮引擎的一部分。记录系统、人类或 Agent 对流程、风险、知识、财务和 AI 工作方式的改进建议。"
      />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <CreateImprovementForm />

        <Card>
          <CardHeader>
            <CardTitle>优化建议列表</CardTitle>
          </CardHeader>
          <CardContent>
            {improvements.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>建议</TableHead>
                    <TableHead>影响</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead>处理</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {improvements.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.description ?? "-"}</div>
                      </TableCell>
                      <TableCell><RiskBadge value={item.impact_level} /></TableCell>
                      <TableCell><StatusBadge value={item.status} /></TableCell>
                      <TableCell>{item.related_module ? <Badge variant="outline">{item.related_module}</Badge> : "-"}</TableCell>
                      <TableCell>
                        <form action={changeImprovementStatusAction} className="flex gap-2">
                          <input type="hidden" name="id" value={item.id} />
                          <select name="status" defaultValue={item.status} className="h-8 rounded-md border bg-background px-2 text-xs">
                            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <Button size="sm" variant="outline">更新</Button>
                        </form>
                      </TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无优化建议" description="系统会在积累财务、任务、审批、事件和 Agent 反馈后生成优化建议，也可以先人工创建。" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
