begin;

-- Cross-table references inside a group must block deleting a single referenced
-- member, while still allowing the whole group graph to cascade in one transaction.
alter table public.expenses drop constraint if exists expenses_group_id_paid_by_fkey;
alter table public.expenses add constraint expenses_group_id_paid_by_fkey
 foreign key(group_id,paid_by) references public.members(group_id,id)
 on delete no action deferrable initially deferred;

alter table public.expense_participants drop constraint if exists expense_participants_group_id_member_id_fkey;
alter table public.expense_participants add constraint expense_participants_group_id_member_id_fkey
 foreign key(group_id,member_id) references public.members(group_id,id)
 on delete no action deferrable initially deferred;

alter table public.settlements drop constraint if exists settlements_group_id_from_member_id_fkey;
alter table public.settlements add constraint settlements_group_id_from_member_id_fkey
 foreign key(group_id,from_member_id) references public.members(group_id,id)
 on delete no action deferrable initially deferred;

alter table public.settlements drop constraint if exists settlements_group_id_to_member_id_fkey;
alter table public.settlements add constraint settlements_group_id_to_member_id_fkey
 foreign key(group_id,to_member_id) references public.members(group_id,id)
 on delete no action deferrable initially deferred;

-- Ensure a partially configured publication is repaired table by table.
do $$
declare table_name text;
begin
 foreach table_name in array array['groups','group_users','members','expenses','expense_participants','settlements'] loop
  begin
   execute format('alter publication supabase_realtime add table public.%I',table_name);
  exception when duplicate_object then null;
  end;
 end loop;
end $$;

-- Imported v1 participants remain unchanged, but every imported group also gets
-- a participant linked to the importing account for future cloud expenses.
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
  insert into public.members(group_id,user_id,name,created_by)
  select v_gid,auth.uid(),display_name,auth.uid() from public.profiles where id=auth.uid();
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

revoke all on function public.create_group_with_invite(text,text),public.join_group_by_code(text),public.save_expense(uuid,uuid,text,numeric,uuid,date,uuid[]),public.import_local_v1(jsonb) from public;
grant execute on function public.create_group_with_invite(text,text),public.join_group_by_code(text),public.save_expense(uuid,uuid,text,numeric,uuid,date,uuid[]),public.import_local_v1(jsonb) to authenticated;

commit;
