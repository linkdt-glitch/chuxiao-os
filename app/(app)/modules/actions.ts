"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { emitEvent } from "@/lib/events";
import { toggleModule } from "@/lib/modules";

export async function toggleOrganizationModuleAction(formData: FormData) {
  const moduleId = String(formData.get("module_id") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";

  if (!moduleId) {
    throw new Error("缺少模块 ID，无法切换模块状态。");
  }

  await toggleModule(moduleId, enabled);

  const eventKey = enabled ? "module.enabled" : "module.disabled";
  await Promise.all([
    logAction({
      event_key: eventKey,
      action: enabled ? "enable" : "disable",
      module: "modules",
      related_record_type: "module",
      related_record_id: moduleId,
      after_data: { enabled }
    }),
    emitEvent({
      event_key: eventKey,
      module: "modules",
      payload: { module_id: moduleId, enabled }
    })
  ]);

  revalidatePath("/modules");
}
