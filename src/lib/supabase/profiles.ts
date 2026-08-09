import { supabase } from './client'
import type { ProfileRow, RelationshipTag } from './types'

export async function listProfiles(vaultId: string): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('vault_id', vaultId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ProfileRow[]
}

export async function getProfile(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as ProfileRow | null
}

export async function getProfilesByRelationship(vaultId: string, tag: RelationshipTag): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('vault_id', vaultId)
    .eq('relationship', tag)
  if (error) throw error
  return data as ProfileRow[]
}

export async function createProfile(input: {
  vaultId: string
  displayName: string
  relationship: RelationshipTag
  nicknames?: string[]
}): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      vault_id: input.vaultId,
      display_name: input.displayName,
      relationship: input.relationship,
      nicknames: input.nicknames ?? [],
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function updateProfile(
  id: string,
  input: Partial<{ displayName: string; relationship: RelationshipTag; nicknames: string[] }>,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
      ...(input.relationship !== undefined ? { relationship: input.relationship } : {}),
      ...(input.nicknames !== undefined ? { nicknames: input.nicknames } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase.from('profiles').delete().eq('id', id)
  if (error) throw error
}
