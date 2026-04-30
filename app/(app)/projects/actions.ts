"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveTask,
  approveProjectApproval,
  createProject,
  createTask,
  createTaskComment,
  createTaskFile,
  rejectProjectApproval,
  updateProject,
  updateTask,
  upsertProjectReview
} from "@/lib/projects";
import type { ProjectStatus, TaskStatus } from "@/lib/projects/types";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function numberValue(formData: FormData, key: string, fallback: number) {
  const raw = value(formData, key);
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export async function createProjectAction(formData: FormData) {
  const project = await createProject({
    name: value(formData, "name") ?? "新项目",
    description: value(formData, "description") ?? "",
    owner_id: value(formData, "owner_id") ?? null,
    status: (value(formData, "status") ?? "draft") as ProjectStatus,
    start_date: value(formData, "start_date") ?? null,
    due_date: value(formData, "due_date") ?? null,
    priority: numberValue(formData, "priority", 3)
  });
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing project id");
  await updateProject(id, {
    name: value(formData, "name"),
    description: value(formData, "description"),
    owner_id: value(formData, "owner_id") ?? null,
    status: value(formData, "status") as ProjectStatus | undefined,
    start_date: value(formData, "start_date") ?? null,
    due_date: value(formData, "due_date") ?? null,
    priority: value(formData, "priority") ? numberValue(formData, "priority", 3) : undefined
  });
  revalidatePath(`/projects/${id}`);
}

export async function updateProjectStatusAction(formData: FormData) {
  const id = value(formData, "id");
  if (!id) throw new Error("Missing project id");
  await updateProject(id, {
    status: (value(formData, "status") ?? "in_progress") as ProjectStatus
  });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

export async function createTaskAction(formData: FormData) {
  const projectId = value(formData, "project_id");
  if (!projectId) throw new Error("Missing project id");
  await createTask({
    project_id: projectId,
    name: value(formData, "name") ?? "新任务",
    description: value(formData, "description") ?? "",
    assigned_to: value(formData, "assigned_to") ?? null,
    status: (value(formData, "status") ?? "to_do") as TaskStatus,
    due_date: value(formData, "due_date") ?? null,
    progress: numberValue(formData, "progress", 0),
    priority: numberValue(formData, "priority", 3)
  });
  revalidatePath(`/projects/${projectId}/tasks`);
}

export async function updateTaskAction(formData: FormData) {
  const id = value(formData, "id");
  const projectId = value(formData, "project_id");
  if (!id) throw new Error("Missing task id");
  await updateTask(id, {
    name: value(formData, "name"),
    description: value(formData, "description"),
    assigned_to: value(formData, "assigned_to") ?? null,
    status: value(formData, "status") as TaskStatus | undefined,
    due_date: value(formData, "due_date") ?? null,
    progress: value(formData, "progress") ? numberValue(formData, "progress", 0) : undefined,
    priority: value(formData, "priority") ? numberValue(formData, "priority", 3) : undefined
  });
  if (projectId) {
    revalidatePath(`/projects/${projectId}/tasks`);
    revalidatePath(`/projects/${projectId}/tasks/${id}`);
  }
}

export async function archiveTaskAction(formData: FormData) {
  const id = value(formData, "id");
  const projectId = value(formData, "project_id");
  if (!id) throw new Error("Missing task id");
  await archiveTask(id);
  if (projectId) revalidatePath(`/projects/${projectId}/tasks`);
}

export async function approveProjectApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) throw new Error("缺少项目审批 ID");
  await approveProjectApproval(id);
  revalidatePath("/projects/tasks");
}

export async function rejectProjectApprovalAction(formData: FormData) {
  const id = value(formData, "approval_id");
  if (!id) throw new Error("缺少项目审批 ID");
  await rejectProjectApproval(id);
  revalidatePath("/projects/tasks");
}

export async function createTaskCommentAction(formData: FormData) {
  const taskId = value(formData, "task_id");
  const projectId = value(formData, "project_id");
  const comment = value(formData, "comment_text");
  if (!taskId) throw new Error("Missing task id");
  if (!comment) return;
  await createTaskComment(taskId, comment);
  if (projectId) revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
}

export async function uploadTaskFileAction(formData: FormData) {
  const taskId = value(formData, "task_id");
  const projectId = value(formData, "project_id");
  if (!taskId) throw new Error("Missing task id");
  const file = formData.get("task_file");
  const fileUrl = value(formData, "file_url");
  const typedFile = file instanceof File && file.size > 0 ? file : null;
  const fileName = typedFile?.name ?? value(formData, "file_name") ?? "任务附件";
  await createTaskFile({
    task_id: taskId,
    file: typedFile ?? undefined,
    file_name: fileName,
    file_url: fileUrl ?? null,
    mime_type: typedFile?.type || "application/octet-stream",
    size_bytes: typedFile?.size ?? 0
  });
  if (projectId) revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
}

export async function upsertProjectReviewAction(formData: FormData) {
  const projectId = value(formData, "project_id");
  if (!projectId) throw new Error("Missing project id");
  await upsertProjectReview({
    project_id: projectId,
    summary: value(formData, "summary") ?? "",
    successful_factors: value(formData, "successful_factors") ?? "",
    failure_factors: value(formData, "failure_factors") ?? "",
    lessons_learned: value(formData, "lessons_learned") ?? "",
    next_actions: value(formData, "next_actions") ?? ""
  });
  revalidatePath(`/projects/${projectId}/review`);
}
