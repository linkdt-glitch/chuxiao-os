"use server";

import { revalidatePath } from "next/cache";
import { activateAIProvider, disableAIProvider } from "@/lib/ai";

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
