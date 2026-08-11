import { supabase } from './client'
import type { AttachmentRow, CategoryType, RecordRow } from './types'
import { debugLog } from '../debugLog'
import { listAttachments } from './attachments'

export const CATEGORY_LABELS: Record<Exclude<CategoryType, 'custom'>, string> = {
  id_number: 'תעודת זהות',
  passport: 'דרכון',
  birth_date: 'תאריך לידה',
  drivers_license: 'רישיון נהיגה',
}

export async function listRecordsForProfile(profileId: string): Promise<RecordRow[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as RecordRow[]
}

export async function listAllRecords(vaultId: string): Promise<RecordRow[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('vault_id', vaultId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as RecordRow[]
}

export async function getRecord(id: string): Promise<RecordRow | null> {
  const { data, error } = await supabase.from('records').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as RecordRow | null
}

type RecordWithAttachmentsRow = RecordRow & { attachments: AttachmentRow[] | AttachmentRow | null }

function normalizeAttachments(raw: AttachmentRow[] | AttachmentRow | null | undefined): AttachmentRow[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') return [raw]
  return []
}

export async function getRecordWithAttachments(id: string): Promise<{
  record: RecordRow | null
  attachments: AttachmentRow[]
}> {
  const { data, error } = await supabase
    .from('records')
    .select('*, attachments(*)')
    .eq('id', id)
    .maybeSingle()
  debugLog(
    'records.ts:getRecordWithAttachments',
    'supabase join query result',
    {
      recordId: id,
      hasData: !!data,
      supabaseError: error?.message ?? null,
      supabaseCode: error?.code ?? null,
      rawAttachmentCount: normalizeAttachments((data as RecordWithAttachmentsRow | null)?.attachments).length,
      hasAttachmentsFlag: (data as RecordRow | null)?.has_attachments ?? null,
    },
    'B',
  )
  if (error) throw error
  if (!data) return { record: null, attachments: [] }

  const { attachments: rawAttachments, ...record } = data as RecordWithAttachmentsRow
  let attachments = normalizeAttachments(rawAttachments).sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  )

  if ((record as RecordRow).has_attachments && attachments.length === 0) {
    attachments = await listAttachments(id)
    debugLog(
      'records.ts:getRecordWithAttachments',
      'fallback listAttachments',
      { recordId: id, fallbackCount: attachments.length },
      'B',
    )
  }

  return { record: record as RecordRow, attachments }
}

export async function findRecordsForProfileAndCategory(
  profileId: string,
  categoryType: CategoryType,
  customLabelGuess?: string | null,
): Promise<RecordRow[]> {
  let query = supabase.from('records').select('*').eq('profile_id', profileId).eq('category_type', categoryType)
  if (categoryType === 'custom' && customLabelGuess) {
    query = query.ilike('category_label', `%${customLabelGuess}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return data as RecordRow[]
}

export async function createRecord(input: {
  profileId: string
  categoryType: CategoryType
  categoryLabel?: string
  fieldValue: string
  notes?: string
  expiryDate?: string
}): Promise<string> {
  const { data, error } = await supabase
    .from('records')
    .insert({
      profile_id: input.profileId,
      category_type: input.categoryType,
      category_label:
        input.categoryType === 'custom' ? input.categoryLabel ?? 'שדה מותאם אישית' : CATEGORY_LABELS[input.categoryType],
      field_value: input.fieldValue,
      notes: input.notes || null,
      expiry_date: input.expiryDate || null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function updateRecord(
  id: string,
  input: Partial<{ categoryLabel: string; fieldValue: string; notes: string; expiryDate: string }>,
): Promise<void> {
  const { error } = await supabase
    .from('records')
    .update({
      ...(input.categoryLabel !== undefined ? { category_label: input.categoryLabel } : {}),
      ...(input.fieldValue !== undefined ? { field_value: input.fieldValue } : {}),
      ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
      ...(input.expiryDate !== undefined ? { expiry_date: input.expiryDate || null } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from('records').delete().eq('id', id)
  if (error) throw error
}

export async function distinctCustomLabels(vaultId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('records')
    .select('category_label')
    .eq('vault_id', vaultId)
    .eq('category_type', 'custom')
  if (error) throw error
  return Array.from(new Set((data ?? []).map((r) => r.category_label as string)))
}
