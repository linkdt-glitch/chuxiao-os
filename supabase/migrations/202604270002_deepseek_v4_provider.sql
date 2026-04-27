alter table public.ai_providers
  drop constraint if exists ai_providers_provider_name_check;

alter table public.ai_providers
  add constraint ai_providers_provider_name_check
  check (provider_name in ('openai', 'anthropic', 'google', 'local', 'deepseek', 'siliconflow'));

insert into public.ai_providers (
  organization_id,
  provider_name,
  label,
  api_key_encrypted,
  base_url,
  model_name,
  is_active,
  settings
)
select
  o.id,
  'deepseek',
  'DeepSeek V4 Flash',
  null,
  'https://api.deepseek.com',
  'deepseek-v4-flash',
  false,
  '{"format":"openai","thinking_mode":"default"}'::jsonb
from public.organizations o
where not exists (
  select 1
  from public.ai_providers p
  where p.organization_id = o.id
    and p.provider_name = 'deepseek'
);

insert into public.ai_providers (
  organization_id,
  provider_name,
  label,
  api_key_encrypted,
  base_url,
  model_name,
  is_active,
  settings
)
select
  o.id,
  'siliconflow',
  'SiliconFlow DeepSeek V3',
  null,
  'https://api.siliconflow.cn/v1',
  'deepseek-ai/DeepSeek-V3',
  false,
  '{"format":"openai","vendor":"siliconflow"}'::jsonb
from public.organizations o
where not exists (
  select 1
  from public.ai_providers p
  where p.organization_id = o.id
    and p.provider_name = 'siliconflow'
);
