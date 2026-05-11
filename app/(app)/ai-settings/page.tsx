import { Brain, ExternalLink, ImageIcon, KeyRound, Lock, ServerCog, Shield, Sparkles, Zap } from "lucide-react";
import { ProviderTestCard } from "@/components/ai/provider-test-card";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IMAGE_MODELS, formatPriceCny, getDefaultModel } from "@/lib/ai/image-models";
import { ALL_MODELS, type ModelCatalogEntry } from "@/lib/ai/models-catalog";
import { readProviderAudience, type ProviderAudience } from "@/lib/ai";
import { getAISettingsData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { activateProviderAction, disableProviderAction, setProviderAudienceAction } from "./actions";

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
              <div className="space-y-1 rounded-lg border border-orange-500/15 bg-[#f8fafc] p-4 font-mono text-xs text-slate-700">
                <div className="mb-1.5 text-slate-500">⭐ 推荐：DeepSeek 直连（创始人 R1 + 员工 V3.2）</div>
                <div>DEEPSEEK_API_KEY=sk-...</div>
                <div className="mt-2 text-slate-500"># 备用：SiliconFlow 转售（同款模型，可选）</div>
                <div>SILICONFLOW_API_KEY=sk-...</div>
              </div>
              <p>
                建议在 <span className="font-mono">Render → Environment</span> 里配置 <span className="font-mono">DEEPSEEK_API_KEY</span>，
                然后到本页底部点击 <strong>启用</strong> DeepSeek 即可。代码会自动按角色路由：
                创始人对话用 <span className="font-mono">deepseek-v4-pro</span>（顶级思考，目前 75% 折扣至 2026/05/31），
                员工对话用 <span className="font-mono">deepseek-v4-flash</span>（1M 上下文，单次约 ¥0.005）。
              </p>
            </CardContent>
          </Card>
          <ProviderTestCard />

          {/* AI 模型目录 —— 谁用什么、多少钱 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-600" />
                AI 模型目录（按角色 / 用途）
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] leading-relaxed text-slate-700">
                系统根据「谁在用」+「干什么」自动选最合适的模型。创始人对话默认走顶级推理模型，
                员工对话走平衡型，记账解析走极速模型 —— 既保证关键决策的质量，也避免高频小任务烧钱。
              </p>
              {ALL_MODELS.map((model) => (
                // FAST_PARSE 和 VISION 现在共用同一个 id (Qwen3-VL-32B-Instruct)
                // 所以 React key 要用 tier+id 组合，否则同 id 会导致 dup key warning
                <ModelCatalogCard key={`${model.tier}-${model.id}`} model={model} />
              ))}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                价格按 SiliconFlow 2026-05 公开报价估算，按 token 实际计费。
                如需在 Render 环境变量里覆盖默认模型，可设
                <span className="mx-1 font-mono">SILICONFLOW_FOUNDER_CHAT_MODEL</span>
                /
                <span className="mx-1 font-mono">SILICONFLOW_CHAT_MODEL</span>
                /
                <span className="mx-1 font-mono">SILICONFLOW_FAST_MODEL</span>
                /
                <span className="mx-1 font-mono">SILICONFLOW_VISION_MODEL</span>。
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
            <p className="mb-3 text-[12px] leading-relaxed text-slate-700">
              支持「<strong>双 provider 同时启用</strong>」。在每行的「服务对象」选 <strong>仅创始人</strong> /
              <strong> 仅员工</strong> / <strong>全员</strong>，系统会按角色路由 ——
              比如：DeepSeek 仅创始人 + 硅基流动 仅员工，两个同时跑互不干扰。
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>服务对象</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => {
                  const audience = readProviderAudience(provider);
                  return (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="font-medium">{provider.label}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <KeyRound className="h-3 w-3" /> 密钥已加密
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{provider.model_name}</TableCell>
                      <TableCell>
                        <AudienceChips providerId={provider.id} current={audience} />
                      </TableCell>
                      <TableCell><StatusBadge value={provider.is_active ? "active" : "disabled"} /></TableCell>
                      <TableCell className="text-right">
                        <form action={provider.is_active ? disableProviderAction : activateProviderAction}>
                          <input type="hidden" name="provider_id" value={provider.id} />
                          <ConfirmSubmitButton
                            confirmText={
                              provider.is_active
                                ? "停用此 provider 后，对应受众的 AI 调用会停下来。确认？"
                                : "启用此 provider（同受众组里其他会自动停用）。确认继续？"
                            }
                            variant={provider.is_active ? "secondary" : "outline"}
                          >
                            {provider.is_active ? "停用" : "启用"}
                          </ConfirmSubmitButton>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

/**
 * 服务对象选择器 —— 3 个 chip 一字排开。点哪个 → 弹确认 → 写 settings.audience
 * 并自动启用本 provider（同 audience 组内其他停用）。
 */
function AudienceChips({
  providerId,
  current
}: {
  providerId: string;
  current: ProviderAudience;
}) {
  const options: Array<{ value: ProviderAudience; label: string; chipClass: string; confirmHint: string }> = [
    {
      value: "all",
      label: "全员",
      chipClass: "border-slate-300 bg-slate-50 text-slate-700",
      confirmHint: "切到「全员」会让所有用户用这个 provider，并启用它（同组内其他停用）。确认？"
    },
    {
      value: "founder",
      label: "仅创始人",
      chipClass: "border-orange-300 bg-orange-50 text-orange-700",
      confirmHint: "切到「仅创始人」后只有 owner 用这个 provider，并启用它。确认？"
    },
    {
      value: "staff",
      label: "仅员工",
      chipClass: "border-sky-300 bg-sky-50 text-sky-700",
      confirmHint: "切到「仅员工」后只有非 owner 用这个 provider，并启用它。确认？"
    }
  ];
  const activeClass: Record<ProviderAudience, string> = {
    all: "ring-2 ring-slate-400",
    founder: "ring-2 ring-orange-500",
    staff: "ring-2 ring-sky-500"
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <form key={opt.value} action={setProviderAudienceAction} className="inline">
          <input type="hidden" name="provider_id" value={providerId} />
          <input type="hidden" name="audience" value={opt.value} />
          <ConfirmSubmitButton
            confirmText={opt.confirmHint}
            variant="outline"
            className={
              "h-7 rounded-full border px-2.5 text-[11px] font-semibold " +
              opt.chipClass +
              (current === opt.value ? " " + activeClass[current] : " hover:brightness-95")
            }
          >
            {opt.label}
          </ConfirmSubmitButton>
        </form>
      ))}
    </div>
  );
}

/**
 * 单个模型卡 —— 显示模型名 / 适用场景 / 输入输出价格 / 一次大概多少钱。
 *
 * 创始人专属（tier=founder）会用更显眼的橙色高亮 + 「创始人」徽章；
 * 其他档位用普通 outline 卡。
 */
function ModelCatalogCard({ model }: { model: ModelCatalogEntry }) {
  const isFounder = model.tier === "founder";
  const isVision = model.tier === "vision";
  const isFast = model.tier === "fast";

  const Icon = isFounder ? Brain : isVision ? ImageIcon : isFast ? Zap : Sparkles;
  const iconBg = isFounder
    ? "bg-orange-500"
    : isVision
      ? "bg-violet-500"
      : isFast
        ? "bg-sky-500"
        : "bg-slate-700";

  const tierLabel = {
    founder: "创始人专属",
    standard: "员工日常",
    fast: "极速 / 解析",
    vision: "图像识别"
  }[model.tier];

  return (
    <div
      className={`rounded-xl border p-3.5 transition-colors ${
        isFounder
          ? "border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-white shadow-[0_0_0_1px_rgba(249,115,22,0.10),0_8px_24px_-12px_rgba(249,115,22,0.20)]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[14px] font-semibold text-slate-900">{model.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isFounder
                  ? "bg-orange-500 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {tierLabel}
            </span>
            <span className="font-mono text-[10px] text-slate-500">{model.vendor}</span>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{model.description}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-700">推荐场景：</span>
            {model.recommendedFor}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
              <div className="text-slate-500">输入价</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums">
                ¥{model.inputPriceCnyPerMillion}/M
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
              <div className="text-slate-500">输出价</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums">
                ¥{model.outputPriceCnyPerMillion}/M
              </div>
            </div>
            <div
              className={`rounded-md border px-2 py-1.5 ${
                isFounder ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="text-slate-500">一次约</div>
              <div
                className={`font-mono font-semibold tabular-nums ${
                  isFounder ? "text-orange-700" : "text-slate-900"
                }`}
              >
                {model.approxCostPerTurnCny < 0.01
                  ? "< ¥0.01"
                  : `¥${model.approxCostPerTurnCny.toFixed(2)}`}
              </div>
            </div>
          </div>
          <div className="mt-2 font-mono text-[10px] text-slate-500">
            {model.id} · 上下文 {model.contextWindowK}K tokens
          </div>
        </div>
      </div>
    </div>
  );
}
