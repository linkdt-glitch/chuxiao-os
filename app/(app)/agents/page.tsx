import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
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
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input id="name" placeholder="财务分析 Agent" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner">负责人 user_id</Label>
                <Input id="owner" placeholder="user_ops" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">权限等级</Label>
                <Input id="level" placeholder="L1 / L2 / L3 / L4 / L5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">描述</Label>
                <Textarea id="desc" placeholder="Agent 职责、允许模块和工具边界" />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                创建 Agent
              </Button>
            </form>
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
                      <ConfirmButton label="暂停" confirmText="暂停 Agent 会阻止后续自动动作，确认继续？" />
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
