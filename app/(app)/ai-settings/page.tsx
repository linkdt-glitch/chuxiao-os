import { KeyRound, ServerCog } from "lucide-react";
import { ProviderTestCard } from "@/components/ai/provider-test-card";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAISettingsData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { activateProviderAction, disableProviderAction } from "./actions";

export default async function AISettingsPage() {
  const { providers, logs } = await getAISettingsData();

  return (
    <>
      <PageHeader
        title="AI Settings AI 设置"
        description="预留 OpenAI / Anthropic / Google / Local Provider 抽象接口；API Key 仅加密存储，不在前端明文展示。"
      />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider 安全配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-white/70 p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <ServerCog className="h-4 w-4" />
                  API Key 只放在服务端环境变量
                </div>
                <p>当前页面只负责选择启用哪个 Provider，不在浏览器里保存或展示密钥。</p>
              </div>
              <div className="space-y-2 rounded-lg border bg-white/70 p-4 font-mono text-xs">
                <div>DEEPSEEK_API_KEY=...</div>
                <div>SILICONFLOW_API_KEY=...</div>
                <div>DEEPSEEK_MODEL=deepseek-v4-flash</div>
                <div>SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3</div>
              </div>
              <p>切换 Provider 会写入审计日志和系统事件，后续 AI 调用会自动使用当前 active Provider。</p>
            </CardContent>
          </Card>
          <ProviderTestCard />
        </div>
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
                      <form action={provider.is_active ? disableProviderAction : activateProviderAction}>
                        <input type="hidden" name="provider_id" value={provider.id} />
                        <ConfirmSubmitButton
                          confirmText="切换 AI Provider 会影响后续 AI 调用，确认继续？"
                          variant={provider.is_active ? "secondary" : "outline"}
                        >
                          {provider.is_active ? "停用" : "启用"}
                        </ConfirmSubmitButton>
                      </form>
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
