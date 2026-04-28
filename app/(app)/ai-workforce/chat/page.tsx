import { AssistantChat } from "@/components/ai/assistant-chat";
import { PageHeader } from "@/components/layout/page-header";

export default function AIChatPage() {
  return (
    <>
      <PageHeader
        title="AI 对话助手"
        description="像使用大模型对话框一样咨询初晓 OS。当前会复用已启用的 AI Provider，并写入 AI 调用日志。"
      />
      <AssistantChat />
    </>
  );
}
