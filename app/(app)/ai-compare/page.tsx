import { redirect } from "next/navigation";
import { CompareAIPanel } from "@/components/ai/compare-ai-panel";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentMember } from "@/lib/auth";

/**
 * 创始人专用：双模型对比 —— 同时问 Claude Sonnet 4.5 + GPT-5。
 *
 * 仅 owner / admin 可访问，其他角色重定向到 /dashboard。
 */
export default async function AICompare() {
  const member = await getCurrentMember();
  const roleObj: unknown = (member as { role?: unknown }).role;
  let roleKey = "";
  if (Array.isArray(roleObj)) {
    const first = roleObj[0] as { key?: string } | undefined;
    roleKey = first?.key ?? "";
  } else if (roleObj && typeof roleObj === "object" && "key" in roleObj) {
    roleKey = (roleObj as { key?: string }).key ?? "";
  }

  if (roleKey !== "owner" && roleKey !== "admin") {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        title="AI 双模型对比"
        description="同时问 Claude Sonnet 4.5 + GPT-5，并排对比两个全球顶级模型的回答。做关键决策时避免单一模型的盲点。每次会显示实际成本。"
      />
      <CompareAIPanel />
    </>
  );
}

export const metadata = {
  title: "AI 双模型对比 · 初晓 OS"
};
