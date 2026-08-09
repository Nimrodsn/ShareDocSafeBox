import { listProfiles } from '../supabase/profiles'
import type { ProfileRow } from '../supabase/types'

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export interface NameMatch {
  profile: ProfileRow
  matchedToken: string
}

/**
 * Checks whether the query text directly names one of the vault's profiles.
 * Runs against Supabase (already RLS-scoped to the vault) - names are never
 * sent to the search-intent proxy, only the relationship tag is.
 */
export async function findNameInQuery(vaultId: string, query: string): Promise<NameMatch | null> {
  const profiles = await listProfiles(vaultId)
  const words = query.split(/\s+/).filter(Boolean)
  const normalizedQuery = query.trim()

  for (const profile of profiles) {
    const candidates = [profile.display_name, ...profile.nicknames].filter(Boolean)
    for (const candidate of candidates) {
      if (normalizedQuery.includes(candidate)) {
        return { profile, matchedToken: candidate }
      }
      for (const word of words) {
        if (word.length < 2) continue
        const distance = levenshtein(word, candidate)
        if (distance <= 1) return { profile, matchedToken: candidate }
      }
    }
  }
  return null
}

/** Replaces a matched name with a generic placeholder before the query is sent to the AI proxy. */
export function stripNameFromQuery(query: string, matchedToken: string): string {
  return query.split(matchedToken).join('האדם הזה')
}
