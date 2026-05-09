import { ExternalLink, ImageIcon, KeyRound, Lock, ServerCog, Shield } from "lucide-react";
import { ProviderTestCard } from "@/components/ai/provider-test-card";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IMAGE_MODELS, formatPriceCny, getDefaultModel } from "@/lib/ai/image-models";
import { getAISettingsData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { activateProviderAction, disableProviderAction } from "./actions";

export default async function AISettingsPage() {
  const { providers, logs } = await getAISettingsData();
  const falConfigured = Boolean(process.env.FAL_AI_API_KEY);
  const configuredModelId = process.env.FAL_AI_IMAGE_MODEL ?? getDefaultModel().id;
  const configuredModel =
    IMAGE_MODELS.find((m) => m.id === configuredModelId) ?? getDefaultModel();

  return (
    <>
      <PageHeader
        title="AI 设置"
        description="预留 OpenAI / Anthropic / Google 等 AI 服务商的抽象接口；密钥仅加密存储，不在前端明文展示。"
      />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>服务商安全配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-lg border border-orange-500/15 bg-[#f8fafc] p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <ServerCog className="h-4 w-4" />
                  API Key 只放在服务端环境变量
                </div>
                <p>当前页面只负责选择启用哪个服务商，不在浏览器里保存或展示密钥。</p>
              </div>
              <div className="space-y-2 rounded-lg border border-orange-500/15 bg-[#f8fafc] p-4 font-mono text-xs text-slate-700">
                <div>DEEPSEEK_API_KEY=...</div>
                <div>SILICONFLOW_API_KEY=...</div>
                <div>DEEPSEEK_MODEL=deepseek-v4-flash</div>
                <div>SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3</div>
                <div>SILICONFLOW_FAST_MODEL=Qwen/Qwen2.5-7B-Instruct</div>
                <div>FINANCE_AI_FAST_LOCAL=true</div>
              </div>
              <p>切换服务商会写入审计日志和系统事件。财务一句话记账会优先走极速草稿，复杂识别和 AI 对话会自动使用当前激活的服务商。</p>
            </CardContent>
          </Card>
          <ProviderTestCard />

          {/* SiliconFlow 推荐模型升级提示 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ServerCog className="h-4 w-4 text-orange-600" />
                SiliconFlow 推荐模型组合（2026）
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-400">
              <div
                className="rounded-lg p-3 text-[12px]"
                style={{
                  background: "#f8fafc",
                  border: "1px solid rgba(249,115,22,0.14)"
                }}
              >
                <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                    style={{
                      background: "rgba(74,222,128,0.10)",
                      color: "#86efac",
                      border: "1px solid rgba(74,222,128,0.30)"
                    }}
                  >
                    已升级
                  </span>
                  代码默认值
                </div>
                <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60 text-[11px]">
                  <li>极速短任务 → <span className="font-mono text-orange-700">Qwen/Qwen2.5-7B-Instruct</span> · 首字节 &lt;300ms</li>
                  <li>AI 对话 → <span className="font-mono text-orange-700">deepseek-ai/DeepSeek-V3.1</span> · hybrid thinking + 164K 上下文</li>
                  <li>拍照识图 → <span className="font-mono text-orange-700">Qwen/Qwen2.5-VL-7B-Instruct</span> · 比 72B 快 5-10×，识别票据足够</li>
                  <li>价格档：<span className="text-emerald-700">输入 ¥1.94/M · 输出 ¥7.92/M</span>（V3.1，与 V3 同价但质量更高）</li>
                </ul>
              </div>

              <div
                className="rounded-lg p-3 text-[11px] leading-relaxed text-amber-800"
                style={{
                  background: "rgba(251,191,36,0.06)",
                  border: "1px solid rgba(251,191,36,0.28)"
                }}
              >
                <div className="mb-1 font-medium text-amber-800">如果你之前在 Render 设过环境变量</div>
                <p>
                  Render 的 env 会覆盖代码默认值。要享受新组合，请到 Render Dashboard → chuxiao-os → Environment 把这 4 项更新（设过的话）：
                </p>
                <ul className="ml-3 mt-1.5 list-disc font-mono text-[10px] marker:text-amber-700">
                  <li>SILICONFLOW_MODEL = deepseek-ai/DeepSeek-V3.1</li>
                  <li>SILICONFLOW_CHAT_MODEL = deepseek-ai/DeepSeek-V3.1</li>
                  <li>SILICONFLOW_VISION_MODEL = Qwen/Qwen2.5-VL-7B-Instruct</li>
                  <li>SILICONFLOW_FAST_MODEL = Qwen/Qwen2.5-7B-Instruct（保持）</li>
                </ul>
                <p className="mt-1.5">如果没设过任何 env，系统会自动用上面的默认值，无需操作。</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-orange-600" />
                图片生成配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-400">
              {/* status row */}
              <div
                className="flex items-center justify-between rounded-lg p-3"
                style={{
                  background: "#f8fafc",
                  border: "1px solid rgba(249,115,22,0.14)"
                }}
              >
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  <Shield className="h-4 w-4 text-orange-600" />
                  fal.ai API Key
                </span>
                <span
                  className={
                    falConfigured
                      ? "font-mono text-xs font-medium text-emerald-700"
                      : "font-mono text-xs font-medium text-amber-700"
                  }
                >
                  {falConfigured ? "✓ 已配置" : "✗ 未配置"}
                </span>
              </div>

              {/* security note */}
              <div
                className="rounded-lg p-3 text-xs"
                style={{
                  background: "#f8fafc",
                  border: "1px solid rgba(249,115,22,0.14)"
                }}
              >
                <div className="mb-1.5 flex items-center gap-2 font-medium text-slate-900">
                  <Lock className="h-3.5 w-3.5 text-orange-600" />
                  密钥保护策略
                </div>
                <ul className="ml-1 space-y-1 text-[11px] leading-relaxed">
                  <li>· 密钥只读取自 Render 服务端环境变量，**永远不会**返回给浏览器</li>
                  <li>· 客户端只能选择白名单内的 6 个模型，无法绕过传任意 endpoint</li>
                  <li>· 每用户每分钟最多生成 10 张，超限自动 429</li>
                  <li>· 每次调用写入 ai_invocation_logs，可在下方调用日志审计</li>
                  <li>· 失败错误不向客户端泄露 fal.ai 内部细节</li>
                </ul>
              </div>

              {/* default model */}
              {falConfigured && (
                <div
                  className="rounded-lg p-3 text-xs"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.28)"
                  }}
                >
                  <div className="font-medium text-emerald-700">当前默认模型</div>
                  <div className="mt-1 font-mono text-[11px] text-emerald-700">
                    {configuredModel.label} · {configuredModel.id}
                  </div>
                  <div className="mt-0.5 text-[11px] text-emerald-600">
                    单张约 {formatPriceCny(configuredModel.pricePerImageCny)} · {configuredModel.approxSeconds}s · 用户在生成界面可临时切换其它模型
                  </div>
                </div>
              )}

              {/* available models */}
              <div>
                <div className="mb-1.5 font-medium text-slate-900">可选模型清单</div>
                <div className="space-y-1.5">
                  {IMAGE_MODELS.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between gap-3 rounded-md p-2 text-xs"
                      style={{
                        background: "#f8fafc",
                        border: "1px solid rgba(249,115,22,0.10)"
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{model.label}</div>
                        <div className="truncate font-mono text-[10px] text-slate-500">{model.id}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono tabular-nums text-orange-700">
                          {formatPriceCny(model.pricePerImageCny)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          ~{model.approxSeconds}s
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* setup hint */}
              {!falConfigured && (
                <div
                  className="rounded-lg p-3 text-[11px] leading-relaxed text-amber-700/85"
                  style={{
                    background: "rgba(251,191,36,0.06)",
                    border: "1px solid rgba(251,191,36,0.28)"
                  }}
                >
                  <div className="mb-1 font-medium">配置步骤（生产）</div>
                  <ol className="ml-3 list-decimal space-y-0.5">
                    <li>打开 Render dashboard → 选 chuxiao-os 服务</li>
                    <li>左侧 Environment → Add Environment Variable</li>
                    <li>Key = <span className="font-mono">FAL_AI_API_KEY</span>，Value = 你从 fal.ai 拿到的 key</li>
                    <li>Save Changes，等约 30s 自动重启</li>
                  </ol>
                </div>
              )}

              <a
                href="https://fal.ai/dashboard/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                前往 fal.ai 获取 / 管理 API Key
              </a>
            </CardContent>
          </Card>

          {/* ── Amazon 官方规格速查 (2026) ─────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-orange-600" />
                亚马逊图片官方规格速查 (2026)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-400">
              <div
                className="rounded-lg p-3 text-[12px]"
                style={{
                  background: "#f8fafc",
                  border: "1px solid rgba(249,115,22,0.14)"
                }}
              >
                <div className="mb-2 font-medium text-slate-900">主图（Main Image）</div>
                <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60 text-[11px]">
                  <li>纯白底 <span className="font-mono text-orange-700">RGB 255,255,255</span></li>
                  <li>最低 <span className="font-mono text-orange-700">1000×1000</span>（启用放大功能必须）</li>
                  <li>推荐 <span className="font-mono text-emerald-700">2000×2000+</span> · 甜区 2000-3000</li>
                  <li>仅产品本体 · 占图 ≥85% · 无人物/文字/水印/logo</li>
                </ul>
              </div>

              <div
                className="rounded-lg p-3 text-[12px]"
                style={{
                  background: "#f8fafc",
                  border: "1px solid rgba(249,115,22,0.14)"
                }}
              >
                <div className="mb-2 font-medium text-slate-900">附图（Additional Images）</div>
                <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60 text-[11px]">
                  <li>背景颜色不限 · 可加文字/人物/场景</li>
                  <li>同样建议 ≥1000×1000，推荐 2000+</li>
                  <li>每个 ASIN 最多 9 张图</li>
                </ul>
              </div>

              <div
                className="rounded-lg p-3 text-[12px]"
                style={{
                  background: "#f8fafc",
                  border: "1px solid rgba(249,115,22,0.14)"
                }}
              >
                <div className="mb-2 font-medium text-slate-900">通用技术规格</div>
                <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60 text-[11px]">
                  <li>格式：<span className="font-mono">JPEG / PNG / TIFF / GIF</span>（无动画）</li>
                  <li>体积：<span className="font-mono text-orange-700">≤10MB / 张</span></li>
                  <li>最大单边：<span className="font-mono">10000px</span></li>
                  <li>最大宽高比：<span className="font-mono">5:1</span></li>
                  <li>色彩空间：<span className="font-mono">sRGB</span> 或 <span className="font-mono">CMYK</span></li>
                </ul>
              </div>

              <div
                className="rounded-lg p-3 text-[12px]"
                style={{
                  background: "#f8fafc",
                  border: "1px solid rgba(249,115,22,0.14)"
                }}
              >
                <div className="mb-2 font-medium text-slate-900">A+ Content（品牌内容）</div>
                <ul className="ml-3 space-y-1 list-disc marker:text-orange-600/60 text-[11px]">
                  <li>Hero Banner: 970×600 或 1464×600</li>
                  <li>Standard image: 300×300 / 600×180 / 970×300</li>
                  <li>对比卡缩略图: 100×100</li>
                  <li>logo: 600×180 推荐 PNG 透明底</li>
                </ul>
              </div>

              <a
                href="https://sellercentral.amazon.com/help/hub/reference/external/G1881"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Amazon Seller Central 官方规格文档
              </a>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>服务商列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>API 地址</TableHead>
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
                        <KeyRound className="h-3 w-3" /> 密钥已加密
                      </div>
                    </TableCell>
                    <TableCell>{provider.model_name}</TableCell>
                    <TableCell>{provider.base_url}</TableCell>
                    <TableCell><StatusBadge value={provider.is_active ? "active" : "disabled"} /></TableCell>
                    <TableCell className="text-right">
                      <form action={provider.is_active ? disableProviderAction : activateProviderAction}>
                        <input type="hidden" name="provider_id" value={provider.id} />
                        <ConfirmSubmitButton
                          confirmText="切换 AI 服务商会影响后续 AI 调用，确认继续？"
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
                <TableHead>提示词预览</TableHead>
                <TableHead>Token 数</TableHead>
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
