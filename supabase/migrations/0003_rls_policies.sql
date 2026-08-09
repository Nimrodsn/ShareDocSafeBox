-- ============================================================
-- 0003_rls_policies.sql — enable RLS + policies on every table
-- ============================================================

alter table public.vaults enable row level security;
alter table public.vault_members enable row level security;
alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.attachments enable row level security;

-- ---------- vaults ----------
drop policy if exists "members can view their vaults" on public.vaults;
create policy "members can view their vaults"
on public.vaults for select
using ( public.is_vault_member(id) );

drop policy if exists "owners can update vault" on public.vaults;
create policy "owners can update vault"
on public.vaults for update
using ( public.is_vault_owner(id) )
with check ( public.is_vault_owner(id) );

drop policy if exists "owners can delete vault" on public.vaults;
create policy "owners can delete vault"
on public.vaults for delete
using ( public.is_vault_owner(id) );

-- Intentionally NO insert policy: vault creation only via create_vault() RPC.

-- ---------- vault_members ----------
-- Non-recursive: uses is_vault_member(), never a raw subquery on vault_members
-- inside its own policy.
drop policy if exists "members can view membership of their vaults" on public.vault_members;
create policy "members can view membership of their vaults"
on public.vault_members for select
using ( public.is_vault_member(vault_id) );

drop policy if exists "users can remove themselves from a vault" on public.vault_members;
create policy "users can remove themselves from a vault"
on public.vault_members for delete
using ( user_id = auth.uid() );

drop policy if exists "owners can remove other members" on public.vault_members;
create policy "owners can remove other members"
on public.vault_members for delete
using ( public.is_vault_owner(vault_id) );

-- Intentionally NO insert policy: membership rows only via create_vault() /
-- join_vault_by_code() RPCs (both SECURITY DEFINER, bypass RLS internally).

-- ---------- profiles ----------
drop policy if exists "members can view profiles" on public.profiles;
create policy "members can view profiles"
on public.profiles for select
using ( public.is_vault_member(vault_id) );

drop policy if exists "members can insert profiles" on public.profiles;
create policy "members can insert profiles"
on public.profiles for insert
with check ( public.is_vault_member(vault_id) );

drop policy if exists "members can update profiles" on public.profiles;
create policy "members can update profiles"
on public.profiles for update
using ( public.is_vault_member(vault_id) )
with check ( public.is_vault_member(vault_id) );

drop policy if exists "members can delete profiles" on public.profiles;
create policy "members can delete profiles"
on public.profiles for delete
using ( public.is_vault_member(vault_id) );

-- ---------- records ----------
drop policy if exists "members can view records" on public.records;
create policy "members can view records"
on public.records for select
using ( public.is_vault_member(vault_id) );

drop policy if exists "members can insert records" on public.records;
create policy "members can insert records"
on public.records for insert
with check ( public.is_vault_member(vault_id) );

drop policy if exists "members can update records" on public.records;
create policy "members can update records"
on public.records for update
using ( public.is_vault_member(vault_id) )
with check ( public.is_vault_member(vault_id) );

drop policy if exists "members can delete records" on public.records;
create policy "members can delete records"
on public.records for delete
using ( public.is_vault_member(vault_id) );

-- ---------- attachments ----------
drop policy if exists "members can view attachments" on public.attachments;
create policy "members can view attachments"
on public.attachments for select
using ( public.is_vault_member(vault_id) );

drop policy if exists "members can insert attachments" on public.attachments;
create policy "members can insert attachments"
on public.attachments for insert
with check ( public.is_vault_member(vault_id) );

drop policy if exists "members can delete attachments" on public.attachments;
create policy "members can delete attachments"
on public.attachments for delete
using ( public.is_vault_member(vault_id) );
-- No update policy: attachment rows are treated as immutable once uploaded.
