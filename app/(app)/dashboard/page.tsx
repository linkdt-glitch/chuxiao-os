import Link from "next/link";
import { Bot, ClipboardCheck, Cpu, Layers3, ListTodo, Users, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { getDashboardData, getAISettingsData } from "@/lib/data/queries";
import { getFinanceSummary } from "@/lib/finance/reports";
import { formatDate } from "@/lib/utils";

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value);
}

export default async function DashboardPage() {
  const [organization, member, data, aiData, financeSummary] = await Promise.all([
    getCurrentOrganization(),
    getCurrentMember(),
    getDashboardData(),
    getAISettingsData(),
    getFinanceSummary().catch(() => null)
  ]);

  const statCards = [
    { label: "已启用模块", value: data.stats.enabledModules, icon: Layers3 },
    { label: "成员数量", value: data.stats.members, icon: Users },
    { label: "Agent 数量", value: data.stats.agents, icon: Bot },
    { label: "AI Provider", value: data.stats.providers, icon: Cpu }
  ];

  return (
    <>
      <PageHeader
        title="领航驾驶舱"
        description="原 Dashboard。看全局、盯重点、早发现、快决策。核心价值：把组织状态、风险待办、AI 劳动力和优化建议放在同一张工作台。"
      />

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((item) => (
          <Card key={item.label} className="overflow-hidden">
            {/* Top accent bar */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(249,115,22,0.55), transparent)"
              }}
            />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {item.label}
              </CardTitle>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background:
                    "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.18), rgba(3,7,18,0.6))",
                  boxShadow:
                    "0 0 12px rgba(249,115,22,0.18), inset 0 0 0 1px rgba(249,115,22,0.22)"
                }}
              >
                <item.icon className="h-4 w-4 text-orange-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="bg-gradient-to-br from-white via-orange-50 to-orange-200 bg-clip-text text-3xl font-bold tabular-nums tracking-tight text-transparent"
                style={{ filter: "drop-shadow(0 0 14px rgba(249,115,22,0.18))" }}
              >
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>今日组织状态</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-3">
            <div className="rounded-md border p-4">
              <div className="text-muted-foreground">当前组织</div>
              <div className="mt-2 font-medium">{organization.name}</div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-muted-foreground">当前角色</div>
              <div className="mt-2"><Badge variant="info">{member.role?.name ?? "Member"}</Badge></div>
            </div>
            <div className="rounded-md border p-4">
              <div className="text-muted-foreground">组织底座</div>
              <div className="mt-2 font-medium">权限、分模块审批、日志、事件统一可追溯</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待处理事项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Todo label="财务审批" value={data.stats.financePendingApprovals} href="/finance/records?status=pending_approval" />
            <Todo label="AI 确认" value={data.stats.aiPendingConfirmations} href="/ai-workforce/confirmations" />
            <Todo label="项目审批" value={data.stats.projectPendingApprovals} href="/projects/tasks" />
            <Todo label="未处理事件" value={data.stats.unprocessedEvents} href="/events" />
            <Todo label="我的待办任务" value="预留" href="/projects" muted />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>经营摘要</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/finance">经营能量舱</Link></Button>
          </CardHeader>
          <CardContent>
            {financeSummary ? (
              <div className="grid gap-3 text-sm">
                <FinanceLine label="本月收入" value={money(financeSummary.monthIncome)} />
                <FinanceLine label="本月支出" value={money(financeSummary.monthExpense)} />
                <FinanceLine label="本月利润" value={money(financeSummary.monthProfit)} />
                <FinanceLine label="现金余额" value={money(financeSummary.cashBalance)} />
              </div>
            ) : (
              <EmptyState title="经营能量舱待接入" description="财务中心数据接入后，这里展示收入、支出、利润和现金流。" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>执行摘要</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/projects">执行指挥舱</Link></Button>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
              <ListTodo className="mb-3 h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">执行指挥舱 Coming Soon</div>
              <p className="mt-1 text-sm text-muted-foreground">项目、任务、负责人、人机协作和延期任务将在后续模块接入。</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>智能劳动力摘要</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/ai-workforce">智能劳动力中心</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <FinanceLine label="Agent 总数" value={String(data.stats.agents)} />
            <FinanceLine label="AI Provider" value={String(data.stats.providers)} />
            <FinanceLine label="本月 AI 调用" value={String(data.stats.aiInvocations)} />
            {aiData.logs[0] ? (
              <div className="rounded-md border p-3 text-sm">
                <div className="text-muted-foreground">最近 AI 调用</div>
                <div className="mt-1 truncate">{aiData.logs[0].module} · {aiData.logs[0].status}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近事件</CardTitle>
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
                  {data.events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.event_key}</TableCell>
                      <TableCell>{event.module}</TableCell>
                      <TableCell><StatusBadge value={event.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <EmptyState title="暂无事件" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>组织优化建议</CardTitle>
          </CardHeader>
          <CardContent>
            {data.improvements.length ? (
              <div className="space-y-3">
                {data.improvements.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.title}</div>
                      <RiskBadge value={item.impact_level} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无组织优化建议" description="系统会在积累财务、任务、审批、事件和 Agent 反馈后生成优化建议。" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>最近操作日志</CardTitle>
        </CardHeader>
        <CardContent>
          {data.logs.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>动作</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.module}</TableCell>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <EmptyState title="暂无日志" />}
        </CardContent>
      </Card>
    </>
  );
}

function Todo({ label, value, href, muted = false }: { label: string; value: number | string; href: string; muted?: boolean }) {
  return (
    <Button asChild variant="outline" className="h-auto w-full justify-between p-3">
      <Link href={href}>
        <span className={muted ? "text-slate-500" : "text-slate-300"}>{label}</span>
        <span className="font-semibold tabular-nums text-orange-300">{value}</span>
      </Link>
    </Button>
  );
}

function FinanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-orange-500/[0.04]"
      style={{
        background: "rgba(8,13,28,0.45)",
        border: "1px solid rgba(249,115,22,0.10)"
      }}
    >
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-100">{value}</span>
    </div>
  );
}
