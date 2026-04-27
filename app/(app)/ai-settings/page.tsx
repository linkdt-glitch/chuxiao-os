import { KeyRound, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAISettingsData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function AISettingsPage() {
  const { providers, logs } = await getAISettingsData();

  return (
    <>
      <PageHeader
        title="AI Settings AI 设置"
        description="预留 OpenAI / Anthropic / Google / Local Provider 抽象接口；API Key 仅加密存储，不在前端明文展示。"
      />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>添加 Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input id="provider" placeholder="openai / anthropic / google / local" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">模型名称</Label>
                <Input id="model" placeholder="gpt-4.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseUrl">base_url</Label>
                <Input id="baseUrl" placeholder="https://api.openai.com/v1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input id="apiKey" type="password" placeholder="sk-..." />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                保存 Provider
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Provider 列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>base_url</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="font-medium">{provider.label}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <KeyRound className="h-3 w-3" /> API Key encrypted
                      </div>
                    </TableCell>
                    <TableCell>{provider.model_name}</TableCell>
                    <TableCell>{provider.base_url}</TableCell>
                    <TableCell><StatusBadge value={provider.is_active ? "active" : "disabled"} /></TableCell>
                    <TableCell className="text-right">
                      <ConfirmButton label={provider.is_active ? "停用" : "启用"} confirmText="切换 AI Provider 会影响后续 AI 调用，确认继续？" />
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
          <CardTitle>AI 调用日志</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>调用者</TableHead>
                <TableHead>模块</TableHead>
                <TableHead>Prompt preview</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>成本估算</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.invoked_by_type}:{log.invoked_by}</TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell className="max-w-xs truncate">{log.prompt_preview}</TableCell>
                  <TableCell>{log.input_tokens}/{log.output_tokens}</TableCell>
                  <TableCell>{log.cost_estimate}</TableCell>
                  <TableCell><StatusBadge value={log.status} /></TableCell>
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
