"use server";

import { revalidatePath } from "next/cache";
import { activateAIProvider, disableAIProvider, setProviderAudience, type ProviderAudience } from "@/lib/ai";

function providerId(formData: FormData) {
  const raw = formData.get("provider_id");
  if (typeof raw !== "string" || !raw) throw new Error("Missing provider id");
  return raw;
}

export async function activateProviderAction(formData: FormData) {
  await activateAIProvider(providerId(formData));
  revalidatePath("/ai-settings");
  revalidatePath("/ai-workforce");
}

export async function disableProviderAction(formData: FormData) {
  await disableAIProvider(providerId(formData));
  revalidatePath("/ai-settings");
  revalidatePath("/ai-workforce");
}

/**
 * 设置 provider 的服务对象 + 自动启用。
 *
 * 一键完成「DeepSeek 给创始人 / SiliconFlow 给员工」的配置：
 * 用户在 UI 选好 audience（all / founder / staff），点按钮：
 *   1. 写入 settings.audience
 *   2. 启用这个 provider（同 audience 组里其他自动停掉）
 *
 * 不同 audience 组互不影响 —— 你可以同时让一个 founder + 一个 staff
 * 都 active，互不冲突。
 */
export async function setProviderAudienceAction(formData: FormData) {
  const id = providerId(formData);
  const rawAudience = formData.get("audience");
  const audience: ProviderAudience =
    rawAudience === "founder" || rawAudience === "staff" ? rawAudience : "all";

  await setProviderAudience(id, audience);
  await activateAIProvider(id);

  revalidatePath("/ai-settings");
  revalidatePath("/ai-workforce");
}
