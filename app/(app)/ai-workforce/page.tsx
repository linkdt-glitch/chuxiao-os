import Link from "next/link";
import { Bot, BrainCircuit, CheckSquare, FileText, MessageSquareText, PlayCircle, Plus, Sparkles } from "lucide-react";
import { PermissionLevelBadge } from "@/components/ai-workforce/badges";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAgents } from "@/lib/ai-workforce/agents";
import { getConfirmations } from "@/lib/ai-workforce/confirmations";
import { getPrompts } from "@/lib/ai-workforce/prompts";
import { getAgentRuns } from "@/lib/ai-workforce/runs";
import { getAISettingsData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { ImageGenWidget } from "@/components/ai-workforce/image-gen-widget";

export default async function AIWorkforcePage() {
  const [agents, prompts, confirmations, runs, aiSettings] = await Promise.all([
    getAgents(),
    getPrompts(),
    getConfirmations(),
    getAgentRuns(),
    getAISettingsData()
  ]);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const pendingConfirmations = confirmations.filter((item) => item.status === "pending");
  const monthlyInvocations = aiSettings.logs.filter((log) => log.created_at.startsWith(currentMonth));

  return (
    <>
      <PageHeader
        title="智能劳动力中心"
        description="管理 AI 员工、Prompt、AI 调用、权限等级、运行记录和 AI 审批。让 AI 成为可管理、可评估、可进化、可控风险的数字同事。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href="/ai-workforce/chat"><MessageSquareText className="h-4 w-4" />AI 对话</Link></Button>
            <Button asChild variant="outline"><Link href="/ai-workforce/prompts/new"><FileText className="h-4 w-4" />创建提示词</Link></Button>
            <Button asChild><Link href="/ai-workforce/agents/new"><Plus className="h-4 w-4" />创建 Agent</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <Metric label="AI 员工总数" value={agents.length} icon={Bot} />
        <Metric label="活跃 AI 员工" value={agents.filter((agent) => agent.status === "active").length} icon={BrainCircuit} />
        <Metric label="提示词数量" value={prompts.length} icon={FileText} />
        <Metric label="本月 AI 调用" value={monthlyInvocations.length} icon={Sparkles} />
        <Metric label="待 AI 审批" value={pendingConfirmations.length} icon={CheckSquare} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近运行记录</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/ai-workforce/runs">查看全部</Link></Button>
          </CardHeader>
          <CardContent>
            {runs.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>AI 员工</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>输出摘要</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.slice(0, 8).map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{run.agent?.name ?? run.agent_id}</TableCell>
                      <TableCell>{run.run_type}</TableCell>
                      <TableCell>{run.related_module ?? "-"}</TableCell>
                      <TableCell><StatusBadge value={run.status} /></TableCell>
                      <TableCell className="max-w-xs truncate">{JSON.stringify(run.output)}</TableCell>
                      <TableCell>{formatDate(run.started_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无运行记录" description="AI 员工被调用后，会在这里留下输入、输出、状态和错误信息。" />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>快捷入口</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild><Link href="/ai-workforce/chat"><MessageSquareText className="h-4 w-4" />AI 对话助手</Link></Button>
              <Button asChild><Link href="/ai-workforce/agents/new"><Bot className="h-4 w-4" />创建 Agent</Link></Button>
              <Button asChild variant="outline"><Link href="/ai-workforce/prompts/new"><FileText className="h-4 w-4" />创建提示词</Link></Button>
              <Button asChild variant="outline"><Link href="/ai-workforce/confirmations"><CheckSquare className="h-4 w-4" />AI 审批</Link></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>权限等级</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["L1", "只读与建议"],
                ["L2", "内容生成，写入前确认"],
                ["L3", "内部动作，负责人确认"],
                ["L4", "高风险动作，必须审批"],
                ["L5", "禁止自动执行"]
              ].map(([level, text]) => (
                <div key={level} className="flex items-center justify-between rounded-md border border-slate-200/70 bg-white/60 p-2">
                  <PermissionLevelBadge value={level} />
                  <span className="text-muted-foreground">{text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近 AI 调用记录</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/ai-settings">AI Provider 设置</Link></Button>
          </CardHeader>
          <CardContent>
            {aiSettings.logs.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模块</TableHead>
                    <TableHead>调用者</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>成本</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiSettings.logs.slice(0, 8).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.module}</TableCell>
                      <TableCell>{log.invoked_by_type}:{log.invoked_by}</TableCell>
                      <TableCell><StatusBadge value={log.status} /></TableCell>
                      <TableCell>{log.cost_estimate}</TableCell>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无 AI 调用记录" description="提示词测试和 AI 员工调用会复用 ai_invocation_logs。" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>待 AI 审批</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/ai-workforce/confirmations">处理</Link></Button>
          </CardHeader>
          <CardContent>
            {pendingConfirmations.length ? (
              <div className="space-y-2">
                {pendingConfirmations.slice(0, 5).map((item) => (
                  <Link key={item.id} href="/ai-workforce/confirmations" className="block rounded-md border border-slate-200/70 bg-white/60 p-3 hover:bg-orange-50/60">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.title}</div>
                      <Badge variant={item.risk_level === "high" || item.risk_level === "critical" ? "danger" : "warning"}>{item.risk_level}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.action_type} · {item.related_module ?? "ai_workforce"}</div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="没有待审批事项" description="L3/L4 动作、对外发送和重要数据修改会进入这里。" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <ImageGenWidget />
      </div>
    </>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Bot }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className="mb-3 h-4 w-4 text-muted-foreground" />
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
