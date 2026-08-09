import { supabase } from './client'
import type { VaultRow } from './types'

export interface VaultMemberView {
  user_id: string
  email: string
  role: 'owner' | 'member'
  joined_at: string
}

export async function createVault(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_vault', { p_name: name })
  if (error) throw error
  return data as string
}

export async function joinVaultByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_vault_by_code', { p_invite_code: code })
  if (error) throw error
  return data as string
}

export async function regenerateInviteCode(vaultId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', { p_vault_id: vaultId })
  if (error) throw error
  return data as string
}

/** v1 assumes a single vault per user - returns the first one the user belongs to, or null. */
export async function getMyVault(): Promise<VaultRow | null> {
  const { data, error } = await supabase
    .from('vaults')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as VaultRow | null
}

export async function listVaultMembers(vaultId: string): Promise<VaultMemberView[]> {
  const { data, error } = await supabase.rpc('list_vault_members', { p_vault_id: vaultId })
  if (error) throw error
  return (data ?? []) as VaultMemberView[]
}
