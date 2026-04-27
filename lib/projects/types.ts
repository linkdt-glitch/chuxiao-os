import type { CompanyFile, OrganizationMember } from "@/lib/types/core";

export type ProjectStatus = "draft" | "in_progress" | "completed";
export type TaskStatus = "to_do" | "in_progress" | "completed" | "archived";

export type Project = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  owner?: Pick<OrganizationMember, "id" | "display_name" | "email" | "member_type"> | null;
  tasks?: ProjectTask[];
  review?: ProjectReview | null;
};

export type ProjectInput = {
  name: string;
  description?: string | null;
  owner_id?: string | null;
  status?: ProjectStatus;
  start_date?: string | null;
  due_date?: string | null;
  priority?: number;
};

export type ProjectTask = {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  assignee?: Pick<OrganizationMember, "id" | "display_name" | "email" | "member_type"> | null;
};

export type TaskInput = {
  project_id: string;
  name: string;
  description?: string | null;
  assigned_to?: string | null;
  status?: TaskStatus;
  due_date?: string | null;
  progress?: number;
};

export type TaskComment = {
  id: string;
  organization_id: string;
  task_id: string;
  comment_text: string;
  commenter_id: string | null;
  created_at: string;
  commenter?: Pick<OrganizationMember, "id" | "display_name" | "email" | "member_type"> | null;
};

export type TaskFile = {
  id: string;
  organization_id: string;
  task_id: string;
  file_id: string | null;
  file_url: string | null;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
  uploader?: Pick<OrganizationMember, "id" | "display_name" | "email" | "member_type"> | null;
  file?: CompanyFile | null;
};

export type ProjectReview = {
  id: string;
  organization_id: string;
  project_id: string;
  summary: string;
  successful_factors: string | null;
  failure_factors: string | null;
  lessons_learned: string | null;
  next_actions: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectReviewInput = {
  project_id: string;
  summary: string;
  successful_factors?: string | null;
  failure_factors?: string | null;
  lessons_learned?: string | null;
  next_actions?: string | null;
};

export type ProjectSummary = {
  projects: Project[];
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  averageProgress: number;
};
