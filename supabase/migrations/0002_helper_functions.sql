-- ============================================================
-- 0002_helper_functions.sql — membership check + invite/join RPCs
-- ============================================================

-- ---------- non-recursive membership check ----------
-- SECURITY DEFINER + owned by the migration-running role (postgres) means the
-- query INSIDE this function bypasses RLS on vault_members entirely — that is
-- what avoids the "policy subqueries its own table" infinite-recursion trap.
create or replace function public.is_vault_member(p_vault_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.vault_members m
    where m.vault_id = p_vault_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_vault_owner(p_vault_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.vault_members m
    where m.vault_id = p_vault_id and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

revoke all on function public.is_vault_member(uuid) from public;
revoke all on function public.is_vault_owner(uuid) from public;
grant execute on function public.is_vault_member(uuid) to authenticated;
grant execute on function public.is_vault_owner(uuid) to authenticated;

-- ---------- create_vault: atomically creates vault + owner membership ----------
create or replace function public.create_vault(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vault_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.vaults (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'המשפחה שלי'), auth.uid())
  returning id into v_vault_id;

  insert into public.vault_members (vault_id, user_id, role)
  values (v_vault_id, auth.uid(), 'owner');

  return v_vault_id;
end;
$$;

-- ---------- join_vault_by_code: THE invite gate ----------
-- The vault_id is never taken from the client — it is looked up server-side
-- from the invite_code. A client cannot join a vault just by knowing/guessing
-- its UUID; they must possess the actual invite code.
create or replace function public.join_vault_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vault_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_vault_id
  from public.vaults
  where invite_code = upper(trim(p_invite_code));

  if v_vault_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.vault_members (vault_id, user_id, role)
  values (v_vault_id, auth.uid(), 'member')
  on conflict (vault_id, user_id) do nothing;

  return v_vault_id;
end;
$$;

-- ---------- regenerate_invite_code: owner can rotate a leaked code ----------
create or replace function public.regenerate_invite_code(p_vault_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_vault_owner(p_vault_id) then
    raise exception 'Only the vault owner can regenerate the invite code';
  end if;

  v_code := public.generate_invite_code();
  update public.vaults set invite_code = v_code where id = p_vault_id;
  return v_code;
end;
$$;

revoke all on function public.create_vault(text) from public;
revoke all on function public.join_vault_by_code(text) from public;
revoke all on function public.regenerate_invite_code(uuid) from public;
grant execute on function public.create_vault(text) to authenticated;
grant execute on function public.join_vault_by_code(text) to authenticated;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;

-- ---------- list_vault_members: member rows + email ----------
-- auth.users is not exposed to PostgREST directly, so this SECURITY DEFINER
-- function is the only way the client can see member emails, and only for
-- vaults the caller actually belongs to (enforced by is_vault_member below,
-- not by trusting the caller's input).
create or replace function public.list_vault_members(p_vault_id uuid)
returns table (
  user_id   uuid,
  email     text,
  role      text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_vault_member(p_vault_id) then
    raise exception 'Not a member of this vault';
  end if;

  return query
    select m.user_id, u.email::text, m.role, m.joined_at
    from public.vault_members m
    join auth.users u on u.id = m.user_id
    where m.vault_id = p_vault_id
    order by m.joined_at asc;
end;
$$;

revoke all on function public.list_vault_members(uuid) from public;
grant execute on function public.list_vault_members(uuid) to authenticated;
