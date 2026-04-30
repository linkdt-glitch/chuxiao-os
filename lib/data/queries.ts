import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/auth";
import { ensureDefaultAIProviders } from "@/lib/ai/default-providers";
import { getFinanceRecords } from "@/lib/finance/records";
import type { FinanceRecord } from "@/lib/finance/types";
import {
  demoAIInvocationLogs,
  demoAgentRunLogs,
  demoAgents,
  demoApprovals,
  demoAuditLogs,
  demoEvents,
  demoFeedbackRecords,
  demoFiles,
  demoImprovementSuggestions,
  demoMembers,
  demoOrganizationModules,
  demoPermissions,
  demoProviders,
  demoReviewRecords,
  demoRoles,
  demoSopRecords
} from "@/lib/data/demo";
import type { ApprovalRequest, AuditLog, CompanyFile, SystemEvent } from "@/lib/types/core";

export async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (supabase) {
    const [
      { count: enabledModules },
      { count: pendingApprovals },
      { count: members },
      { count: agents },
      { count: providers },
      { count: aiInvocations },
      { count: unprocessedEvents },
      { count: financePendingApprovals },
      { count: aiPendingConfirmations },
      { count: projectPendingApprovals },
      { data: events },
      { data: logs },
      { data: comingSoon },
      { data: improvements }
    ] = await Promise.all([
      supabase.from("organization_modules").select("id, modules!inner(key)", { count: "exact", head: true }).eq("organization_id", organization.id).eq("is_enabled", true).neq("modules.key", "approvals"),
      supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "pending"),
      supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
      supabase.from("agents").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
      supabase.from("ai_providers").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
      supabase.from("ai_invocation_logs").select("id", { count: "exact", head: true }).eq("organization_id", organization.id),
      supabase.from("system_events").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "new"),
      supabase.from("finance_records").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "pending_approval"),
      supabase.from("ai_confirmation_requests").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "pending"),
      supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "pending").in("related_module", ["tasks", "projects"]),
      supabase.from("system_events").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("audit_logs").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("organization_modules").select("*, modules(*)").eq("organization_id", organization.id).eq("modules.status", "coming_soon"),
      supabase.from("improvement_suggestions").select("*").eq("organization_id", organization.id).in("impact_level", ["high", "critical"]).order("created_at", { ascending: false }).limit(5)
    ]);

    return {
      stats: {
        enabledModules: enabledModules ?? 0,
        pendingApprovals: pendingApprovals ?? 0,
        aiInvocations: aiInvocations ?? 0,
        agents: agents ?? 0,
        members: members ?? 0,
        providers: providers ?? 0,
        unprocessedEvents: unprocessedEvents ?? 0,
        financePendingApprovals: financePendingApprovals ?? 0,
        aiPendingConfirmations: aiPendingConfirmations ?? 0,
        projectPendingApprovals: projectPendingApprovals ?? 0
      },
      events: events ?? [],
      logs: logs ?? [],
      comingSoon: (comingSoon ?? []).map((item) => ({ ...item, module: item.modules })),
      improvements: improvements ?? []
    };
  }

  return {
    stats: {
      enabledModules: demoOrganizationModules.filter((item) => item.is_enabled).length,
      pendingApprovals: demoApprovals.filter((item) => item.status === "pending").length,
      aiInvocations: demoAIInvocationLogs.length,
      agents: demoAgents.length,
      members: demoMembers.length,
      providers: demoProviders.length,
      unprocessedEvents: demoEvents.filter((event) => event.status === "new").length,
      financePendingApprovals: demoApprovals.filter((item) => item.status === "pending" && item.related_module === "finance").length,
      aiPendingConfirmations: demoApprovals.filter((item) => item.status === "pending" && item.related_module === "ai_workforce").length,
      projectPendingApprovals: demoApprovals.filter((item) => item.status === "pending" && ["tasks", "projects"].includes(item.related_module)).length
    },
    events: demoEvents.slice(0, 5),
    logs: demoAuditLogs.slice(0, 5),
    comingSoon: demoOrganizationModules.filter((item) => item.module?.status === "coming_soon"),
    improvements: demoImprovementSuggestions
  };
}

export async function getMembers() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoMembers;

  const { data } = await supabase
    .from("organization_members")
    .select("*, roles(*)")
    .eq("organization_id", organization.id)
    .order("created_at");

  return (data ?? []).map((item) => ({ ...item, role: item.roles }));
}

export async function getRolesAndPermissions() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { roles: demoRoles, permissions: demoPermissions };

  const [{ data: roles }, { data: permissions }] = await Promise.all([
    supabase.from("roles").select("*").eq("organization_id", organization.id).order("risk_rank", { ascending: false }),
    supabase.from("permissions").select("*").order("module")
  ]);
  return { roles: roles ?? demoRoles, permissions: permissions ?? demoPermissions };
}

export async function getApprovals() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoApprovals;

  const { data } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getApprovalCenterData() {
  const [approvals, financeRecords] = await Promise.all([
    getApprovals(),
    getFinanceRecords({ limit: 500 })
  ]);

  const financeByApprovalId = new Map<string, FinanceRecord>();
  const financeByRecordId = new Map<string, FinanceRecord>();

  for (const record of financeRecords) {
    financeByRecordId.set(record.id, record);
    if (record.approval_request_id) financeByApprovalId.set(record.approval_request_id, record);
  }

  const financeApprovals = approvals
    .filter((approval) => approval.related_module === "finance")
    .map((approval) => ({
      approval,
      record: financeByApprovalId.get(approval.id) ?? (approval.related_record_id ? financeByRecordId.get(approval.related_record_id) : undefined)
    }));

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  return {
    approvals,
    financeApprovals,
    financeRecords,
    stats: {
      total: approvals.length,
      pending: approvals.filter((approval) => approval.status === "pending").length,
      financePending: financeApprovals.filter(({ approval, record }) => approval.status === "pending" || record?.status === "pending_approval").length,
      highRiskPending: approvals.filter((approval) => approval.status === "pending" && ["high", "critical"].includes(approval.risk_level)).length,
      processedThisWeek: approvals.filter((approval) => ["approved", "rejected"].includes(approval.status) && new Date(approval.updated_at ?? approval.created_at) >= weekStart).length,
      rejectedThisWeek: approvals.filter((approval) => approval.status === "rejected" && new Date(approval.updated_at ?? approval.created_at) >= weekStart).length
    }
  };
}

export async function getAuditLogs() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoAuditLogs;

  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSystemEvents() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoEvents;

  const { data } = await supabase
    .from("system_events")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getFiles() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoFiles;

  const { data } = await supabase
    .from("files")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAISettingsData() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { providers: demoProviders, logs: demoAIInvocationLogs };

  await ensureDefaultAIProviders(organization.id);

  const [{ data: providers }, { data: logs }] = await Promise.all([
    supabase
      .from("ai_providers")
      .select("id, organization_id, provider_name, label, base_url, model_name, is_active, created_at, updated_at")
      .eq("organization_id", organization.id),
    supabase.from("ai_invocation_logs").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false })
  ]);
  return { providers: providers ?? [], logs: logs ?? [] };
}

export async function getAgentsData() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return { agents: demoAgents, runs: demoAgentRunLogs };

  const [{ data: agents }, { data: runs }] = await Promise.all([
    supabase.from("agents").select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }),
    supabase.from("agent_run_logs").select("*").eq("organization_id", organization.id).order("started_at", { ascending: false })
  ]);
  return { agents: agents ?? [], runs: runs ?? [] };
}

export async function getFeedbackRecords() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoFeedbackRecords;

  const { data } = await supabase
    .from("feedback_records")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getReviewRecords() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoReviewRecords;

  const { data } = await supabase
    .from("review_records")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getSopRecords() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoSopRecords;

  const { data } = await supabase
    .from("sop_records")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getImprovementSuggestions() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return demoImprovementSuggestions;

  const { data } = await supabase
    .from("improvement_suggestions")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getGovernanceData() {
  const [rolesAndPermissions, members, approvals, logs, events] = await Promise.all([
    getRolesAndPermissions(),
    getMembers(),
    getApprovals(),
    getAuditLogs(),
    getSystemEvents()
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const highRoleKeys = new Set(["owner", "admin"]);
  const highPrivilegeMembers = members.filter((member) => highRoleKeys.has(member.role?.key ?? "")).length;
  const highPrivilegeAgents = members.filter((member) => member.member_type === "agent" && highRoleKeys.has(member.role?.key ?? "")).length;

  return {
    roles: rolesAndPermissions.roles,
    permissions: rolesAndPermissions.permissions,
    members,
    approvals,
    logs,
    events,
    stats: {
      roleCount: rolesAndPermissions.roles.length,
      permissionCount: rolesAndPermissions.permissions.length,
      highPrivilegeMembers,
      highPrivilegeAgents,
      pendingApprovals: approvals.filter((approval) => approval.status === "pending").length,
      highRiskApprovals: approvals.filter((approval) => ["high", "critical"].includes(approval.risk_level) && approval.status === "pending").length,
      approvedThisWeek: countThisWeek(approvals.filter((approval) => approval.status === "approved")),
      todayLogs: logs.filter((log) => log.created_at.startsWith(today)).length,
      criticalLogs: logs.filter((log) => ["delete", "disable", "approve", "reject", "update"].includes(log.action)).length,
      todayEvents: events.filter((event) => event.created_at.startsWith(today)).length,
      newEvents: events.filter((event) => event.status === "new").length,
      failedEvents: events.filter((event) => event.status === "failed").length
    },
    actorDistribution: {
      human: logs.filter((log) => log.actor_type === "human").length,
      agent: logs.filter((log) => log.actor_type === "agent").length,
      system: logs.filter((log) => log.actor_type === "system").length
    }
  };
}

export async function getKnowledgeData() {
  const [files, sops, reviews] = await Promise.all([
    getFiles(),
    getSopRecords(),
    getReviewRecords()
  ]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const typedFiles = files.map((file) => ({
    ...file,
    asset_type: file.asset_type ?? String(file.metadata?.asset_type ?? "other"),
    tags: file.tags ?? (Array.isArray(file.metadata?.tags) ? file.metadata.tags as string[] : []),
    summary: file.summary ?? (typeof file.metadata?.summary === "string" ? file.metadata.summary : null)
  }));

  return {
    files: typedFiles,
    sops,
    reviews,
    stats: {
      fileCount: files.length,
      uploadedThisMonth: files.filter((file) => file.created_at.startsWith(currentMonth)).length,
      receiptCount: typedFiles.filter((file) => file.asset_type === "receipt").length,
      projectDocCount: typedFiles.filter((file) => file.asset_type === "project_doc").length,
      sopCount: sops.length,
      reviewCount: reviews.length
    },
    categoryCounts: ["receipt", "contract", "project_doc", "prompt_doc", "agent_output", "sop", "review", "other"].map((assetType) => ({
      assetType,
      count: typedFiles.filter((file) => file.asset_type === assetType).length
    }))
  };
}

export async function getEvolutionData() {
  const [feedback, reviews, sops, improvements] = await Promise.all([
    getFeedbackRecords(),
    getReviewRecords(),
    getSopRecords(),
    getImprovementSuggestions()
  ]);

  return {
    feedback,
    reviews,
    sops,
    improvements,
    stats: {
      feedbackCount: feedback.length,
      reviewCount: reviews.length,
      sopCount: sops.length,
      improvementCount: improvements.length,
      openImprovements: improvements.filter((item) => ["new", "accepted", "in_progress"].includes(item.status)).length
    }
  };
}

export async function getAIWorkforceData() {
  const [{ agents, runs }, { providers, logs }, feedback] = await Promise.all([
    getAgentsData(),
    getAISettingsData(),
    getFeedbackRecords()
  ]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  return {
    agents,
    runs,
    providers,
    logs,
    feedback,
    stats: {
      agents: agents.length,
      activeAgents: agents.filter((agent) => agent.status === "active").length,
      providers: providers.length,
      monthlyInvocations: logs.filter((log) => log.created_at.startsWith(currentMonth)).length
    }
  };
}

function countThisWeek(records: Array<ApprovalRequest | AuditLog | SystemEvent | CompanyFile>) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  return records.filter((record) => new Date(record.created_at) >= start).length;
}
