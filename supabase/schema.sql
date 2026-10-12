create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('homeowner','project_manager','company')),
  created_at timestamptz not null default now()
);
create table members (
  workspace_id uuid not null references workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'owner',
  primary key (workspace_id, user_id)
);
create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  state text not null default 'Kerala',
  created_at timestamptz not null default now()
);
create table land_checks (
  project_id uuid not null references projects on delete cascade,
  item_key text not null,
  status text not null default 'Not started'
    check (status in ('Not started','In progress','Clear','Review needed','High risk')),
  primary key (project_id, item_key)
);
create table expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  stage text not null,
  vendor text,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);
create table budget_lines (
  project_id uuid not null references projects on delete cascade,
  stage text not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  primary key (project_id, stage)
);
create table approval_steps (
  project_id uuid not null references projects on delete cascade,
  step_key text not null,
  status text not null default 'Not started',
  reference text,
  valid_till date,
  primary key (project_id, step_key)
);

create function is_member(ws uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from members where workspace_id = ws and user_id = auth.uid());
$$;

create function create_workspace(p_name text, p_kind text) returns uuid
language plpgsql security definer set search_path = public as $$
declare w uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into workspaces (name, kind) values (p_name, p_kind) returning id into w;
  insert into members (workspace_id, user_id, role) values (w, auth.uid(), 'owner');
  return w;
end $$;

alter table workspaces enable row level security;
alter table members enable row level security;
alter table projects enable row level security;
alter table land_checks enable row level security;
alter table expenses enable row level security;
alter table budget_lines enable row level security;
alter table approval_steps enable row level security;

create policy ws_read on workspaces for select using (is_member(id));
create policy mem_read on members for select using (user_id = auth.uid());
create policy proj_all on projects for all using (is_member(workspace_id)) with check (is_member(workspace_id));

create policy lc_all on land_checks for all
  using (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)))
  with check (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)));
create policy ex_all on expenses for all
  using (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)))
  with check (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)));
create policy bl_all on budget_lines for all
  using (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)))
  with check (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)));
create policy ap_all on approval_steps for all
  using (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)))
  with check (exists (select 1 from projects p where p.id = project_id and is_member(p.workspace_id)));
