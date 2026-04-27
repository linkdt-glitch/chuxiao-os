# AI Company OS 自进化组织系统升级说明

本次升级是增量式架构升级，不删除旧表、不破坏旧路由、不重写原有底座。旧能力继续可用，新能力通过模块注册、权限和聚合页接入。

## 新增能力

- 领航驾驶舱：升级 `/dashboard`，聚合组织状态、待办、经营摘要、执行摘要、智能劳动力摘要和优化建议。
- 组织护航盾：新增 `/governance`，聚合角色权限、审批、日志、事件和风险规则预留。
- 组织大脑库：新增 `/knowledge`，聚合文件、知识资产分类、SOP 和复盘。
- 成长飞轮引擎：新增 `/evolution`，支持反馈、复盘、SOP、优化建议的基础闭环。
- 智能劳动力中心：新增 `/ai-workforce`，聚合 Agent、AI Provider、AI 调用记录、Prompt 和人工确认预留。

## 增量数据库

新增 migration：

```txt
supabase/migrations/202604260001_self_evolving_os.sql
```

新增表：

- `feedback_records`
- `review_records`
- `sop_records`
- `improvement_suggestions`

可选扩展：

- `files.asset_type`
- `files.tags`
- `files.summary`

所有新增组织级表均包含 `organization_id`、索引和 RLS。新增权限和模块也在 migration 中通过 `insert ... on conflict` 做幂等升级。

## 新模块注册

- `dashboard`：领航驾驶舱，active
- `finance`：经营能量舱，active，复用现有财务中心基础版
- `projects`：执行指挥舱，coming_soon
- `ai_workforce`：智能劳动力中心，active
- `governance`：组织护航盾，active
- `knowledge`：组织大脑库，active
- `evolution`：成长飞轮引擎，active

旧模块 key 保留：`roles`、`approvals`、`logs`、`events`、`files`、`agents`、`ai-settings`、`modules`、`organization`、`settings`。

## 后续模块接入

### 经营能量舱接入财务中心

当前 `/finance` 已是基础版。后续继续扩展时保持 `finance` module key，不改组织、权限、审批、日志结构。大额支出、报销审批、关键账务调整写入 `approval_requests`，附件继续通过 `files` + `file_links` 关联，经营摘要通过聚合函数供 `/dashboard` 读取。

### 执行指挥舱接入项目任务

保持 `projects` module key。新增项目任务表时必须带 `organization_id` 和 RLS。任务创建、延期、完成等动作写入 `system_events`，关键变更写 `audit_logs`，项目复盘写入 `review_records`，高质量流程沉淀到 `sop_records`。

### 智能劳动力中心接入 Prompt 和 Agent 自动化

保持 `ai_workforce` module key。Prompt 模板建议新增 `prompt_templates`、`prompt_versions`，调用统一写入 `ai_invocation_logs`，输出质量写入 `feedback_records`。Agent 自动化动作必须检查 `permission_level`、`allowed_modules`、`allowed_tools`，L4 进入审批，L5 禁止自动执行。

### 领航驾驶舱聚合业务数据

`/dashboard` 不直接持有复杂业务逻辑，只读取各模块服务层或聚合视图。每个业务模块应提供 summary 查询，例如 `getFinanceSummary()`、`getProjectSummary()`、`getAIWorkforceData()`，Dashboard 只负责组合展示。

### 成长飞轮持续进化

闭环路径：

```txt
发现问题 -> 总结经验 -> 优化流程 -> 升级能力 -> 再次执行
```

反馈进入 `feedback_records`，复盘进入 `review_records`，可复用流程进入 `sop_records`，改进动作进入 `improvement_suggestions`。未来可由 Agent 根据 `system_events`、审批结果、AI 调用质量和用户反馈自动生成优化建议，但当前版本只做人工创建和结构预留。
