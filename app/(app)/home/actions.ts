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
      // 支持「标题 :: 描述」「标题 | 描述」「标题：描述」「仅标题」
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
      // 用 | 分隔：标题 | 描述 | 目标日期 (YYYY-MM-DD) | 进度 (0-100)
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
    redirect("/home?error=forbidden");
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
    // Demo mode：不持久化
    redirect("/home?notice=saved_demo");
  }

  const org = await getCurrentOrganization();
  const newSettings = {
    ...(org.settings ?? {}),
    announcements,
    home: { mission, vision, values, goals }
  };
  const { error } = await supabase
    .from("organizations")
    .update({ settings: newSettings })
    .eq("id", org.id);
  if (error) {
    console.error("[saveHomeContentAction]", error.message);
    redirect(`/home/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/home");
  revalidatePath("/home/edit");
  revalidatePath("/dashboard");
  redirect("/home?notice=saved");
}
