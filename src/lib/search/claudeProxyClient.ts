import { IntentResponseSchema, type IntentResponse } from './types'

const SEARCH_INTENT_ENDPOINTS = ['/api/parse-search-intent', '/.netlify/functions/parse-search-intent']

export async function parseSearchIntent(input: {
  query: string
  knownProfileTags: string[]
  knownCategoryTypes: string[]
  knownCustomLabels: string[]
}): Promise<IntentResponse | null> {
  for (const endpoint of SEARCH_INTENT_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) continue
      const json = await res.json()
      const parsed = IntentResponseSchema.safeParse(json)
      if (parsed.success) return parsed.data
    } catch {
      // try next endpoint
    }
  }
  return null
}
