# Finance Center MVP 使用说明

## 数据库

执行 Supabase migration：

```bash
supabase db push
```

新增迁移：

- `supabase/migrations/202604250002_finance_center.sql`

该迁移会创建财务表、索引、RLS 策略、finance 权限、finance 模块注册，并为现有组织 seed 默认财务类目和账户。

## 页面

- `/finance`：财务首页，看本月收入、支出、利润、现金余额、待审批报销和最近流水。
- `/finance/ai-bookkeeping`：一句话 AI 记账。AI 只解析，用户确认后才保存。
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

导出格式为真正的 `.xlsx`，使用 `exceljs` 生成，包含标题、表头、合计、导出时间和导出人。

## 底座集成

- 报销和需审批支出通过 `createApproval()` 写入 `approval_requests`。
- 文件票据仍复用 `files` / `file_links`，第一版表单保留票据说明，后续可接文件上传组件。
- AI 解析调用 `invokeAI()`，并写 `ai_invocation_logs` 与 `finance_ai_parse_logs`。
- 关键动作写 `audit_logs` 并 emit `system_events`。
- 数据隔离使用 `organization_id` 和 RLS。

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
