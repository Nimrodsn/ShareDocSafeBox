export type RelationshipTag = 'self' | 'spouse' | 'son' | 'daughter' | 'other'
export type CategoryType = 'id_number' | 'passport' | 'birth_date' | 'drivers_license' | 'custom'

export interface VaultRow {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface VaultMemberRow {
  id: string
  vault_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export interface ProfileRow {
  id: string
  vault_id: string
  relationship: RelationshipTag
  display_name: string
  nicknames: string[]
  color_tag: string
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface RecordRow {
  id: string
  vault_id: string
  profile_id: string
  category_type: CategoryType
  category_label: string
  field_value: string
  notes: string | null
  expiry_date: string | null
  has_attachments: boolean
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface AttachmentRow {
  id: string
  vault_id: string
  record_id: string
  storage_path: string
  original_filename: string
  mime_type: string
  file_size: number | null
  created_by: string
  created_at: string
}
