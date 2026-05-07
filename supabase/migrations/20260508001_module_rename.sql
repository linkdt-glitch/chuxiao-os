-- Rename three core modules to friendlier user-facing names.
-- Module key (PK-like) stays the same, only the displayed `name` changes,
-- so RLS / permissions / routes are not affected.

update public.modules
set name = '财务能量中心'
where key = 'finance';

update public.modules
set name = '计划任务中心'
where key = 'projects';

update public.modules
set name = 'AI 创新实验中心'
where key = 'ai_workforce';

-- Sync the matching permission descriptions so the role/permission
-- screen reads consistently with the new module names.
update public.permissions
set name = '查看 AI 创新实验中心'
where key = 'ai_workforce.view';

update public.permissions
set name = '管理 AI 创新实验中心'
where key = 'ai_workforce.manage';
