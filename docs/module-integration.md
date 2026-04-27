# 后续模块接入说明

## 通用接入步骤

1. 在 `modules` 表注册模块：`key`、`name`、`route`、`required_permission`、`status`。
2. 在 `permissions` 表注册权限：建议命名为 `{module}.{action}`。
3. 为组织写入 `organization_modules`，通过 `is_enabled` 控制导航和入口。
4. 新模块表必须包含 `organization_id`，并开启 RLS。
5. 高风险写操作调用 `createApproval()`，关键动作调用 `logAction()` 和 `emitEvent()`。
6. 文件资产统一写入 `files`，业务关联写入 `file_links`。
7. AI 调用统一走 `invokeAI()` 或至少调用 `logAIInvocation()`。

## 财务记账模块

- 新增模块 key：`finance`，从 `coming_soon` 改为 `active`。
- 新增权限：`finance.view`、`finance.create`、`finance.update`、`finance.delete`、`finance.approve`、`finance.export`、`finance.view_all`、`finance.view_team`、`finance.category.manage`、`finance.account.manage`、`finance.ai_parse`。
- 财务业务表：`finance_records`、`finance_categories`、`finance_accounts`、`finance_ai_parse_logs`、`finance_exports`，都包含 `organization_id`。
- 报销和需审批支出进入 `approval_requests`，`related_module=finance`，`related_record_type=finance_record`。
- 票据附件使用 `files` + `file_links` 关联到 `finance_records`。

## 任务项目模块

- 新增模块 key：`projects`。
- 新增权限：`projects.read`、`projects.manage`、`projects.assign`。
- 业务表建议：`projects`、`project_tasks`、`task_comments`。
- Agent L3 可创建内部任务草稿，但分配负责人或变更关键里程碑需负责人确认。
- 任务创建、状态变更、逾期事件写入 `system_events`，用于未来 Workflows 订阅。

## Prompt 中心

- 新增模块 key：`prompt-center`。
- 新增权限：`prompt-center.read`、`prompt-center.manage`、`prompt-center.publish`。
- 业务表建议：`prompts`、`prompt_versions`、`prompt_evaluations`。
- Prompt 发布和回滚写入 `audit_logs`；生产 Prompt 变更可按 `risk_level=high` 走审批。
- Prompt 测试调用 AI 时写入 `ai_invocation_logs`，方便核算成本和效果。

## Agent 自动化

- 新增模块 key：`workflows`。
- 业务表建议：`workflow_definitions`、`workflow_runs`、`workflow_steps`。
- 触发器读取 `system_events`，执行前检查 Agent `permission_level`、`allowed_modules`、`allowed_tools`。
- L1/L2 不直接写业务数据；L3 需要负责人确认；L4 必须审批；L5 禁止自动执行。
- 每次运行写入 `agent_run_logs`，业务影响写入 `audit_logs`。

## 公司驾驶舱

- 新增模块 key：`company-dashboard`。
- 不直接拥有复杂业务表，优先读取各模块聚合视图或物化视图。
- 每个业务模块提供统一指标视图，例如 `finance_metrics_view`、`project_metrics_view`。
- 驾驶舱按 `organization_id` 汇总，只展示当前用户有权限访问的模块数据。
- AI 总结可读取聚合结果后调用 `invokeAI()`，并记录 `ai_invocation_logs`。
