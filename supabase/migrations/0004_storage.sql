-- ============================================================
-- 0004_storage.sql — private bucket + path-based membership policies
-- Path convention: {vault_id}/{record_id}/{attachment_id}_{original_filename}
-- (the attachment_id prefix avoids collisions between attachments with the
-- same original filename in the same record)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('vault-attachments', 'vault-attachments', false)
on conflict (id) do nothing;

drop policy if exists "vault members can read attachments" on storage.objects;
create policy "vault members can read attachments"
on storage.objects for select
using (
  bucket_id = 'vault-attachments'
  and public.is_vault_member( ((storage.foldername(name))[1])::uuid )
);

drop policy if exists "vault members can upload attachments" on storage.objects;
create policy "vault members can upload attachments"
on storage.objects for insert
with check (
  bucket_id = 'vault-attachments'
  and public.is_vault_member( ((storage.foldername(name))[1])::uuid )
);

drop policy if exists "vault members can delete attachments" on storage.objects;
create policy "vault members can delete attachments"
on storage.objects for delete
using (
  bucket_id = 'vault-attachments'
  and public.is_vault_member( ((storage.foldername(name))[1])::uuid )
);
