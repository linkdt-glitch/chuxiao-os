import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAgentsData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

const levels = [
  ["L1", "只读与建议"],
  ["L2", "内容生成，写入前确认"],
  ["L3", "内部动作，负责人确认"],
  ["L4", "高风险动作，必须审批"],
  ["L5", "禁止自动执行"]
];

export default async function AgentsPage() {
  const { agents, runs } = await getAgentsData();

  return (
    <>
      <PageHeader
        title="Agents Agent 档案"
        description="Agent 是组织内受控操作者：必须绑定负责人、分级授权、运行留痕，高风险动作进入审批。"
        action={<Button asChild><Link href="/ai-workforce/agents">进入新版 Agent 管理</Link></Button>}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        {levels.map(([level, text]) => (
          <Card key={level}>
            <CardContent className="p-4">
              <div className="font-semibold">{level}</div>
              <div className="mt-1 text-xs text-muted-foreground">{text}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>创建 Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input id="name" disabled placeholder="财务分析 Agent" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner">负责人 user_id</Label>
                <Input id="owner" disabled placeholder="user_ops" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">权限等级</Label>
                <Input id="level" disabled placeholder="L1 / L2 / L3 / L4 / L5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">描述</Label>
                <Textarea id="desc" disabled placeholder="Agent 职责、允许模块和工具边界" />
              </div>
              <Button asChild className="w-full">
                <Link href="/ai-workforce/agents">
                  <Plus className="h-4 w-4" />
                  去新版页面创建 Agent
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Agent 列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>允许模块</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">{agent.description}</div>
                    </TableCell>
                    <TableCell>{agent.owner_user_id}</TableCell>
                    <TableCell><Badge variant="info">{agent.permission_level}</Badge></TableCell>
                    <TableCell className="space-x-1">
                      {(agent.allowed_modules as string[]).map((moduleKey: string) => <Badge key={moduleKey} variant="outline">{moduleKey}</Badge>)}
                    </TableCell>
                    <TableCell><StatusBadge value={agent.status} /></TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/ai-workforce/agents">管理</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>基础运行日志</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>输入</TableHead>
                <TableHead>输出</TableHead>
                <TableHead>开始时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{run.agent_id}</TableCell>
                  <TableCell>{run.run_type}</TableCell>
                  <TableCell><StatusBadge value={run.status} /></TableCell>
                  <TableCell><code className="text-xs">{JSON.stringify(run.input)}</code></TableCell>
                  <TableCell><code className="text-xs">{JSON.stringify(run.output)}</code></TableCell>
                  <TableCell>{formatDate(run.started_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
