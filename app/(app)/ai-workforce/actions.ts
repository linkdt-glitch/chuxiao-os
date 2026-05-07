"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractErrorMessage, withErrorParam } from "@/lib/server/error";
import {
  activateAgent,
  archiveAgent,
  bindPromptToAgent,
  createAgent,
  pauseAgent,
  updateAgent
} from "@/lib/ai-workforce/agents";
import { approveConfirmation, createConfirmationRequest, rejectConfirmation } from "@/lib/ai-workforce/confirmations";
import { createAIFeedback } from "@/lib/ai-workforce/feedback";
import {
  archivePrompt,
  createPrompt,
  createPromptVersion,
  publishPrompt,
  testPrompt,
  updatePrompt
} from "@/lib/ai-workforce/prompts";
import { createAgentRun } from "@/lib/ai-workforce/runs";
import type { AgentPermissionLevel, RiskLevel } from "@/lib/types/core";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function values(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function jsonObject(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed };
  } catch {
    return { text: raw };
  }
}

function inputVariables(formData: FormData) {
  const raw = value(formData, "input_variables");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as Array<Record<string, unknown>> : [];
  } catch {
    return raw
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, type: "string" }));
  }
}

export async function createAgentAction(formData: FormData) {
  let agentId: string | undefined;
  try {
    const agent = await createAgent({
      name: value(formData, "name") ?? "新 Agent",
      description: value(formData, "description") ?? "",
      owner_user_id: value(formData, "owner_user_id") ?? "",
      permission_level: (value(formData, "permission_level") ?? "L1") as AgentPermissionLevel,
      allowed_modules: values(formData, "allowed_modules"),
      allowed_tools: values(formData, "allowed_tools"),
      default_provider_id: value(formData, "default_provider_id") ?? null,
      status: (value(formData, "status") ?? "active") as "active" | "paused" | "archived",
      config: jsonObject(formData, "config")
    });
    agentId = "id" in agent ? agent.id : undefined;
    if (!agentId) throw new Error("AI 员工创建后未拿到 ID。");
  } catch (error) {
    console.error("[createAgentAction] error:", error);
    redirect(withErrorParam("/ai-workforce/agents", extractErrorMessage(error)));
  }
  redirect(`/ai-workforce/agents/${agentId}?notice=${encodeURIComponent("AI 员工已创建。")}`);
}

export async function updateAgentAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/ai-workforce/agents", "缺少 AI 员工 ID。"));
  try {
    await updateAgent(id, {
      name: value(formData, "name"),
      description: value(formData, "description"),
      owner_user_id: value(formData, "owner_user_id"),
      permission_level: value(formData, "permission_level") as AgentPermissionLevel | undefined,
      allowed_modules: values(formData, "allowed_modules"),
      allowed_tools: values(formData, "allowed_tools"),
      default_provider_id: value(formData, "default_provider_id") ?? null,
      status: value(formData, "status") as "active" | "paused" | "archived" | undefined,
      config: jsonObject(formData, "config")
    });
  } catch (error) {
    console.error("[updateAgentAction] error:", error);
    redirect(withErrorParam(`/ai-workforce/agents/${id}`, extractErrorMessage(error)));
  }
  revalidatePath(`/ai-workforce/agents/${id}`);
  revalidatePath("/ai-workforce/agents");
}

export async function pauseAgentAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/ai-workforce/agents", "缺少 AI 员工 ID。"));
  try {
    await pauseAgent(id);
  } catch (error) {
    console.error("[pauseAgentAction] error:", error);
    redirect(withErrorParam("/ai-workforce/agents", extractErrorMessage(error)));
  }
  revalidatePath("/ai-workforce/agents");
}

export async function activateAgentAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/ai-workforce/agents", "缺少 AI 员工 ID。"));
  try {
    await activateAgent(id);
  } catch (error) {
    console.error("[activateAgentAction] error:", error);
    redirect(withErrorParam("/ai-workforce/agents", extractErrorMessage(error)));
  }
  revalidatePath("/ai-workforce/agents");
}

export async function archiveAgentAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/ai-workforce/agents", "缺少 AI 员工 ID。"));
  try {
    await archiveAgent(id);
  } catch (error) {
    console.error("[archiveAgentAction] error:", error);
    redirect(withErrorParam("/ai-workforce/agents", extractErrorMessage(error)));
  }
  revalidatePath("/ai-workforce/agents");
}

export async function bindPromptAction(formData: FormData) {
  const agentId = value(formData, "agent_id");
  const promptId = value(formData, "prompt_template_id");
  if (!agentId || !promptId) throw new Error("Missing binding target");
  await bindPromptToAgent({
    agent_id: agentId,
    prompt_template_id: promptId,
    prompt_version_id: value(formData, "prompt_version_id") ?? null
  });
  revalidatePath(`/ai-workforce/agents/${agentId}`);
}

export async function createPromptAction(formData: FormData) {
  let promptId: string | undefined;
  try {
    const prompt = await createPrompt({
      name: value(formData, "name") ?? "新提示词",
      description: value(formData, "description") ?? "",
      scenario: value(formData, "scenario") ?? "",
      module: value(formData, "module") ?? "ai_workforce",
      tags: values(formData, "tags"),
      input_variables: inputVariables(formData),
      output_format: value(formData, "output_format") ?? "",
      quality_criteria: value(formData, "quality_criteria") ?? "",
      content: value(formData, "content") ?? "",
      owner_id: value(formData, "owner_id") ?? null,
      status: (value(formData, "status") ?? "draft") as "draft" | "published" | "archived"
    });
    promptId = "id" in prompt ? prompt.id : undefined;
    if (!promptId) throw new Error("提示词创建后未拿到 ID。");
  } catch (error) {
    console.error("[createPromptAction] error:", error);
    redirect(withErrorParam("/ai-workforce/prompts", extractErrorMessage(error)));
  }
  redirect(`/ai-workforce/prompts/${promptId}?notice=${encodeURIComponent("提示词已创建。")}`);
}

export async function updatePromptAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/ai-workforce/prompts", "缺少提示词 ID。"));
  try {
    await updatePrompt(id, {
      name: value(formData, "name"),
      description: value(formData, "description"),
      scenario: value(formData, "scenario") ?? "",
      module: value(formData, "module") ?? "ai_workforce",
      tags: values(formData, "tags"),
      input_variables: inputVariables(formData),
      output_format: value(formData, "output_format") ?? "",
      quality_criteria: value(formData, "quality_criteria") ?? "",
      owner_id: value(formData, "owner_id") ?? null,
      status: value(formData, "status") as "draft" | "published" | "archived" | undefined
    });
  } catch (error) {
    console.error("[updatePromptAction] error:", error);
    redirect(withErrorParam(`/ai-workforce/prompts/${id}`, extractErrorMessage(error)));
  }
  revalidatePath(`/ai-workforce/prompts/${id}`);
  revalidatePath("/ai-workforce/prompts");
}

export async function createPromptVersionAction(formData: FormData) {
  const promptId = value(formData, "prompt_template_id");
  if (!promptId) redirect(withErrorParam("/ai-workforce/prompts", "缺少提示词 ID。"));
  try {
    await createPromptVersion({
      prompt_template_id: promptId,
      version: value(formData, "version") ?? "1.1",
      content: value(formData, "content") ?? "",
      change_note: value(formData, "change_note") ?? ""
    });
  } catch (error) {
    console.error("[createPromptVersionAction] error:", error);
    redirect(withErrorParam(`/ai-workforce/prompts/${promptId}`, extractErrorMessage(error)));
  }
  revalidatePath(`/ai-workforce/prompts/${promptId}`);
}

export async function publishPromptAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/ai-workforce/prompts", "缺少提示词 ID。"));
  try {
    await publishPrompt(id);
  } catch (error) {
    console.error("[publishPromptAction] error:", error);
    redirect(withErrorParam("/ai-workforce/prompts", extractErrorMessage(error)));
  }
  revalidatePath("/ai-workforce/prompts");
  redirect(`/ai-workforce/prompts?notice=${encodeURIComponent("提示词已发布。")}`);
}

export async function archivePromptAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing prompt id");
  await archivePrompt(id);
  revalidatePath("/ai-workforce/prompts");
}

export async function testPromptAction(formData: FormData) {
  const promptId = value(formData, "prompt_template_id");
  if (!promptId) throw new Error("Missing prompt id");
  await testPrompt({
    prompt_template_id: promptId,
    prompt_version_id: value(formData, "prompt_version_id") ?? null,
    test_input: jsonObject(formData, "test_input"),
    rating: value(formData, "rating") ? Number(value(formData, "rating")) : null,
    notes: value(formData, "notes") ?? null
  });
  revalidatePath(`/ai-workforce/prompts/${promptId}`);
}

export async function createConfirmationAction(formData: FormData) {
  await createConfirmationRequest({
    agent_id: value(formData, "agent_id") ?? null,
    prompt_template_id: value(formData, "prompt_template_id") ?? null,
    requester_type: "human",
    related_module: value(formData, "related_module") ?? null,
    related_record_type: value(formData, "related_record_type") ?? null,
    related_record_id: value(formData, "related_record_id") ?? null,
    action_type: value(formData, "action_type") ?? "manual_confirmation",
    risk_level: (value(formData, "risk_level") ?? "medium") as RiskLevel,
    title: value(formData, "title") ?? "AI 审批事项",
    description: value(formData, "description") ?? null,
    input_data: jsonObject(formData, "input_data"),
    proposed_output: jsonObject(formData, "proposed_output")
  });
  revalidatePath("/ai-workforce/confirmations");
}

export async function approveConfirmationAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/ai-workforce/confirmations", "缺少 AI 审批 ID。"));
  try {
    await approveConfirmation(id, value(formData, "decision_note") ?? null);
  } catch (error) {
    console.error("[approveConfirmationAction] error:", error);
    redirect(withErrorParam("/ai-workforce/confirmations", extractErrorMessage(error)));
  }
  revalidatePath("/ai-workforce/confirmations");
  redirect(`/ai-workforce/confirmations?notice=${encodeURIComponent("已批准。")}`);
}

export async function rejectConfirmationAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) redirect(withErrorParam("/ai-workforce/confirmations", "缺少 AI 审批 ID。"));
  try {
    await rejectConfirmation(id, value(formData, "decision_note") ?? null);
  } catch (error) {
    console.error("[rejectConfirmationAction] error:", error);
    redirect(withErrorParam("/ai-workforce/confirmations", extractErrorMessage(error)));
  }
  revalidatePath("/ai-workforce/confirmations");
  redirect(`/ai-workforce/confirmations?notice=${encodeURIComponent("已驳回。")}`);
}

export async function createAgentRunAction(formData: FormData) {
  const agentId = value(formData, "agent_id");
  if (!agentId) throw new Error("Missing agent id");
  await createAgentRun({
    agent_id: agentId,
    run_type: value(formData, "run_type") ?? "manual",
    related_module: value(formData, "related_module") ?? null,
    status: (value(formData, "status") ?? "success") as never,
    input: jsonObject(formData, "input"),
    output: jsonObject(formData, "output"),
    error_message: value(formData, "error_message") ?? null
  });
  revalidatePath("/ai-workforce/runs");
}

export async function createFeedbackAction(formData: FormData) {
  await createAIFeedback({
    target_type: (value(formData, "target_type") ?? "agent_run") as never,
    target_id: value(formData, "target_id") ?? "",
    rating: value(formData, "rating") ? Number(value(formData, "rating")) : null,
    is_useful: bool(formData, "is_useful"),
    is_correct: bool(formData, "is_correct"),
    is_adopted: bool(formData, "is_adopted"),
    is_adopted_after_edit: bool(formData, "is_adopted_after_edit"),
    content: value(formData, "content") ?? null
  });
  revalidatePath("/ai-workforce");
}
