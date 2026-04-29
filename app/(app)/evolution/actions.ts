"use server";

import { revalidatePath } from "next/cache";
import {
  changeImprovementStatus,
  createFeedback,
  createImprovement,
  createReview,
  createSop,
  updateReview,
  updateSop
} from "@/lib/evolution";
import type { FeedbackType, ImprovementStatus, ReviewType, RiskLevel, SopStatus, TargetType } from "@/lib/types/core";

export type ActionState = { ok?: boolean; message?: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errMsg(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试。";
}

export async function createFeedbackAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createFeedback({
      target_type: (text(formData, "target_type") ?? "other") as TargetType,
      module: text(formData, "module"),
      rating: text(formData, "rating") ? Number(text(formData, "rating")) : null,
      feedback_type: (text(formData, "feedback_type") ?? "other") as FeedbackType,
      content: text(formData, "content")
    });
    revalidatePath("/evolution");
    return { ok: true, message: "反馈已保存。" };
  } catch (error) {
    return { ok: false, message: errMsg(error) };
  }
}

export async function createReviewAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createReview({
      review_type: (text(formData, "review_type") ?? "other") as ReviewType,
      related_module: text(formData, "related_module"),
      title: text(formData, "title") ?? "未命名复盘",
      summary: text(formData, "summary"),
      what_worked: text(formData, "what_worked"),
      what_failed: text(formData, "what_failed"),
      lessons_learned: text(formData, "lessons_learned"),
      next_actions: text(formData, "next_actions")
    });
    revalidatePath("/evolution");
    revalidatePath("/knowledge/reviews");
    return { ok: true, message: "复盘已保存，可在列表中查看。" };
  } catch (error) {
    return { ok: false, message: errMsg(error) };
  }
}

export async function createSopAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createSop({
      title: text(formData, "title") ?? "未命名 SOP",
      scenario: text(formData, "scenario"),
      description: text(formData, "description"),
      related_module: text(formData, "related_module"),
      version: text(formData, "version") ?? "1.0",
      status: (text(formData, "status") ?? "draft") as SopStatus,
      steps: (text(formData, "steps") ?? "")
        .split("\n")
        .map((step) => step.trim())
        .filter(Boolean)
    });
    revalidatePath("/evolution");
    revalidatePath("/knowledge/sops");
    return { ok: true, message: "SOP 已保存，可在列表中查看。" };
  } catch (error) {
    return { ok: false, message: errMsg(error) };
  }
}

export async function updateSopAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const id = text(formData, "id");
    if (!id) return { ok: false, message: "缺少 SOP ID。" };
    await updateSop(id, {
      title: text(formData, "title") ?? undefined,
      scenario: text(formData, "scenario"),
      related_module: text(formData, "related_module"),
      version: text(formData, "version") ?? "1.0",
      status: (text(formData, "status") ?? "draft") as SopStatus
    });
    revalidatePath("/knowledge/sops");
    revalidatePath("/evolution");
    return { ok: true, message: "已更新。" };
  } catch (error) {
    return { ok: false, message: errMsg(error) };
  }
}

export async function updateReviewAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const id = text(formData, "id");
    if (!id) return { ok: false, message: "缺少复盘 ID。" };
    await updateReview(id, {
      title: text(formData, "title") ?? undefined,
      summary: text(formData, "summary"),
      lessons_learned: text(formData, "lessons_learned"),
      next_actions: text(formData, "next_actions")
    });
    revalidatePath("/knowledge/reviews");
    revalidatePath("/evolution");
    return { ok: true, message: "已更新。" };
  } catch (error) {
    return { ok: false, message: errMsg(error) };
  }
}

export async function createImprovementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createImprovement({
      suggestion_type: text(formData, "suggestion_type") ?? "other",
      related_module: text(formData, "related_module"),
      title: text(formData, "title") ?? "未命名优化建议",
      description: text(formData, "description"),
      impact_level: (text(formData, "impact_level") ?? "medium") as RiskLevel
    });
    revalidatePath("/evolution");
    revalidatePath("/evolution/improvements");
    return { ok: true, message: "优化建议已保存。" };
  } catch (error) {
    return { ok: false, message: errMsg(error) };
  }
}

export async function changeImprovementStatusAction(formData: FormData) {
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (id && status) {
    await changeImprovementStatus(id, status as ImprovementStatus);
    revalidatePath("/evolution");
    revalidatePath("/evolution/improvements");
  }
}
