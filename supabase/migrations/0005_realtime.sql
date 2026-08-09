-- ============================================================
-- 0005_realtime.sql — live updates between vault members
-- ============================================================

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.records;
alter publication supabase_realtime add table public.attachments;

-- REPLICA IDENTITY FULL: without this, UPDATE/DELETE change events only carry
-- the primary key in the WAL, so Realtime has no vault_id to evaluate the
-- SELECT policy against and will silently drop those events (fails closed,
-- not a leak — but "spouse doesn't see a live delete" looks like a bug).
alter table public.profiles replica identity full;
alter table public.records replica identity full;
alter table public.attachments replica identity full;
