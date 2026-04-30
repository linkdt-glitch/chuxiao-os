-- Decentralize approval entry points.
-- The approval_requests table stays as the shared audit/workflow record,
-- but user-facing approval work moves into finance, AI workforce, and projects.

begin;

update public.modules
set
  name = '审批底层记录（已迁移）',
  description = '审批入口已迁移到财务中心、智能劳动力中心和项目中心；本模块仅保留底层 approval_requests 兼容记录。',
  status = 'disabled',
  route = '/governance',
  required_permission = 'governance.view',
  updated_at = now()
where key = 'approvals';

update public.organization_modules om
set
  is_enabled = false,
  settings = coalesce(om.settings, '{}'::jsonb) || jsonb_build_object(
    'migrated_to_modules', true,
    'finance_approvals_route', '/finance/records?status=pending_approval',
    'ai_approvals_route', '/ai-workforce/confirmations',
    'project_approvals_route', '/projects/tasks'
  ),
  updated_at = now()
from public.modules m
where om.module_id = m.id
  and m.key = 'approvals';

insert into public.system_events (
  organization_id,
  event_key,
  event_source,
  actor_id,
  actor_type,
  module,
  payload,
  status
)
select
  o.id,
  'governance.approvals.decentralized',
  'system',
  null,
  'system',
  'governance',
  jsonb_build_object(
    'finance', '/finance/records?status=pending_approval',
    'ai_workforce', '/ai-workforce/confirmations',
    'projects', '/projects/tasks'
  ),
  'new'
from public.organizations o
where not exists (
  select 1
  from public.system_events e
  where e.organization_id = o.id
    and e.event_key = 'governance.approvals.decentralized'
);

commit;
