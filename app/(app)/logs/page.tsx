import { Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditLogs } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function LogsPage({
  searchParams
}: {
  searchParams: Promise<{ module?: string; actor?: string; action?: string }>;
}) {
  const filters = await searchParams;
  const logs = await getAuditLogs({
    module: filters.module,
    actor: filters.actor,
    action: filters.action,
    limit: 300
  });

  return (
    <>
      <PageHeader
        title="操作日志"
        description="human / agent / system 的关键动作统一写入 audit_logs，可按模块、操作者、类型、时间过滤。"
      />
      <Card>
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Input name="module" defaultValue={filters.module ?? ""} placeholder="模块，例如 agents" />
            <Input name="actor" defaultValue={filters.actor ?? ""} placeholder="操作者类型 human / agent / system" />
            <Input name="action" defaultValue={filters.action ?? ""} placeholder="动作，例如 create" />
            <Button type="submit" variant="outline"><Filter className="h-4 w-4" />筛选</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>日志列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>事件</TableHead>
                <TableHead>操作者</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>模块</TableHead>
                <TableHead>关联对象</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.event_key}</TableCell>
                  <TableCell>{log.actor_type}:{log.actor_id ?? "system"}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell>{log.related_record_type ?? "-"}:{log.related_record_id ?? "-"}</TableCell>
                  <TableCell>{formatDate(log.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
