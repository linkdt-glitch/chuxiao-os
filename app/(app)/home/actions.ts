"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { HomeGoal, HomeValue } from "@/lib/home/types";

function parseValues(raw: string): HomeValue[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = ["::", "|", "：", ":"].find((s) => line.includes(s));
      if (sep) {
        const idx = line.indexOf(sep);
        const title = line.slice(0, idx).trim();
        const description = line.slice(idx + sep.length).trim();
        return title ? { title, description: description || undefined } : null;
      }
      return { title: line };
    })
    .filter(Boolean) as HomeValue[];
}

function parseGoals(raw: string): HomeGoal[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((s) => s.trim());
      if (!parts[0]) return null;
      const progress = parts[3] ? Number(parts[3]) : undefined;
      return {
        title: parts[0],
        description: parts[1] || undefined,
        target_date: parts[2] || undefined,
        progress: typeof progress === "number" && Number.isFinite(progress)
          ? Math.max(0, Math.min(100, progress))
          : undefined
      };
    })
    .filter(Boolean) as HomeGoal[];
}

export async function saveHomeContentAction(formData: FormData) {
  const member = await getCurrentMember();
  if (member?.role?.key !== "owner") {
    redirect(`/home?error=${encodeURIComponent("仅创始人可编辑首页内容")}`);
  }

  const mission = String(formData.get("mission") ?? "").trim();
  const vision = String(formData.get("vision") ?? "").trim();
  const values = parseValues(String(formData.get("values") ?? ""));
  const goals = parseGoals(String(formData.get("goals") ?? ""));
  const announcements = String(formData.get("announcements") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10);

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    // Demo mode：没有 supabase，直接给"已保存（演示）"反馈
    redirect("/home?notice=saved_demo");
  }

  const org = await getCurrentOrganization();
  const newSettings = {
    ...(org.settings ?? {}),
    announcements,
    home: { mission, vision, values, goals }
  };

  // 用 SSR client 跑 update 会受 RLS 约束。policy "organizations admin update"
  // 要求 is_org_admin = role in ('owner','admin') 才放行。owner 应该通过。
  // 但在某些 cookie / impersonation 边界条件下可能仍命中 0 行 —— 通过 .select()
  // 拿到实际更新的 id 列表，能区分「DB 报错」「0 行被 RLS 过滤」「正常成功」三种结果。
  const { error, data } = await supabase
    .from("organizations")
    .update({ settings: newSettings })
    .eq("id", org.id)
    .select("id");

  if (error) {
    console.error("[saveHomeContentAction] supabase error:", error.message);
    redirect(`/home/edit?error=${encodeURIComponent(error.message)}`);
  }

  if (!data || data.length === 0) {
    // RLS 拒了或者 org id 对不上。落到这里基本是会话问题，
    // 把可见的关键信息塞进 URL，方便调试。
    console.error(
      "[saveHomeContentAction] 0 rows updated. org=",
      org.id,
      "role=",
      member?.role?.key
    );
    redirect(
      `/home/edit?error=${encodeURIComponent(
        "保存影响 0 行 — 数据库认为你没有权限写入。请退出账号重新登录后再试。"
      )}`
    );
  }

  revalidatePath("/home");
  revalidatePath("/home/edit");
  revalidatePath("/dashboard");
  // 顶部 banner 也要重新拉
  revalidatePath("/", "layout");
  redirect("/home?notice=saved");
}
