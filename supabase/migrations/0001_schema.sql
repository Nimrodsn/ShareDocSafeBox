-- ============================================================
-- 0001_schema.sql — tables, indexes, timestamp/consistency triggers
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP TRIGGER IF EXISTS.
-- gen_random_uuid() is built into Postgres 13+, no extension needed on Supabase.
-- ============================================================

-- ---------- vaults ----------
create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create table if not exists public.vaults (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'המשפחה שלי',
  invite_code  text not null unique default public.generate_invite_code(),
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- vault_members ----------
create table if not exists public.vault_members (
  id         uuid primary key default gen_random_uuid(),
  vault_id   uuid not null references public.vaults(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  unique (vault_id, user_id)
);
create index if not exists vault_members_user_id_idx on public.vault_members(user_id);
create index if not exists vault_members_vault_id_idx on public.vault_members(vault_id);

-- ---------- profiles (people in the vault) ----------
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  vault_id      uuid not null references public.vaults(id) on delete cascade,
  relationship  text not null check (relationship in ('self','spouse','son','daughter','other')),
  display_name  text not null,
  nicknames     text[] not null default '{}',
  color_tag     text not null default 'slate',
  created_by    uuid not null default auth.uid() references auth.users(id),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists profiles_vault_id_idx on public.profiles(vault_id);

-- ---------- records (the actual ID/passport/etc entries) ----------
create table if not exists public.records (
  id              uuid primary key default gen_random_uuid(),
  vault_id        uuid not null references public.vaults(id) on delete cascade, -- auto-set by trigger below
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  category_type   text not null check (category_type in ('id_number','passport','birth_date','drivers_license','custom')),
  category_label  text not null,
  field_value     text not null,
  notes           text,
  expiry_date     date,
  has_attachments boolean not null default false,
  created_by      uuid not null default auth.uid() references auth.users(id),
  updated_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists records_profile_id_idx on public.records(profile_id);
create index if not exists records_vault_id_idx on public.records(vault_id);
create index if not exists records_vault_category_idx on public.records(vault_id, category_type);

-- ---------- attachments (photo metadata + storage path) ----------
create table if not exists public.attachments (
  id                 uuid primary key default gen_random_uuid(),
  vault_id           uuid not null references public.vaults(id) on delete cascade, -- auto-set by trigger below
  record_id          uuid not null references public.records(id) on delete cascade,
  storage_path       text not null unique,
  original_filename  text not null,
  mime_type          text not null,
  file_size          bigint,
  created_by         uuid not null default auth.uid() references auth.users(id),
  created_at         timestamptz not null default now()
);
create index if not exists attachments_record_id_idx on public.attachments(record_id);
create index if not exists attachments_vault_id_idx on public.attachments(vault_id);

-- ---------- updated_at maintenance ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vaults_updated_at on public.vaults;
create trigger trg_vaults_updated_at before update on public.vaults
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_records_updated_at on public.records;
create trigger trg_records_updated_at before update on public.records
  for each row execute function public.set_updated_at();

-- ---------- vault_id consistency enforcement (NOT client-trusted) ----------
-- These run BEFORE INSERT/UPDATE, so Postgres re-checks RLS WITH CHECK against
-- the corrected row afterward — the client cannot force a mismatched vault_id.
create or replace function public.enforce_record_vault_id()
returns trigger language plpgsql as $$
begin
  select vault_id into new.vault_id from public.profiles where id = new.profile_id;
  if new.vault_id is null then
    raise exception 'profile % not found', new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_records_set_vault_id on public.records;
create trigger trg_records_set_vault_id
  before insert or update of profile_id on public.records
  for each row execute function public.enforce_record_vault_id();

create or replace function public.enforce_attachment_vault_id()
returns trigger language plpgsql as $$
begin
  select vault_id into new.vault_id from public.records where id = new.record_id;
  if new.vault_id is null then
    raise exception 'record % not found', new.record_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_attachments_set_vault_id on public.attachments;
create trigger trg_attachments_set_vault_id
  before insert or update of record_id on public.attachments
  for each row execute function public.enforce_attachment_vault_id();

-- ---------- has_attachments maintenance (parity with old Dexie schema) ----------
create or replace function public.sync_record_has_attachments()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    update public.records
      set has_attachments = exists (select 1 from public.attachments where record_id = old.record_id)
      where id = old.record_id;
    return old;
  else
    update public.records set has_attachments = true where id = new.record_id;
    return new;
  end if;
end;
$$;

drop trigger if exists trg_attachments_after_insert on public.attachments;
create trigger trg_attachments_after_insert after insert on public.attachments
  for each row execute function public.sync_record_has_attachments();

drop trigger if exists trg_attachments_after_delete on public.attachments;
create trigger trg_attachments_after_delete after delete on public.attachments
  for each row execute function public.sync_record_has_attachments();
