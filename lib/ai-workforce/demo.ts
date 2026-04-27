import { demoAIInvocationLogs, demoAgents, demoMembers } from "@/lib/data/demo";
import type { AgentRunLog, AIConfirmationRequest, PromptTemplate, PromptVersion } from "@/lib/ai-workforce/types";

const now = new Date("2026-04-26T08:00:00.000Z").toISOString();

export const demoPromptVersions: PromptVersion[] = [
  {
    id: "demo_prompt_version_finance",
    organization_id: "org_qiming",
    prompt_template_id: "demo_prompt_finance",
    version: "1.0",
    content: "你是财务分析 Agent。请基于输入数据识别收入、支出、利润异常，只输出建议，不修改数据。",
    change_note: "初始版本",
    created_at: now
  },
  {
    id: "demo_prompt_version_weekly",
    organization_id: "org_qiming",
    prompt_template_id: "demo_prompt_weekly",
    version: "1.0",
    content: "你是项目助理 Agent。请生成项目周报，标记延期风险和需要人工确认的事项。",
    change_note: "初始版本",
    created_at: now
  }
];

export const demoPrompts: PromptTemplate[] = [
  {
    id: "demo_prompt_finance",
    organization_id: "org_qiming",
    name: "财务异常分析 Prompt",
    description: "用于分析收入、支出、利润和异常波动。",
    scenario: "财务月度分析",
    module: "finance",
    tags: ["finance", "analysis"],
    input_variables: [{ name: "period", type: "string" }, { name: "records", type: "array" }],
    output_format: "结构化摘要、异常原因、建议动作",
    quality_criteria: "结论可追溯；不得编造金额；风险动作只给建议。",
    current_version: "1.0",
    status: "published",
    owner_id: "user_ops",
    created_at: now,
    updated_at: now,
    versions: [demoPromptVersions[0]]
  },
  {
    id: "demo_prompt_weekly",
    organization_id: "org_qiming",
    name: "项目周报生成 Prompt",
    description: "汇总项目进度、风险和下周计划。",
    scenario: "项目周报",
    module: "projects",
    tags: ["projects", "weekly"],
    input_variables: [{ name: "project", type: "string" }, { name: "tasks", type: "array" }],
    output_format: "本周完成、风险、下周计划",
    quality_criteria: "表达清晰；风险要有责任人与截止时间。",
    current_version: "1.0",
    status: "published",
    owner_id: "user_ops",
    created_at: now,
    updated_at: now,
    versions: [demoPromptVersions[1]]
  }
];

export const demoConfirmations: AIConfirmationRequest[] = [
  {
    id: "demo_confirmation_tasks",
    organization_id: "org_qiming",
    agent_id: "agent_finance",
    requester_id: "agent_finance",
    requester_type: "agent",
    related_module: "projects",
    related_record_type: "task_suggestion",
    related_record_id: "demo_tasks",
    action_type: "create_tasks",
    risk_level: "medium",
    title: "Agent 建议创建 3 个任务",
    description: "项目助理 Agent 基于延期风险建议创建内部任务。",
    input_data: { project: "官网改版" },
    proposed_output: { tasks: ["补齐验收标准", "确认设计稿冻结时间", "安排上线前回归测试"] },
    status: "pending",
    created_at: now,
    updated_at: now
  }
];

export const demoWorkforceRuns: AgentRunLog[] = [
  {
    id: "demo_run_finance",
    organization_id: "org_qiming",
    agent_id: "agent_finance",
    run_type: "finance_analysis",
    related_module: "finance",
    status: "success",
    input: { period: "2026-04" },
    output: { summary: "收入稳定，AI 工具支出略有上升。" },
    started_at: now,
    finished_at: now,
    created_at: now,
    updated_at: now
  }
];

export const demoWorkforceData = {
  agents: demoAgents.map((agent) => ({
    ...agent,
    owner: demoMembers.find((member) => member.user_id === agent.owner_user_id)
      ? {
          id: agent.owner_user_id,
          full_name: demoMembers.find((member) => member.user_id === agent.owner_user_id)?.display_name ?? agent.owner_user_id
        }
      : null,
    bindings: [],
    ai_logs: demoAIInvocationLogs.filter((log) => log.invoked_by === agent.id),
    runs: demoWorkforceRuns.filter((run) => run.agent_id === agent.id)
  })),
  prompts: demoPrompts,
  confirmations: demoConfirmations,
  runs: demoWorkforceRuns
};
