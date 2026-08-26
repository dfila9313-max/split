begin;

create or replace function public.join_group_by_code(p_code text)
returns table(group_id uuid)
language plpgsql
security definer
set search_path=public
as $$
declare
 v_group_id uuid;
 v_name text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select id into v_group_id from public.groups where invite_code=upper(trim(p_code));
 if v_group_id is null then raise exception 'Invalid invite code'; end if;
 insert into public.group_users(group_id,user_id,role)
 values(v_group_id,auth.uid(),'member')
 on conflict do nothing;
 select display_name into v_name from public.profiles where id=auth.uid();
 insert into public.members(group_id,user_id,name,created_by)
 values(v_group_id,auth.uid(),coalesce(v_name,'Участник'),auth.uid())
 on conflict on constraint members_group_id_user_id_key do nothing;
 return query select v_group_id;
end $$;

revoke all on function public.join_group_by_code(text) from public;
grant execute on function public.join_group_by_code(text) to authenticated;

commit;
