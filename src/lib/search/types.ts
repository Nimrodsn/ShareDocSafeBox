import { z } from 'zod'
import type { CategoryType, RelationshipTag } from '../supabase/types'

export const IntentResponseSchema = z.object({
  matchedCategory: z
    .enum(['id_number', 'passport', 'birth_date', 'drivers_license', 'custom'])
    .nullable(),
  customLabelGuess: z.string().nullable().optional(),
  relationshipTag: z.enum(['self', 'spouse', 'son', 'daughter', 'other']).nullable(),
  ambiguous: z.boolean(),
  clarifyingQuestion: z.string().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type IntentResponse = z.infer<typeof IntentResponseSchema>

export interface SearchResolution {
  status: 'found' | 'disambiguate' | 'not_found' | 'low_confidence'
  profileId?: string
  recordId?: string
  candidateProfileIds?: string[]
  pendingCategoryType?: CategoryType
  pendingCustomLabelGuess?: string | null
  message?: string
}

export type { CategoryType, RelationshipTag }
