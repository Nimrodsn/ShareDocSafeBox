import { supabase } from './client'
import type { AttachmentRow } from './types'
import { debugLog } from '../debugLog'

const BUCKET = 'vault-attachments'
const SIGNED_URL_TTL_SECONDS = 300

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
  if (!error && data) {
    debugLog(
      'attachments.ts:downloadAttachmentBlob',
      'storage download ok',
      { pathTail: storagePath.split('/').slice(-1)[0], blobSize: data.size },
      'D',
    )
    return { blob: data, error: null }
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (signError || !signed?.signedUrl) {
    debugLog(
      'attachments.ts:downloadAttachmentBlob',
      'download and signed URL both failed',
      {
        pathTail: storagePath.split('/').slice(-1)[0],
        downloadError: error?.message ?? null,
        signError: signError?.message ?? null,
      },
      'D',
    )
    return { blob: null, error: signError?.message ?? error?.message ?? 'לא ניתן לטעון את המסמך' }
  }

  try {
    const res = await fetch(signed.signedUrl)
    if (!res.ok) {
      debugLog(
        'attachments.ts:downloadAttachmentBlob',
        'signed URL fetch failed',
        { pathTail: storagePath.split('/').slice(-1)[0], status: res.status },
        'D',
      )
      return { blob: null, error: `HTTP ${res.status}` }
    }
    const blob = await res.blob()
    debugLog(
      'attachments.ts:downloadAttachmentBlob',
      'signed URL fallback ok',
      { pathTail: storagePath.split('/').slice(-1)[0], blobSize: blob.size },
      'D',
    )
    return { blob, error: null }
  } catch {
    return { blob: null, error: 'לא ניתן לטעון את המסמך' }
  }
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
