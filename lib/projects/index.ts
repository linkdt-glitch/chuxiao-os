import { revalidatePath } from "next/cache";
import { approveApproval, createApproval, rejectApproval } from "@/lib/approvals";
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
import type { ApprovalRequest } from "@/lib/types/core";

function clampProgress(value?: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

function clampPriority(value?: number) {
  if (!Number.isFinite(value)) return 3;
  return Math.max(1, Math.min(5, Math.round(Number(value))));
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
  const rawComments = row.task_comments;
  const rawFiles = row.task_files;
  return {
    ...(row as unknown as ProjectTask),
    priority: Number(row.priority ?? 3),
    assignee: (row.assignee ?? null) as ProjectTask["assignee"],
    project: (row.project ?? null) as ProjectTask["project"],
    comment_count: Array.isArray(rawComments) && rawComments[0] && typeof rawComments[0] === "object" && "count" in rawComments[0] ? Number(rawComments[0].count) : undefined,
    file_count: Array.isArray(rawFiles) && rawFiles[0] && typeof rawFiles[0] === "object" && "count" in rawFiles[0] ? Number(rawFiles[0].count) : undefined
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
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const payload = {
    ...input,
    priority: input.priority ? Math.max(1, Math.min(5, Number(input.priority))) : undefined
  };
  const { data: before, error: readError } = await supabase.from("projects").select("*").eq("organization_id", organization.id).eq("id", id).single();
  if (readError) throw readError;
  const { data, error } = await supabase.from("projects").update(payload).eq("organization_id", organization.id).eq("id", id).select().single();
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
    .select("*, assignee:organization_members!tasks_assigned_to_fkey(id,display_name,email,member_type), task_comments(count), task_files(count)")
    .eq("organization_id", organization.id)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((item) => normalizeTask(item as Record<string, unknown>));
}

export async function getTasks(filters?: {
  project_id?: string;
  status?: string;
  assigned_to?: string;
  priority?: string;
  due?: string;
  q?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) {
    return filterTasks(demoTasks, filters);
  }

  let query = supabase
    .from("tasks")
    .select("*, project:projects!tasks_project_id_fkey(id,name,status,due_date), assignee:organization_members!tasks_assigned_to_fkey(id,display_name,email,member_type), task_comments(count), task_files(count)")
    .eq("organization_id", organization.id)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });

  if (filters?.project_id) query = query.eq("project_id", filters.project_id);
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.assigned_to) query = query.eq("assigned_to", filters.assigned_to);
  if (filters?.priority && filters.priority !== "all") query = query.eq("priority", Number(filters.priority));
  if (filters?.q) query = query.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return filterTasks((data ?? []).map((item) => normalizeTask(item as Record<string, unknown>)), {
    due: filters?.due
  });
}

function filterTasks(tasks: ProjectTask[], filters?: { due?: string; status?: string; assigned_to?: string; priority?: string; project_id?: string; q?: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const query = filters?.q?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters?.project_id && task.project_id !== filters.project_id) return false;
    if (filters?.status && filters.status !== "all" && task.status !== filters.status) return false;
    if (filters?.assigned_to && task.assigned_to !== filters.assigned_to) return false;
    if (filters?.priority && filters.priority !== "all" && Number(task.priority) !== Number(filters.priority)) return false;
    if (query && !`${task.name} ${task.description ?? ""}`.toLowerCase().includes(query)) return false;
    if (!filters?.due || filters.due === "all") return true;
    if (!task.due_date) return filters.due === "none";
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    if (filters.due === "overdue") return dueDate < today && task.status !== "completed" && task.status !== "archived";
    if (filters.due === "today") return dueDate.getTime() === today.getTime();
    if (filters.due === "week") return dueDate >= today && dueDate <= weekEnd;
    return true;
  });
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
    progress,
    priority: clampPriority(input.priority ?? 3)
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
  if (input.status === "archived") {
    throw new Error("任务归档必须通过归档审批流程处理。");
  }
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data: before, error: readError } = await supabase.from("tasks").select("*").eq("organization_id", organization.id).eq("id", id).single();
  if (readError) throw readError;
  const progress = input.progress === undefined ? undefined : clampProgress(input.progress);
  const payload = {
    ...input,
    progress,
    priority: input.priority === undefined ? undefined : clampPriority(input.priority),
    status: progress === 100 && input.status === undefined ? "completed" : input.status
  };

  const { data, error } = await supabase.from("tasks").update(payload).eq("organization_id", organization.id).eq("id", id).select().single();
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
  const organization = await getCurrentOrganization();
  if (!supabase) return { ok: true };

  const { data: before, error: readError } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .single();
  if (readError) throw readError;
  if (before.status === "archived") return before as ProjectTask;

  const { data: existingApproval, error: approvalLookupError } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("related_module", "tasks")
    .eq("related_record_type", "task")
    .eq("related_record_id", id)
    .eq("status", "pending")
    .contains("metadata", { action: "archive_task" })
    .maybeSingle();

  if (approvalLookupError) throw approvalLookupError;
  if (existingApproval) return before as ProjectTask;

  const approval = await createApproval({
    title: `归档任务审批：${before.name}`,
    description: "任务归档会把该任务从活跃执行列表中移出，请确认相关交付物和复盘已经完成。",
    related_module: "tasks",
    related_record_type: "task",
    related_record_id: id,
    risk_level: "medium",
    metadata: { project_id: before.project_id, action: "archive_task" }
  });

  await logAction({
    event_key: "tasks.archive.requested",
    action: "archive_request",
    module: "tasks",
    related_record_type: "task",
    related_record_id: id,
    before_data: before,
    after_data: { approval_request_id: "id" in approval ? approval.id : null }
  });
  await emitEvent({
    event_key: "tasks.archive.requested",
    module: "tasks",
    payload: { id, project_id: before.project_id, approval_request_id: "id" in approval ? approval.id : null }
  });
  revalidatePath(`/projects/${before.project_id}/tasks`);
  revalidatePath(`/projects/${before.project_id}/tasks/${id}`);
  return before as ProjectTask;
}

export type ProjectApprovalRequest = ApprovalRequest & {
  task?: ProjectTask | null;
};

export async function getProjectApprovalRequests(filters?: {
  status?: string;
  limit?: number;
}): Promise<ProjectApprovalRequest[]> {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [];

  let query = supabase
    .from("approval_requests")
    .select("*")
    .eq("organization_id", organization.id)
    .in("related_module", ["tasks", "projects"])
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;

  const approvals = (data ?? []) as ApprovalRequest[];
  const taskIds = Array.from(
    new Set(
      approvals
        .filter((approval) => approval.related_record_type === "task" && approval.related_record_id)
        .map((approval) => approval.related_record_id as string)
    )
  );

  const taskMap = new Map<string, ProjectTask>();
  if (taskIds.length) {
    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("*, project:projects!tasks_project_id_fkey(id,name,status,due_date), assignee:organization_members!tasks_assigned_to_fkey(id,display_name,email,member_type), task_comments(count), task_files(count)")
      .eq("organization_id", organization.id)
      .in("id", taskIds);

    if (taskError) throw taskError;
    for (const task of tasks ?? []) {
      const normalized = normalizeTask(task as Record<string, unknown>);
      taskMap.set(normalized.id, normalized);
    }
  }

  return approvals.map((approval) => ({
    ...approval,
    task: approval.related_record_id ? taskMap.get(approval.related_record_id) ?? null : null
  }));
}

export async function approveProjectApproval(id: string) {
  await approveApproval(id);
  revalidatePath("/projects");
  revalidatePath("/projects/tasks");
  return { ok: true };
}

export async function rejectProjectApproval(id: string) {
  await rejectApproval(id);
  revalidatePath("/projects");
  revalidatePath("/projects/tasks");
  return { ok: true };
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
      file_url: input.file_url ?? (fileId ? `/api/files/${fileId}` : null),
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
