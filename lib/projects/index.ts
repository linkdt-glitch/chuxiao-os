import { revalidatePath } from "next/cache";
import { createApproval } from "@/lib/approvals";
import { logAction } from "@/lib/audit";
import { getCurrentMember, getCurrentOrganization } from "@/lib/auth";
import { emitEvent } from "@/lib/events";
import { linkFileToRecord, uploadFile } from "@/lib/files";
import { requirePermission } from "@/lib/permissions";
import {
  demoProjectReviews,
  demoProjects,
  demoTaskComments,
  demoTaskFiles,
  demoTasks
} from "@/lib/projects/demo";
import type {
  Project,
  ProjectInput,
  ProjectReview,
  ProjectReviewInput,
  ProjectSummary,
  ProjectTask,
  TaskComment,
  TaskFile,
  TaskInput,
  TaskStatus
} from "@/lib/projects/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function clampProgress(value?: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

function statusFromProgress(status: TaskStatus | undefined, progress: number): TaskStatus {
  if (status) return status;
  if (progress >= 100) return "completed";
  if (progress > 0) return "in_progress";
  return "to_do";
}

function normalizeProject(row: Record<string, unknown>): Project {
  const rawTasks = row.tasks;
  const rawReview = row.review;
  return {
    ...(row as unknown as Project),
    owner: (row.owner ?? null) as Project["owner"],
    tasks: (Array.isArray(rawTasks) ? rawTasks : []).map((task) => normalizeTask(task as unknown as Record<string, unknown>)),
    review: (Array.isArray(rawReview) ? rawReview[0] ?? null : rawReview ?? null) as Project["review"]
  };
}

function normalizeTask(row: Record<string, unknown>): ProjectTask {
  return {
    ...(row as unknown as ProjectTask),
    assignee: (row.assignee ?? null) as ProjectTask["assignee"]
  };
}

function normalizeComment(row: Record<string, unknown>): TaskComment {
  return {
    ...(row as unknown as TaskComment),
    commenter: (row.commenter ?? null) as TaskComment["commenter"]
  };
}

function normalizeTaskFile(row: Record<string, unknown>): TaskFile {
  return {
    ...(row as unknown as TaskFile),
    uploader: (row.uploader ?? null) as TaskFile["uploader"],
    file: (row.file ?? null) as TaskFile["file"]
  };
}

function demoProjectsWithTasks() {
  return demoProjects.map((project) => ({
    ...project,
    tasks: demoTasks.filter((task) => task.project_id === project.id),
    review: demoProjectReviews.find((review) => review.project_id === project.id) ?? null
  }));
}

export async function getProjectSummary(filters?: {
  status?: string;
  owner_id?: string;
}): Promise<ProjectSummary> {
  const projects = await getProjects(filters);
  const tasks = projects.flatMap((project) => project.tasks ?? []);
  const totalProgress = tasks.reduce((sum, task) => sum + Number(task.progress), 0);
  return {
    projects,
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status === "in_progress").length,
    completedProjects: projects.filter((project) => project.status === "completed").length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    averageProgress: tasks.length ? Math.round(totalProgress / tasks.length) : 0
  };
}

export async function getProjects(filters?: {
  status?: string;
  owner_id?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) {
    return demoProjectsWithTasks().filter((project) => {
      if (filters?.status && filters.status !== "all" && project.status !== filters.status) return false;
      if (filters?.owner_id && project.owner_id !== filters.owner_id) return false;
      return true;
    });
  }

  let query = supabase
    .from("projects")
    .select("*, owner:organization_members!projects_owner_id_fkey(id,display_name,email,member_type), tasks(*, assignee:organization_members!tasks_assigned_to_fkey(id,display_name,email,member_type)), review:project_reviews(*)")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false });

  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.owner_id) query = query.eq("owner_id", filters.owner_id);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((item) => normalizeProject(item as Record<string, unknown>));
}

export async function getProject(id: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoProjectsWithTasks().find((project) => project.id === id) ?? null;

  const { data, error } = await supabase
    .from("projects")
    .select("*, owner:organization_members!projects_owner_id_fkey(id,display_name,email,member_type), tasks(*, assignee:organization_members!tasks_assigned_to_fkey(id,display_name,email,member_type)), review:project_reviews(*)")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return normalizeProject(data as Record<string, unknown>);
}

export async function createProject(input: ProjectInput) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  const payload = {
    organization_id: organization.id,
    name: input.name,
    description: input.description ?? "",
    owner_id: input.owner_id || member.id,
    status: input.status ?? "draft",
    start_date: input.start_date || new Date().toISOString(),
    due_date: input.due_date || null,
    priority: Math.max(1, Math.min(5, Number(input.priority ?? 3)))
  };

  if (!supabase) return { ...payload, id: "demo_project_created", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Project;

  const { data, error } = await supabase.from("projects").insert(payload).select().single();
  if (error) throw error;

  await logAction({ event_key: "projects.created", action: "create", module: "projects", related_record_type: "project", related_record_id: data.id, after_data: data });
  await emitEvent({ event_key: "projects.created", module: "projects", payload: { id: data.id, name: data.name, owner_id: data.owner_id } });
  revalidatePath("/projects");
  return data as Project;
}

export async function updateProject(id: string, input: Partial<ProjectInput>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const payload = {
    ...input,
    priority: input.priority ? Math.max(1, Math.min(5, Number(input.priority))) : undefined
  };
  const { data: before, error: readError } = await supabase.from("projects").select("*").eq("id", id).single();
  if (readError) throw readError;
  const { data, error } = await supabase.from("projects").update(payload).eq("id", id).select().single();
  if (error) throw error;

  const eventKey = data.status === "completed" && before.status !== "completed" ? "projects.completed" : "projects.updated";
  await logAction({ event_key: eventKey, action: data.status === "completed" ? "complete" : "update", module: "projects", related_record_type: "project", related_record_id: id, before_data: before, after_data: data });
  await emitEvent({ event_key: eventKey, module: "projects", payload: { id, status: data.status } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return data as Project;
}

export async function getProjectTasks(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoTasks.filter((task) => task.project_id === projectId);

  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:organization_members!tasks_assigned_to_fkey(id,display_name,email,member_type)")
    .eq("organization_id", organization.id)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((item) => normalizeTask(item as Record<string, unknown>));
}

export async function getTask(taskId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoTasks.find((task) => task.id === taskId) ?? null;

  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:organization_members!tasks_assigned_to_fkey(id,display_name,email,member_type)")
    .eq("organization_id", organization.id)
    .eq("id", taskId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return normalizeTask(data as Record<string, unknown>);
}

export async function createTask(input: TaskInput) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  const progress = clampProgress(input.progress ?? 0);
  const payload = {
    organization_id: organization.id,
    project_id: input.project_id,
    name: input.name,
    description: input.description ?? "",
    assigned_to: input.assigned_to || member.id,
    status: statusFromProgress(input.status, progress),
    due_date: input.due_date || null,
    progress
  };

  if (!supabase) return { ...payload, id: "demo_task_created", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as ProjectTask;

  const { data, error } = await supabase.from("tasks").insert(payload).select().single();
  if (error) throw error;

  await logAction({ event_key: "tasks.created", action: "create", module: "tasks", related_record_type: "task", related_record_id: data.id, after_data: data });
  await emitEvent({ event_key: "tasks.created", module: "tasks", payload: { id: data.id, project_id: data.project_id, assigned_to: data.assigned_to } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath(`/projects/${input.project_id}/tasks`);
  return data as ProjectTask;
}

export async function updateTask(id: string, input: Partial<TaskInput>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { data: before, error: readError } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (readError) throw readError;
  const progress = input.progress === undefined ? undefined : clampProgress(input.progress);
  const payload = {
    ...input,
    progress,
    status: progress === 100 && input.status === undefined ? "completed" : input.status
  };

  const { data, error } = await supabase.from("tasks").update(payload).eq("id", id).select().single();
  if (error) throw error;

  const eventKey = data.status === "completed" && before.status !== "completed" ? "tasks.completed" : "tasks.updated";
  await logAction({ event_key: eventKey, action: data.status === "completed" ? "complete" : "update", module: "tasks", related_record_type: "task", related_record_id: id, before_data: before, after_data: data });
  await emitEvent({ event_key: eventKey, module: "tasks", payload: { id, project_id: data.project_id, status: data.status, progress: data.progress } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${data.project_id}`);
  revalidatePath(`/projects/${data.project_id}/tasks`);
  revalidatePath(`/projects/${data.project_id}/tasks/${id}`);
  return data as ProjectTask;
}

export async function archiveTask(id: string) {
  await requirePermission("tasks.archive");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: true };

  const { data: before, error: readError } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (readError) throw readError;

  const approval = await createApproval({
    title: `归档任务审批：${before.name}`,
    description: "任务归档会把该任务从活跃执行列表中移出，请确认相关交付物和复盘已经完成。",
    related_module: "tasks",
    related_record_type: "task",
    related_record_id: id,
    risk_level: "medium",
    metadata: { project_id: before.project_id, action: "archive_task" }
  });

  const { data, error } = await supabase.from("tasks").update({ status: "archived" }).eq("id", id).select().single();
  if (error) throw error;
  await logAction({ event_key: "tasks.updated", action: "archive", module: "tasks", related_record_type: "task", related_record_id: id, before_data: before, after_data: { ...data, approval_request_id: "id" in approval ? approval.id : null } });
  await emitEvent({ event_key: "tasks.updated", module: "tasks", payload: { id, project_id: data.project_id, status: "archived", approval_request_id: "id" in approval ? approval.id : null } });
  revalidatePath(`/projects/${data.project_id}/tasks`);
  revalidatePath(`/projects/${data.project_id}/tasks/${id}`);
  return data as ProjectTask;
}

export async function getTaskComments(taskId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoTaskComments.filter((comment) => comment.task_id === taskId);

  const { data, error } = await supabase
    .from("task_comments")
    .select("*, commenter:organization_members!task_comments_commenter_id_fkey(id,display_name,email,member_type)")
    .eq("organization_id", organization.id)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((item) => normalizeComment(item as Record<string, unknown>));
}

export async function createTaskComment(taskId: string, commentText: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  const payload = {
    organization_id: organization.id,
    task_id: taskId,
    comment_text: commentText,
    commenter_id: member.id
  };
  if (!supabase) return { ...payload, id: "demo_comment_created", created_at: new Date().toISOString() } as TaskComment;

  const { data, error } = await supabase.from("task_comments").insert(payload).select().single();
  if (error) throw error;
  await logAction({ event_key: "tasks.comment.created", action: "create", module: "tasks", related_record_type: "task_comment", related_record_id: data.id, after_data: data });
  await emitEvent({ event_key: "tasks.comment.created", module: "tasks", payload: { id: data.id, task_id: taskId } });
  revalidatePath("/projects");
  return data as TaskComment;
}

export async function getTaskFiles(taskId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoTaskFiles.filter((file) => file.task_id === taskId);

  const { data, error } = await supabase
    .from("task_files")
    .select("*, uploader:organization_members!task_files_uploaded_by_fkey(id,display_name,email,member_type), file:files(*)")
    .eq("organization_id", organization.id)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((item) => normalizeTaskFile(item as Record<string, unknown>));
}

export async function createTaskFile(input: {
  task_id: string;
  file?: File;
  file_name: string;
  file_url?: string | null;
  size_bytes?: number;
  mime_type?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  const member = await getCurrentMember();
  if (!supabase) return { ok: true };

  const createdFile = await uploadFile({
    file: input.file,
    file_name: input.file_name,
    storage_path: `projects/tasks/${input.task_id}/${Date.now()}-${input.file_name}`,
    mime_type: input.mime_type || "application/octet-stream",
    size_bytes: input.size_bytes ?? 0,
    asset_type: "project_doc",
    metadata: { asset_type: "project_doc", module: "projects", task_id: input.task_id }
  });
  const fileId = "id" in createdFile ? createdFile.id : null;
  if (fileId) {
    await linkFileToRecord({
      file_id: fileId,
      module: "tasks",
      record_type: "task",
      record_id: input.task_id
    });
  }

  const { data, error } = await supabase
    .from("task_files")
    .insert({
      organization_id: organization.id,
      task_id: input.task_id,
      file_id: fileId,
      file_url: input.file_url ?? (fileId ? `company-assets/${createdFile.storage_path}` : null),
      file_name: input.file_name,
      uploaded_by: member.id
    })
    .select()
    .single();

  if (error) throw error;
  await logAction({ event_key: "tasks.files.uploaded", action: "create", module: "tasks", related_record_type: "task_file", related_record_id: data.id, after_data: data });
  await emitEvent({ event_key: "tasks.files.uploaded", module: "tasks", payload: { id: data.id, task_id: input.task_id, file_id: fileId } });
  revalidatePath("/projects");
  return data as TaskFile;
}

export async function getProjectReview(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoProjectReviews.find((review) => review.project_id === projectId) ?? null;

  const { data, error } = await supabase
    .from("project_reviews")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ProjectReview | null;
}

export async function upsertProjectReview(input: ProjectReviewInput) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const before = await getProjectReview(input.project_id);
  const payload = {
    organization_id: organization.id,
    project_id: input.project_id,
    summary: input.summary,
    successful_factors: input.successful_factors ?? "",
    failure_factors: input.failure_factors ?? "",
    lessons_learned: input.lessons_learned ?? "",
    next_actions: input.next_actions ?? ""
  };
  const { data, error } = await supabase
    .from("project_reviews")
    .upsert(payload, { onConflict: "project_id" })
    .select()
    .single();

  if (error) throw error;
  await logAction({ event_key: "projects.reviewed", action: before ? "update" : "create", module: "projects", related_record_type: "project_review", related_record_id: data.id, before_data: before as unknown as Record<string, unknown> | null, after_data: data });
  await emitEvent({ event_key: "projects.reviewed", module: "projects", payload: { id: data.id, project_id: input.project_id } });
  revalidatePath(`/projects/${input.project_id}`);
  revalidatePath(`/projects/${input.project_id}/review`);
  return data as ProjectReview;
}
