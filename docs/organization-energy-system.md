# 组织能量系统使用说明

组织能量系统是初晓 OS 的轻量正反馈层，用来把记账、任务完成、项目里程碑、Agent 协作、文件归档、复盘和 SOP 沉淀转化为组织成长反馈。

## 使用入口

- 能量首页：`/energy`
- 成就徽章：`/energy/achievements`
- 能量设置：`/energy/settings`

## 触发方式

系统会读取近期 `system_events`，匹配奖励规则后写入 `organization_energy_events`。第一版通过前端 `EnergyProvider` 在用户登录后和使用过程中轻量处理，后续可以替换为后台队列或定时任务。

当前支持的主要事件包括：

- `finance.record.created`
- `finance.ai_confirmed`
- `finance.exported`
- `finance.month_closed`
- `tasks.completed`
- `projects.completed`
- `projects.reviewed`
- `ai_workforce.agent.created`
- `ai_workforce.prompt.published`
- `ai_workforce.agent_run.completed`
- `knowledge.asset.created`
- `sop.created`
- `review.created`
- `improvement.status_changed`
- `daily.login`

## 动画与音效

用户可以在 `/energy/settings` 关闭动画、关闭音效、调整音量、开启专注模式。音效文件放在 `/public/sounds/`，如果文件不存在，系统会自动静默，不会影响业务操作。

建议文件名：

- `success_ping.mp3`
- `coin_light.mp3`
- `badge_unlock.mp3`
- `firework_soft.mp3`
- `morning_chime.mp3`
- `system_upgrade.mp3`
- `click_soft.mp3`

## 安全与数据隔离

- 所有能量事件都带 `organization_id`。
- RLS 会限制用户只能访问自己组织的数据。
- 用户可以调整自己的能量设置。
- Owner/Admin 可以调整组织级默认设置。
- 成就奖励会写入 `user_achievements`。
- 设置变更和成就解锁会写入 `audit_logs` 与 `system_events`。

## 后续扩展

- 可把 `handleSystemEventReward()` 接入后台队列，统一消费 `system_events`。
- 可增加组织等级、飞轮等级、更多成就和 AI 自动鼓励。
- 可在财务、项目、AI 工作中心的关键操作后主动刷新能量状态。
