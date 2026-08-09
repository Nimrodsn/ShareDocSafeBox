import { IntentResponseSchema, type IntentResponse } from './types'

export async function parseSearchIntent(input: {
  query: string
  knownProfileTags: string[]
  knownCategoryTypes: string[]
  knownCustomLabels: string[]
}): Promise<IntentResponse | null> {
  try {
    const res = await fetch('/.netlify/functions/parse-search-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return null
    const json = await res.json()
    const parsed = IntentResponseSchema.safeParse(json)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
