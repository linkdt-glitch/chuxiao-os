import Link from "next/link";
import { AlertTriangle, ClipboardCheck, FileClock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getGovernanceData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function GovernancePage() {
  const data = await getGovernanceData();

  return (
    <>
      <PageHeader
        title="组织护航盾"
        description="原治理与风控底座。统一管理权限、审批、日志、事件和风险，确保组织安全、可控、可追溯。核心价值：确保谁可以做、谁批准、谁负责、是否可追溯。"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="权限安全" icon={ShieldCheck} stats={[["角色", data.stats.roleCount], ["权限", data.stats.permissionCount], ["高权限成员", data.stats.highPrivilegeMembers], ["高权限 Agent", data.stats.highPrivilegeAgents]]} href="/roles" />
        <StatCard title="审批风控" icon={ClipboardCheck} stats={[["待审批", data.stats.pendingApprovals], ["高风险", data.stats.highRiskApprovals], ["本周已审批", data.stats.approvedThisWeek]]} href="/approvals" />
        <StatCard title="日志审计" icon={FileClock} stats={[["今日操作", data.stats.todayLogs], ["关键操作", data.stats.criticalLogs], ["Human", data.actorDistribution.human], ["Agent", data.actorDistribution.agent]]} href="/logs" />
        <StatCard title="事件追踪" icon={AlertTriangle} stats={[["今日事件", data.stats.todayEvents], ["未处理", data.stats.newEvents], ["失败", data.stats.failedEvents]]} href="/events" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近审批记录</CardTitle>
          </CardHeader>
          <CardContent>
            {data.approvals.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead>风险</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.approvals.slice(0, 5).map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>{approval.title}</TableCell>
                      <TableCell>{approval.related_module}</TableCell>
                      <TableCell><RiskBadge value={approval.risk_level} /></TableCell>
                      <TableCell><StatusBadge value={approval.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无审批记录" description="高风险动作会在这里进入审批视野。" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近操作日志</CardTitle>
          </CardHeader>
          <CardContent>
            {data.logs.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>事件</TableHead>
                    <TableHead>操作者</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.slice(0, 5).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.event_key}</TableCell>
                      <TableCell>{log.actor_type}</TableCell>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无操作日志" description="关键动作会统一写入 audit_logs。" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近系统事件</CardTitle>
          </CardHeader>
          <CardContent>
            {data.events.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>事件</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.slice(0, 5).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.event_key}</TableCell>
                      <TableCell>{event.module}</TableCell>
                      <TableCell><StatusBadge value={event.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无系统事件" description="自动化和模块事件会进入 system_events。" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>风险规则预留</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {["大额支出审批", "Agent 高风险动作审批", "Prompt 发布审批", "项目关键变更审批"].map((rule) => (
              <div key={rule} className="flex items-center justify-between rounded-md border p-3">
                <span>{rule}</span>
                <Badge variant="warning">Coming Soon</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({
  title,
  icon: Icon,
  stats,
  href
}: {
  title: string;
  icon: typeof ShieldCheck;
  stats: Array<[string, number]>;
  href: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-md bg-muted/40 p-2">
              <div className="text-lg font-semibold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={href}>进入</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
