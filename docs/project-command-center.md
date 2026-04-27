# 执行指挥舱 Project Command Center

## 已接入能力

- 模块注册：`projects` 已从 Coming Soon 切换为 active，并通过 `organization_modules` 默认启用。
- 权限：新增 `projects.view`、`projects.manage`、`tasks.view`、`tasks.create`、`tasks.update`、`tasks.delete`、`tasks.comment`、`tasks.files`、`tasks.archive`。
- 数据隔离：`projects`、`tasks`、`task_comments`、`task_files`、`project_reviews` 均带 `organization_id`，并启用 RLS。
- 成员复用：项目负责人和任务负责人均引用 `organization_members`。
- 审批复用：任务归档会创建 `approval_requests`，用于任务相关审批留痕。
- 日志事件：项目、任务、评论、附件、复盘关键操作会写入 `audit_logs`，并发出 `system_events`。
- 文件复用：任务附件会写入 `files`，通过 `file_links` 关联任务，同时保留 `task_files` 作为任务附件视图表。

## 页面范围

- `/projects`：项目列表、统计卡、状态/负责人筛选。
- `/projects/new`：创建项目。
- `/projects/[id]`：项目详情、任务进度、最近评论、任务附件、状态切换、项目编辑。
- `/projects/[id]/tasks`：任务列表与任务创建。
- `/projects/[id]/tasks/[task_id]`：任务详情、状态/进度更新、评论、附件上传、任务归档。
- `/projects/[id]/review`：项目复盘、任务回顾、下一步行动沉淀。

## 后续接入经营能量舱

- 在 `finance_records.project_id` 上补充外键到 `projects.id`，保留现有 `project_name` 作为历史兼容字段。
- 财务流水页增加项目筛选，项目详情页增加「相关收入/支出/报销」摘要。
- 项目复盘可读取项目相关财务数据，形成项目投入、报销风险、现金流影响的轻量总结。
- 暂不做项目成本核算；第一步只做项目维度的财务关联和统计入口。

## 后续接入智能劳动力中心

- 在 Agent 运行记录 `agent_run_logs` 的 `related_module/related_record_type/related_record_id` 中关联 `projects` 或 `tasks`。
- 允许授权 Agent 基于任务描述、评论和附件摘要生成任务进展草稿，但提交评论、更新状态、归档任务仍走人工确认。
- 将任务执行质量反馈写入 `feedback_records`，项目复盘结论可沉淀到 `review_records` / `sop_records`。
- Agent 角色保持只读与辅助执行，不授予项目/任务管理和权限管理能力。
