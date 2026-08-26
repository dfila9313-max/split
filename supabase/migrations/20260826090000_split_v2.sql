begin;

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Участник' check (char_length(trim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  currency text not null check (currency in ('EUR','USD','RUB')),
  owner_id uuid not null references auth.users(id) on delete restrict,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8),'hex'),1,10)),
  import_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,import_key)
);

create table public.group_users (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(group_id,id),
  unique(group_id,user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 240),
  amount numeric(14,2) not null check (amount > 0),
  paid_by uuid not null,
  expense_date date not null default current_date,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id,id),
  foreign key(group_id,paid_by) references public.members(group_id,id) on delete restrict
);

create table public.expense_participants (
  expense_id uuid not null,
  group_id uuid not null,
  member_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(expense_id,member_id),
  foreign key(group_id,expense_id) references public.expenses(group_id,id) on delete cascade,
  foreign key(group_id,member_id) references public.members(group_id,id) on delete restrict
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_member_id uuid not null,
  to_member_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  settled_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  check (from_member_id <> to_member_id),
  foreign key(group_id,from_member_id) references public.members(group_id,id) on delete restrict,
  foreign key(group_id,to_member_id) references public.members(group_id,id) on delete restrict
);

create index group_users_user_id_idx on public.group_users(user_id);
create index members_group_id_idx on public.members(group_id);
create index expenses_group_date_idx on public.expenses(group_id,expense_date desc);
create index expense_participants_group_idx on public.expense_participants(group_id);
create index settlements_group_idx on public.settlements(group_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger groups_touch before update on public.groups for each row execute function public.touch_updated_at();
create trigger expenses_touch before update on public.expenses for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),split_part(new.email,'@',1),'Участник')) on conflict(id) do nothing;
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_group_user(p_group_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.group_users gu where gu.group_id=p_group_id and gu.user_id=auth.uid())
$$;
create or replace function public.is_group_owner(p_group_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.groups g where g.id=p_group_id and g.owner_id=auth.uid())
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_users enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.settlements enable row level security;

create policy profiles_select_self_or_cogroup on public.profiles for select to authenticated using (
 id=auth.uid() or exists(select 1 from public.group_users me join public.group_users them on them.group_id=me.group_id where me.user_id=auth.uid() and them.user_id=profiles.id)
);
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy profiles_insert_self on public.profiles for insert to authenticated with check(id=auth.uid());

create policy groups_select_member on public.groups for select to authenticated using(public.is_group_user(id));
create policy groups_update_owner on public.groups for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy groups_delete_owner on public.groups for delete to authenticated using(owner_id=auth.uid());

create policy group_users_select_member on public.group_users for select to authenticated using(public.is_group_user(group_id));
create policy group_users_delete_owner_or_self on public.group_users for delete to authenticated using(public.is_group_owner(group_id) or user_id=auth.uid());

create policy members_select_group on public.members for select to authenticated using(public.is_group_user(group_id));
create policy members_insert_group on public.members for insert to authenticated with check(public.is_group_user(group_id) and created_by=auth.uid());
create policy members_update_owner on public.members for update to authenticated using(public.is_group_owner(group_id)) with check(public.is_group_owner(group_id));
create policy members_delete_owner on public.members for delete to authenticated using(public.is_group_owner(group_id));

create policy expenses_select_group on public.expenses for select to authenticated using(public.is_group_user(group_id));
create policy expenses_insert_group on public.expenses for insert to authenticated with check(public.is_group_user(group_id) and created_by=auth.uid());
create policy expenses_update_creator_or_owner on public.expenses for update to authenticated using(created_by=auth.uid() or public.is_group_owner(group_id)) with check(public.is_group_user(group_id) and (created_by=auth.uid() or public.is_group_owner(group_id)));
create policy expenses_delete_creator_or_owner on public.expenses for delete to authenticated using(created_by=auth.uid() or public.is_group_owner(group_id));

create policy participants_select_group on public.expense_participants for select to authenticated using(public.is_group_user(group_id));
create policy participants_write_creator_or_owner on public.expense_participants for all to authenticated using(exists(select 1 from public.expenses e where e.id=expense_id and (e.created_by=auth.uid() or public.is_group_owner(e.group_id)))) with check(exists(select 1 from public.expenses e where e.id=expense_id and (e.created_by=auth.uid() or public.is_group_owner(e.group_id))));

create policy settlements_select_group on public.settlements for select to authenticated using(public.is_group_user(group_id));
create policy settlements_insert_group on public.settlements for insert to authenticated with check(public.is_group_user(group_id) and created_by=auth.uid());
create policy settlements_delete_creator_or_owner on public.settlements for delete to authenticated using(created_by=auth.uid() or public.is_group_owner(group_id));

create or replace function public.create_group_with_invite(p_name text,p_currency text)
returns table(group_id uuid,invite_code text) language plpgsql security definer set search_path=public as $$
declare v_group public.groups; v_name text; v_member_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 v_name=trim(p_name); if char_length(v_name)<1 then raise exception 'Group name is required'; end if;
 if p_currency not in ('EUR','USD','RUB') then raise exception 'Unsupported currency'; end if;
 insert into public.groups(name,currency,owner_id) values(v_name,p_currency,auth.uid()) returning * into v_group;
 insert into public.group_users(group_id,user_id,role) values(v_group.id,auth.uid(),'owner');
 select display_name into v_member_name from public.profiles where id=auth.uid();
 insert into public.members(group_id,user_id,name,created_by) values(v_group.id,auth.uid(),coalesce(v_member_name,'Участник'),auth.uid());
 return query select v_group.id,v_group.invite_code;
end $$;

create or replace function public.join_group_by_code(p_code text)
returns table(group_id uuid) language plpgsql security definer set search_path=public as $$
declare v_group_id uuid; v_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select id into v_group_id from public.groups where invite_code=upper(trim(p_code));
 if v_group_id is null then raise exception 'Invalid invite code'; end if;
 insert into public.group_users(group_id,user_id,role) values(v_group_id,auth.uid(),'member') on conflict do nothing;
 select display_name into v_name from public.profiles where id=auth.uid();
 insert into public.members(group_id,user_id,name,created_by) values(v_group_id,auth.uid(),coalesce(v_name,'Участник'),auth.uid()) on conflict(group_id,user_id) do nothing;
 return query select v_group_id;
end $$;

create or replace function public.save_expense(p_group_id uuid,p_expense_id uuid,p_description text,p_amount numeric,p_paid_by uuid,p_expense_date date,p_participant_ids uuid[])
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_creator uuid;
begin
 if not public.is_group_user(p_group_id) then raise exception 'Group access denied'; end if;
 if p_amount<=0 or trim(p_description)='' or coalesce(array_length(p_participant_ids,1),0)=0 then raise exception 'Invalid expense'; end if;
 if not exists(select 1 from public.members where id=p_paid_by and group_id=p_group_id) then raise exception 'Invalid payer'; end if;
 if exists(select 1 from unnest(p_participant_ids) x where not exists(select 1 from public.members m where m.id=x and m.group_id=p_group_id)) then raise exception 'Invalid participant'; end if;
 if p_expense_id is null then
  insert into public.expenses(group_id,description,amount,paid_by,expense_date,created_by) values(p_group_id,trim(p_description),p_amount,p_paid_by,p_expense_date,auth.uid()) returning id into v_id;
 else
  select created_by into v_creator from public.expenses where id=p_expense_id and group_id=p_group_id;
  if v_creator is null or (v_creator<>auth.uid() and not public.is_group_owner(p_group_id)) then raise exception 'Expense update denied'; end if;
  update public.expenses set description=trim(p_description),amount=p_amount,paid_by=p_paid_by,expense_date=p_expense_date where id=p_expense_id;
  v_id=p_expense_id; delete from public.expense_participants where expense_id=v_id;
 end if;
 insert into public.expense_participants(expense_id,group_id,member_id) select v_id,p_group_id,x from unnest(p_participant_ids) x;
 return v_id;
end $$;

create or replace function public.import_local_v1(p_data jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare g jsonb; m jsonb; e jsonb; s jsonb; v_gid uuid; v_mid uuid; v_eid uuid; v_old text; v_count integer:=0; member_map jsonb; v_import_key text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(p_data->'groups')<>'array' then raise exception 'Invalid Split v1 payload'; end if;
 for g in select * from jsonb_array_elements(p_data->'groups') loop
  v_import_key='v1:'||coalesce(g->>'id',encode(digest(g::text,'sha256'),'hex'));
  if exists(select 1 from public.groups where owner_id=auth.uid() and import_key=v_import_key) then continue; end if;
  insert into public.groups(name,currency,owner_id,import_key) values(left(coalesce(nullif(trim(g->>'name'),''),'Импортированная группа'),120),case when g->>'currency' in ('EUR','USD','RUB') then g->>'currency' else 'EUR' end,auth.uid(),v_import_key) returning id into v_gid;
  insert into public.group_users values(v_gid,auth.uid(),'owner',now()); member_map='{}'::jsonb;
  for m in select * from jsonb_array_elements(coalesce(g->'members','[]'::jsonb)) loop
   insert into public.members(group_id,name,color,created_by) values(v_gid,left(coalesce(nullif(trim(m->>'name'),''),'Участник'),80),m->>'color',auth.uid()) returning id into v_mid;
   member_map=member_map||jsonb_build_object(m->>'id',v_mid::text);
  end loop;
  if jsonb_array_length(coalesce(g->'members','[]'::jsonb))=0 then insert into public.members(group_id,user_id,name,created_by) select v_gid,auth.uid(),display_name,auth.uid() from public.profiles where id=auth.uid(); end if;
  for e in select * from jsonb_array_elements(coalesce(g->'expenses','[]'::jsonb)) loop
   if member_map ? (e->>'payerId') then
    insert into public.expenses(group_id,description,amount,paid_by,expense_date,created_by) values(v_gid,left(coalesce(nullif(trim(e->>'description'),''),'Расход'),240),greatest((e->>'amount')::numeric,0.01),(member_map->>(e->>'payerId'))::uuid,coalesce((e->>'date')::date,current_date),auth.uid()) returning id into v_eid;
    for v_old in select jsonb_array_elements_text(coalesce(e->'participantIds','[]'::jsonb)) loop if member_map ? v_old then insert into public.expense_participants values(v_eid,v_gid,(member_map->>v_old)::uuid,now()) on conflict do nothing; end if; end loop;
   end if;
  end loop;
  for s in select * from jsonb_array_elements(coalesce(g->'settlements','[]'::jsonb)) loop
   if member_map ? (s->>'fromId') and member_map ? (s->>'toId') then insert into public.settlements(group_id,from_member_id,to_member_id,amount,settled_at,created_by) values(v_gid,(member_map->>(s->>'fromId'))::uuid,(member_map->>(s->>'toId'))::uuid,greatest((s->>'amount')::numeric,0.01),coalesce((s->>'date')::timestamptz,now()),auth.uid()); end if;
  end loop;
  v_count=v_count+1;
 end loop;
 return v_count;
end $$;

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.profiles,public.groups,public.group_users,public.members,public.expenses,public.expense_participants,public.settlements to authenticated;
grant execute on function public.create_group_with_invite(text,text),public.join_group_by_code(text),public.save_expense(uuid,uuid,text,numeric,uuid,date,uuid[]),public.import_local_v1(jsonb) to authenticated;
revoke all on function public.is_group_user(uuid),public.is_group_owner(uuid) from public;
grant execute on function public.is_group_user(uuid),public.is_group_owner(uuid) to authenticated;

do $$ begin
 alter publication supabase_realtime add table public.groups,public.group_users,public.members,public.expenses,public.expense_participants,public.settlements;
exception when duplicate_object then null; end $$;

commit;
