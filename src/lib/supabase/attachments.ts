import { supabase } from './client'
import type { AttachmentRow } from './types'

const BUCKET = 'vault-attachments'
const SIGNED_URL_TTL_SECONDS = 300

export async function addAttachment(vaultId: string, recordId: string, file: File): Promise<string> {
  const attachmentId = crypto.randomUUID()
  const path = `${vaultId}/${recordId}/${attachmentId}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'application/octet-stream' })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('attachments').insert({
    id: attachmentId,
    record_id: recordId,
    storage_path: path,
    original_filename: file.name,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
  })
  if (insertError) throw insertError

  return attachmentId
}

export async function listAttachments(recordId: string): Promise<AttachmentRow[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as AttachmentRow[]
}

export async function getAttachmentSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error) return null
  return data.signedUrl
}

export async function deleteAttachment(id: string): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!row) return

  await supabase.storage.from(BUCKET).remove([row.storage_path])
  const { error: deleteError } = await supabase.from('attachments').delete().eq('id', id)
  if (deleteError) throw deleteError
}
