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

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function createFeedbackAction(formData: FormData) {
  await createFeedback({
    target_type: (text(formData, "target_type") ?? "other") as TargetType,
    module: text(formData, "module"),
    rating: text(formData, "rating") ? Number(text(formData, "rating")) : null,
    feedback_type: (text(formData, "feedback_type") ?? "other") as FeedbackType,
    content: text(formData, "content")
  });
  revalidatePath("/evolution");
}

export async function createReviewAction(formData: FormData) {
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
}

export async function createSopAction(formData: FormData) {
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
}

export async function updateSopAction(formData: FormData) {
  const id = text(formData, "id");
  if (!id) return;
  await updateSop(id, {
    title: text(formData, "title") ?? undefined,
    scenario: text(formData, "scenario"),
    related_module: text(formData, "related_module"),
    version: text(formData, "version") ?? "1.0",
    status: (text(formData, "status") ?? "draft") as SopStatus
  });
  revalidatePath("/knowledge/sops");
  revalidatePath("/evolution");
}

export async function updateReviewAction(formData: FormData) {
  const id = text(formData, "id");
  if (!id) return;
  await updateReview(id, {
    title: text(formData, "title") ?? undefined,
    summary: text(formData, "summary"),
    lessons_learned: text(formData, "lessons_learned"),
    next_actions: text(formData, "next_actions")
  });
  revalidatePath("/knowledge/reviews");
  revalidatePath("/evolution");
}

export async function createImprovementAction(formData: FormData) {
  await createImprovement({
    suggestion_type: text(formData, "suggestion_type") ?? "other",
    related_module: text(formData, "related_module"),
    title: text(formData, "title") ?? "未命名优化建议",
    description: text(formData, "description"),
    impact_level: (text(formData, "impact_level") ?? "medium") as RiskLevel
  });
  revalidatePath("/evolution");
  revalidatePath("/evolution/improvements");
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
