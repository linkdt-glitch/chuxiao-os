import { AssistantChat } from "@/components/ai/assistant-chat";
import { getCurrentMember } from "@/lib/auth";
import { pickChatModelForRole } from "@/lib/ai/models-catalog";

export default async function AIChatPage() {
  const member = await getCurrentMember();
  const roleKey = member?.role?.key ?? "member";
  const model = pickChatModelForRole(roleKey);
  const isFounder = roleKey === "owner";

  return (
    <div className="-mt-2">
      <AssistantChat
        isFounder={isFounder}
        modelLabel={model.label}
        modelDescription={model.description}
        approxCostPerTurnCny={model.approxCostPerTurnCny}
      />
    </div>
  );
}
