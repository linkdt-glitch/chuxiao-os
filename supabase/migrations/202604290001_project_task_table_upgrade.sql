alter table public.tasks
  add column if not exists priority integer not null default 3 check (priority between 1 and 5);

create index if not exists idx_tasks_priority on public.tasks(priority);

update public.tasks
set priority = case
  when status = 'completed' then 2
  when due_date is not null and due_date < now() then 5
  when status = 'in_progress' then 4
  else 3
end
where priority is null or priority = 3;
