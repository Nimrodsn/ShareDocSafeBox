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

function storageFileToAttachmentRow(
  record: { id: string; vault_id: string; created_by: string; created_at: string },
  fileName: string,
  index: number,
): AttachmentRow {
  const originalFilename = fileName.includes('_') ? fileName.slice(fileName.indexOf('_') + 1) : fileName
  return {
    id: `storage-${index}`,
    vault_id: record.vault_id,
    record_id: record.id,
    storage_path: `${record.vault_id}/${record.id}/${fileName}`,
    original_filename: originalFilename,
    mime_type: inferMimeType(fileName, ''),
    file_size: null,
    created_by: record.created_by,
    created_at: record.created_at,
  }
}

export async function listAttachmentsForRecord(record: {
  id: string
  vault_id: string
  created_by: string
  created_at: string
  has_attachments: boolean
}): Promise<{ attachments: AttachmentRow[]; source: 'db' | 'storage' | 'none' }> {
  const dbRows = await listAttachments(record.id)
  if (dbRows.length > 0) {
    debugLog(
      'attachments.ts:listAttachmentsForRecord',
      'loaded from db',
      { recordId: record.id, count: dbRows.length },
      'F',
    )
    return { attachments: dbRows, source: 'db' }
  }

  const storage = await listStorageFilesForRecord(record.vault_id, record.id)
  if (storage.files.length > 0) {
    const recovered = storage.files.map((f, index) => storageFileToAttachmentRow(record, f.name, index))
    debugLog(
      'attachments.ts:listAttachmentsForRecord',
      'recovered from storage',
      { recordId: record.id, count: recovered.length, storageError: storage.error },
      'F',
    )
    return { attachments: recovered, source: 'storage' }
  }

  debugLog(
    'attachments.ts:listAttachmentsForRecord',
    'no attachments in db or storage',
    {
      recordId: record.id,
      hasAttachmentsFlag: record.has_attachments,
      storageError: storage.error,
    },
    'F',
  )
  return { attachments: [], source: 'none' }
}

export async function listStorageFilesForRecord(
  vaultId: string,
  recordId: string,
): Promise<{ files: { name: string }[]; error: string | null }> {
  const { data, error } = await supabase.storage.from(BUCKET).list(`${vaultId}/${recordId}`)
  if (error) return { files: [], error: error.message }
  return { files: (data ?? []).map((f) => ({ name: f.name })), error: null }
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
