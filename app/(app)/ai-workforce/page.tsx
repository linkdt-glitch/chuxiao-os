import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckSquare,
  FileText,
  ImageIcon,
  MessageSquareText,
  Sparkles
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        title="AI 风暴创新实验室"
        description="目前主推「AI 对话」与「亚马逊图片生成」两大功能，其它 AI 能力（Agent 管理 / Prompt / 运行记录 / 审批）放在下方，按需深度开发。"
      />

      {/* ── 主功能 1 / 2 — 两张大入口卡 ────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FeatureCard
          icon={MessageSquareText}
          title="AI 对话助手"
          description="直接和 AI 聊：问问题、写文案、做创意、找方案、整理思路。支持多种模型，可以创建并切换定制 Prompt。"
          ctaLabel="立即开始对话"
          ctaHref="/ai-workforce/chat"
        />
        <FeatureCard
          icon={ImageIcon}
          title="亚马逊图片生成"
          description="一键生成主图、附图、生活方式图、特写。专为亚马逊卖家调优；可上传产品照作参考，AI 会按需求出多张候选。"
          ctaLabel="下方立即使用"
          ctaHref="#image-gen-widget"
          accent="amber"
        />
      </div>

      {/* ── 亚马逊图片生成 — 在 hero 下方直接嵌入完整工具 ──── */}
      <div id="image-gen-widget" className="mt-6 scroll-mt-24">
        <ImageGenWidget />
      </div>

      {/* ── 次要：其他 AI 能力（精简） ────────────────────────── */}
      <div className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-200">
            其他 AI 能力
          </h2>
          <span className="text-[11px] text-slate-500">
            按需深度开发，目前先保留管理入口
          </span>
        </div>

        {/* 紧凑指标 */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CompactMetric label="AI 员工" value={agents.length} icon={Bot} hint={`活跃 ${agents.filter((a) => a.status === "active").length}`} />
          <CompactMetric label="提示词" value={prompts.length} icon={FileText} hint="prompt 模板" />
          <CompactMetric label="本月调用" value={monthlyInvocations.length} icon={Sparkles} hint="次" />
          <CompactMetric label="待 AI 审批" value={pendingConfirmations.length} icon={CheckSquare} hint="高风险动作" />
        </div>

        {/* 入口快链 */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SecondaryLink href="/ai-workforce/agents/new" icon={Bot} label="创建 Agent" hint="自定义 AI 员工" />
          <SecondaryLink href="/ai-workforce/prompts/new" icon={FileText} label="创建提示词" hint="新增 Prompt 模板" />
          <SecondaryLink href="/ai-workforce/runs" icon={Sparkles} label="运行记录" hint="所有 AI 调用日志" />
          <SecondaryLink href="/ai-workforce/confirmations" icon={CheckSquare} label="AI 审批" hint="高风险动作确认" />
        </div>

        {/* 最近运行 + 待审批 */}
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[14px]">最近运行记录</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/ai-workforce/runs">查看全部</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {runs.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AI 员工</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.slice(0, 6).map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="truncate">{run.agent?.name ?? run.agent_id}</TableCell>
                        <TableCell>
                          <StatusBadge value={run.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(run.started_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="暂无运行记录" description="AI 员工被调用后会在这里留下输入、输出和状态。" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[14px]">待 AI 审批</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/ai-workforce/confirmations">处理</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pendingConfirmations.length ? (
                <div className="space-y-2">
                  {pendingConfirmations.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href="/ai-workforce/confirmations"
                      className="block rounded-md border border-slate-200/70 bg-white/60 p-3 hover:bg-orange-50/60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-medium">{item.title}</div>
                        <Badge
                          variant={
                            item.risk_level === "high" || item.risk_level === "critical" ? "danger" : "warning"
                          }
                        >
                          {item.risk_level}
                        </Badge>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {item.action_type} · {item.related_module ?? "ai_workforce"}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title="没有待审批事项" description="L3/L4 动作和重要数据修改会进入这里。" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

/** 顶部主功能大入口卡。 */
function FeatureCard({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  accent = "orange"
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  accent?: "orange" | "amber";
}) {
  const accentStyle =
    accent === "amber"
      ? {
          background: "rgba(251,191,36,0.12)",
          borderColor: "rgba(251,191,36,0.40)",
          iconColor: "text-amber-300"
        }
      : {
          background: "rgba(249,115,22,0.12)",
          borderColor: "rgba(249,115,22,0.40)",
          iconColor: "text-orange-300"
        };

  return (
    <Card
      style={{
        boxShadow:
          "0 0 0 1px rgba(249,115,22,0.18), 0 16px 36px rgba(249,115,22,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
      }}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border"
            style={{ background: accentStyle.background, borderColor: accentStyle.borderColor }}
          >
            <Icon className={`h-6 w-6 ${accentStyle.iconColor}`} />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-[18px]">{title}</CardTitle>
          </div>
        </div>
        <CardDescription className="mt-3">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full justify-between py-6">
          <Link href={ctaHref}>
            <span>{ctaLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** 紧凑指标卡。 */
function CompactMetric({
  label,
  value,
  icon: Icon,
  hint
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] uppercase tracking-[0.12em] text-slate-500">{label}</span>
        <Icon className="h-3.5 w-3.5 text-slate-500" />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[24px] font-semibold tabular-nums text-slate-100">{value}</span>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
    </div>
  );
}

/** 次要功能快链。 */
function SecondaryLink({
  href,
  icon: Icon,
  label,
  hint
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-orange-300" />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-slate-100">{label}</div>
          {hint ? <div className="truncate text-[11px] text-slate-500">{hint}</div> : null}
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-300" />
    </Link>
  );
}
