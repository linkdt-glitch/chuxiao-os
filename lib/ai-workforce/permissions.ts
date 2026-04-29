import { getCurrentMember } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { WorkforceAgent, PromptTemplate, AIConfirmationRequest } from "@/lib/ai-workforce/types";

async function isOwnerOrAdmin() {
  const member = await getCurrentMember();
  return ["owner", "admin"].includes(member.role?.key ?? "");
}

async function isManager() {
  const member = await getCurrentMember();
  return member.role?.key === "manager";
}

export async function canViewAgent(agent?: WorkforceAgent | null) {
  if (agent?.status === "archived") {
    return isOwnerOrAdmin();
  }
  return hasPermission("agent.view");
}

export async function canManageAgent(agent?: WorkforceAgent | null) {
  const member = await getCurrentMember();
  if (await isOwnerOrAdmin()) return true;
  if (!agent) return hasPermission("agent.create");
  return (await isManager()) && agent.owner_user_id === member.user_id && (await hasPermission("agent.update"));
}

export async function canRunAgent(agent?: WorkforceAgent | null) {
  if (!agent || agent.status !== "active") return false;
  return hasPermission("agent.run");
}

export async function canViewPrompt(prompt?: PromptTemplate | null) {
  if (prompt?.status === "draft") {
    const member = await getCurrentMember();
    return (await isOwnerOrAdmin()) || prompt.owner_id === member.user_id;
  }
  return hasPermission("prompt.view");
}

export async function canManagePrompt(prompt?: PromptTemplate | null) {
  const member = await getCurrentMember();
  if (await isOwnerOrAdmin()) return true;
  if (!prompt) return hasPermission("prompt.create");
  return (await hasPermission("prompt.update")) && prompt.owner_id === member.user_id;
}

export async function canApproveConfirmation(confirmation?: AIConfirmationRequest | null) {
  const member = await getCurrentMember();
  if (member.member_type === "agent") return false;
  if (await isOwnerOrAdmin()) return true;
  if (!(await hasPermission("ai_confirmation.approve"))) return false;
  if (!confirmation?.agent?.owner_user_id) return true;
  return confirmation.agent.owner_user_id === member.user_id;
}
