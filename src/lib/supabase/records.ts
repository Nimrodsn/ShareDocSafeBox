import { supabase } from './client'
import type { CategoryType, RecordRow } from './types'

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
