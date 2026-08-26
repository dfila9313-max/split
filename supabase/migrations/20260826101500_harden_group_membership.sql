begin;

-- Owners must not be able to remove their own access row and orphan a group.
drop policy if exists group_users_delete_owner_or_self on public.group_users;
create policy group_users_delete_owner_or_self
on public.group_users
for delete
to authenticated
using (
  (public.is_group_owner(group_id) and user_id <> auth.uid())
  or (user_id = auth.uid() and role = 'member')
);

commit;
