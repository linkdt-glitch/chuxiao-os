import { ExternalLink, ImageIcon, KeyRound, ServerCog } from "lucide-react";
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
  const falConfigured = Boolean(process.env.FAL_AI_API_KEY);
  const falModel = process.env.FAL_AI_IMAGE_MODEL ?? "fal-ai/flux/schnell";

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
                <div>SILICONFLOW_FAST_MODEL=Qwen/Qwen2.5-7B-Instruct</div>
                <div>FINANCE_AI_FAST_LOCAL=true</div>
              </div>
              <p>切换 Provider 会写入审计日志和系统事件。财务一句话记账会优先走极速草稿，复杂识别和 AI 对话会自动使用当前 active Provider。</p>
            </CardContent>
          </Card>
          <ProviderTestCard />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-sky-500" />
                图片生成配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-lg border bg-white/70 p-3">
                <span className="font-medium text-foreground">fal.ai 状态</span>
                <span className={falConfigured ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                  {falConfigured ? "已配置 ✓" : "未配置"}
                </span>
              </div>
              <div className="rounded-lg border bg-white/70 p-4 font-mono text-xs space-y-1.5">
                <div className="text-muted-foreground mb-2 font-sans font-medium text-foreground not-italic">在 .env.local 中配置：</div>
                <div>FAL_AI_API_KEY=...</div>
                <div>FAL_AI_IMAGE_MODEL={falModel}</div>
              </div>
              {falConfigured && (
                <div className="rounded-lg border border-green-200 bg-green-50/60 p-3 text-xs text-green-700">
                  当前模型：<span className="font-mono font-medium">{falModel}</span>
                </div>
              )}
              <p>图片生成功能独立于聊天 Provider，专用于 AI 劳动中心的图片生成窗口。</p>
              <a
                href="https://fal.ai/dashboard/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                前往 fal.ai 获取 API Key
              </a>
            </CardContent>
          </Card>
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
