import { demoMembers, demoOrganization } from "@/lib/data/demo";
import type { Project, ProjectReview, ProjectTask, TaskComment, TaskFile } from "@/lib/projects/types";

const now = new Date("2026-04-25T10:00:00.000Z").toISOString();

const admin = demoMembers.find((member) => member.id === "mem_admin") ?? demoMembers[1];
const manager = demoMembers.find((member) => member.id === "mem_ops") ?? demoMembers[2];
const designer = demoMembers.find((member) => member.id === "mem_designer") ?? demoMembers[3];
const backend = demoMembers.find((member) => member.id === "mem_backend") ?? demoMembers[0];

export const demoProjects: Project[] = [
  {
    id: "project_a",
    organization_id: demoOrganization.id,
    name: "项目A：开发新产品",
    description: "围绕新产品从需求、设计到研发交付的第一阶段项目。",
    owner_id: admin.id,
    status: "in_progress",
    start_date: "2023-01-01T00:00:00.000Z",
    due_date: "2023-06-30T00:00:00.000Z",
    priority: 5,
    created_at: now,
    updated_at: now,
    owner: admin
  },
  {
    id: "project_b",
    organization_id: demoOrganization.id,
    name: "项目B：升级客户支持系统",
    description: "升级客户支持系统的数据结构、处理流程和协作体验。",
    owner_id: manager.id,
    status: "in_progress",
    start_date: "2023-02-15T00:00:00.000Z",
    due_date: "2023-05-30T00:00:00.000Z",
    priority: 3,
    created_at: now,
    updated_at: now,
    owner: manager
  }
];

export const demoTasks: ProjectTask[] = [
  {
    id: "task_a1",
    organization_id: demoOrganization.id,
    project_id: "project_a",
    name: "任务A1：设计 UI 界面",
    description: "完成核心页面的信息架构、视觉稿和交互说明。",
    assigned_to: designer.id,
    status: "in_progress",
    due_date: "2023-03-30T00:00:00.000Z",
    progress: 60,
    created_at: now,
    updated_at: now,
    assignee: designer
  },
  {
    id: "task_b1",
    organization_id: demoOrganization.id,
    project_id: "project_b",
    name: "任务B1：升级数据库",
    description: "整理客户支持系统的数据表变更，并完成迁移验证。",
    assigned_to: backend.id,
    status: "to_do",
    due_date: "2023-04-30T00:00:00.000Z",
    progress: 10,
    created_at: now,
    updated_at: now,
    assignee: backend
  }
];

export const demoTaskComments: TaskComment[] = [
  {
    id: "comment_a1",
    organization_id: demoOrganization.id,
    task_id: "task_a1",
    comment_text: "首页和任务详情页的草稿已完成，下一步补齐空状态和移动端间距。",
    commenter_id: designer.id,
    created_at: now,
    commenter: designer
  }
];

export const demoTaskFiles: TaskFile[] = [
  {
    id: "task_file_a1",
    organization_id: demoOrganization.id,
    task_id: "task_a1",
    file_id: null,
    file_url: "/files/project-a-ui-wireframe.pdf",
    file_name: "项目A-UI线框图.pdf",
    uploaded_by: designer.id,
    created_at: now,
    uploader: designer,
    file: null
  }
];

export const demoProjectReviews: ProjectReview[] = [
  {
    id: "review_project_a",
    organization_id: demoOrganization.id,
    project_id: "project_a",
    summary: "新产品项目处于推进中，设计阶段进展稳定，研发排期仍需持续跟进。",
    successful_factors: "目标拆解清晰，负责人明确。",
    failure_factors: "跨角色确认节奏偏慢。",
    lessons_learned: "关键任务需要更早锁定验收标准。",
    next_actions: "把 UI 设计验收清单沉淀为 SOP，并同步给研发负责人。",
    created_at: now,
    updated_at: now
  }
];
