# Finance Center MVP 使用说明

## 数据库

执行 Supabase migration：

```bash
supabase db push
```

新增迁移：

- `supabase/migrations/202604250002_finance_center.sql`
- `supabase/migrations/202604280001_finance_hardening.sql`
- `supabase/migrations/202604280002_finance_essential_categories.sql`

这些迁移会创建财务表、索引、RLS 策略、finance 权限、finance 模块注册，并为现有组织 seed 默认财务类目和账户。硬化迁移额外提供：

- `finance_can_view_record()`：按个人、团队、部门和 `finance.view_all` 判断流水可见性。
- `finance_settle_record()`：用数据库行锁原子结算付款，避免重复点击导致账户余额重复增减。

## 页面

- `/finance`：财务首页，看本月收入、支出、利润、现金余额、待审批报销和最近流水。
- `/finance`：Owner / Admin / 财务负责人等全量财务权限会额外看到“高权限经营洞察”，包含收入支出可视化、现金流趋势、支出结构、账户分布和经营决策判断。
- `/finance/ai-bookkeeping`：快速 AI 记账。支持文字、手机语音输入、拍照/上传票据识别；AI 只生成草稿，用户确认后才保存。
- `/finance/records`：收入 / 支出 / 报销流水列表、筛选和导出。
- `/finance/records/new`：手动记账。
- `/finance/reimbursements`：我的报销、团队报销、待审批审批。
- `/finance/categories`：类目管理。
- `/finance/accounts`：账户管理。
- `/finance/reports`：基础报表与 Excel 导出。

## Excel 导出

下载接口：

- `/api/finance/export?type=expense`
- `/api/finance/export?type=income`
- `/api/finance/export?type=all`

导出格式为真正的 `.xlsx`，使用 `exceljs` 生成，包含标题、表头、合计、导出时间和导出人。导出时会同时上传到 `company-assets` Storage，写入 `files`，并通过 `file_links` 关联到 `finance_exports`。

## 底座集成

- 报销和需审批支出通过 `createApproval()` 写入 `approval_requests`。
- 文件票据复用 Supabase Storage、`files` 和 `file_links`，记录路径以 `organization_id` 作为第一段，便于 Storage RLS 隔离。
- AI 文本解析调用 `invokeAI()`；票据图片解析调用 `invokeAIWithImages()`，优先使用模型返回的严格 JSON，并用 zod 做结构校验；模型不可用、不支持图片或 JSON 不合格时降级为本地规则解析，并写 `ai_invocation_logs` 与 `finance_ai_parse_logs`。
- 关键动作写 `audit_logs` 并 emit `system_events`。
- 数据隔离使用 `organization_id` 和 RLS。

## 手机端快速记账

- 手机浏览器打开 `/finance/ai-bookkeeping`。
- 可直接输入一句话，也可以点击“语音输入”把语音转成文字。
- 点击“拍照 / 上传票据”可调用手机相机或相册，支持图片和 PDF 上传。
- 解析阶段上传的票据会先作为待确认附件保存，确认入账后自动关联到 `finance_record`。
- 真正的图片 OCR/票据识别依赖当前启用的 AI Provider 和模型支持视觉输入；如果模型不支持图片，系统会保留附件并提示补充金额、日期或说明等关键字段。

## 付款入账

记录从 `approved` 进入 `paid` 时，不直接在前端或服务层手动改余额，而是调用数据库函数 `finance_settle_record()`：

- 锁定对应 `finance_records` 行。
- 检查状态、账户和权限。
- 只允许 `income` / `refund` 增加账户余额，`expense` / `reimbursement` 减少账户余额。
- 若记录已经是 `paid`，函数直接返回，不重复扣款或加款。
- 报销付款后会自动把 `reimbursed` 标记为 true。

## 权限

新增权限：

- `finance.view`
- `finance.create`
- `finance.update`
- `finance.delete`
- `finance.approve`
- `finance.export`
- `finance.view_all`
- `finance.view_team`
- `finance.category.manage`
- `finance.account.manage`
- `finance.ai_parse`

Owner/Admin 默认拥有全部财务权限；Manager 拥有团队查看、审批、导出；Member 只能管理和导出自己的记录；Agent 只能读取授权数据，不能审批、删除或导出。

## 高权限经营洞察

财务首页会根据 `finance.view_all` 或 Owner/Admin/财务负责人角色显示经营判断区：

- 利润率、现金 Runway、待审批敞口、AI 记账占比。
- 近 6 月收入 / 支出柱状图、现金流趋势、支出结构、账户分布。
- 规则化决策判断：本月亏损、现金安全垫不足、支出集中、待审批金额偏高、未分类支出过高、高风险记录、多币种未折算等。
- 第一版以 CNY 为基准币种；外币流水会被识别为“需要折算口径”，后续可接汇率表做统一经营看板。
