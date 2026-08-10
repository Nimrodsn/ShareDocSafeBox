import { supabase } from './client'
import type { AttachmentRow } from './types'

const BUCKET = 'vault-attachments'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'])

function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^\w.-]/g, '_') || 'photo.jpg'
}

function inferMimeType(fileName: string, fileType: string): string {
  if (fileType) return fileType
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'heic':
      return 'image/heic'
    case 'heif':
      return 'image/heif'
    default:
      return 'application/octet-stream'
  }
}

export function isImageAttachment(mimeType: string, fileName: string): boolean {
  if (mimeType.startsWith('image/')) return true
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext ? IMAGE_EXTENSIONS.has(ext) : false
}

export async function addAttachment(vaultId: string, recordId: string, file: File): Promise<string> {
  const attachmentId = crypto.randomUUID()
  const safeName = sanitizeStorageFileName(file.name)
  const mimeType = inferMimeType(safeName, file.type)
  const path = `${vaultId}/${recordId}/${attachmentId}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: mimeType })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('attachments').insert({
    id: attachmentId,
    record_id: recordId,
    storage_path: path,
    original_filename: file.name,
    mime_type: mimeType,
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

export async function downloadAttachmentBlob(
  storagePath: string,
): Promise<{ blob: Blob | null; error: string | null }> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath)
  if (error) return { blob: null, error: error.message }
  return { blob: data, error: null }
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
