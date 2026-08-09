import { listProfiles, getProfilesByRelationship } from '../supabase/profiles'
import { distinctCustomLabels, findRecordsForProfileAndCategory } from '../supabase/records'
import { findNameInQuery, stripNameFromQuery } from './fuzzyNameMatch'
import { parseSearchIntent } from './claudeProxyClient'
import type { CategoryType, SearchResolution } from './types'

const FIXED_CATEGORY_TYPES: CategoryType[] = ['id_number', 'passport', 'birth_date', 'drivers_license', 'custom']

export async function resolveSearch(vaultId: string, rawQuery: string): Promise<SearchResolution> {
  const query = rawQuery.trim()
  if (!query) return { status: 'not_found', message: 'לא הוזנה שאלה' }

  const nameMatch = await findNameInQuery(vaultId, query)
  const queryForAi = nameMatch ? stripNameFromQuery(query, nameMatch.matchedToken) : query

  const profiles = await listProfiles(vaultId)
  const knownProfileTags = profiles.map((p) => p.relationship)
  const knownCustomLabels = await distinctCustomLabels(vaultId)

  const intent = await parseSearchIntent({
    query: queryForAi,
    knownProfileTags,
    knownCategoryTypes: FIXED_CATEGORY_TYPES,
    knownCustomLabels,
  })

  if (!intent || !intent.matchedCategory || intent.confidence === 'low') {
    return { status: 'low_confidence', message: 'לא הצלחתי להבין את השאלה. נסו לנסח אחרת או בחרו ידנית.' }
  }

  let profileId: string | undefined = nameMatch?.profile.id

  if (!profileId) {
    if (!intent.relationshipTag) {
      return { status: 'low_confidence', message: 'לא ברור על מי מדובר. נסו לציין שם או קרבה משפחתית.' }
    }
    const candidates = await getProfilesByRelationship(vaultId, intent.relationshipTag)
    if (candidates.length === 0) {
      return { status: 'not_found', message: `לא נמצא פרופיל בקטגוריה "${intent.relationshipTag}"` }
    }
    if (candidates.length > 1 || intent.ambiguous) {
      return {
        status: 'disambiguate',
        candidateProfileIds: candidates.map((c) => c.id),
        pendingCategoryType: intent.matchedCategory,
        pendingCustomLabelGuess: intent.customLabelGuess ?? null,
        message: intent.clarifyingQuestion ?? 'למי מהם התכוונת?',
      }
    }
    profileId = candidates[0].id
  }

  return resolveWithChosenProfile(profileId, intent.matchedCategory, intent.customLabelGuess ?? null)
}

export async function resolveWithChosenProfile(
  profileId: string,
  categoryType: CategoryType,
  customLabelGuess: string | null,
): Promise<SearchResolution> {
  const records = await findRecordsForProfileAndCategory(profileId, categoryType, customLabelGuess)
  if (records.length === 0) {
    return { status: 'not_found', profileId, message: 'לא נמצאה רשומה מתאימה' }
  }
  return { status: 'found', profileId, recordId: records[0].id }
}
