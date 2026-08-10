const MAX_QUERY_LENGTH = 500
const MODEL = 'claude-haiku-4-5'

export interface ParseSearchIntentRequest {
  query: string
  knownProfileTags: string[]
  knownCategoryTypes: string[]
  knownCustomLabels: string[]
}

export interface ParseSearchIntentResult {
  status: number
  body: string
  contentType?: string
}

const INTENT_TOOL = {
  name: 'report_intent',
  description: 'Report the structured intent extracted from a personal-vault search question.',
  input_schema: {
    type: 'object',
    properties: {
      matchedCategory: {
        type: ['string', 'null'],
        enum: ['id_number', 'passport', 'birth_date', 'drivers_license', 'custom', null],
      },
      customLabelGuess: { type: ['string', 'null'] },
      relationshipTag: {
        type: ['string', 'null'],
        enum: ['self', 'spouse', 'son', 'daughter', 'other', null],
      },
      ambiguous: { type: 'boolean' },
      clarifyingQuestion: { type: ['string', 'null'] },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
    required: ['matchedCategory', 'relationshipTag', 'ambiguous', 'confidence'],
  },
}

export async function handleParseSearchIntent(body: ParseSearchIntentRequest): Promise<ParseSearchIntentResult> {
  const query = (body.query ?? '').trim()
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return { status: 400, body: 'Invalid query' }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { status: 500, body: 'Server not configured' }
  }

  const systemPrompt = [
    'You are an intent classifier for a personal document-vault app.',
    'You NEVER see or receive any actual personal data (no names, no ID/passport numbers).',
    'You only receive a free-text question, a list of relationship tags that exist in the vault',
    '(e.g. "self", "son" appearing twice means the user has two sons), a list of category types that exist,',
    'and a list of custom category labels that exist.',
    'Classify which category the user is asking about and which relationship tag they mean.',
    'If a relationship tag appears more than once in knownProfileTags, set ambiguous=true and provide a',
    'clarifyingQuestion in Hebrew asking the user to specify which one (e.g. by name).',
    'Always call the report_intent tool with your answer. Do not output anything else.',
  ].join(' ')

  const userMessage = [
    `Question: ${query}`,
    `Known relationship tags: ${JSON.stringify(body.knownProfileTags ?? [])}`,
    `Known category types: ${JSON.stringify(body.knownCategoryTypes ?? [])}`,
    `Known custom labels: ${JSON.stringify(body.knownCustomLabels ?? [])}`,
  ].join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        tools: [INTENT_TOOL],
        tool_choice: { type: 'tool', name: 'report_intent' },
      }),
    })

    if (!res.ok) {
      return { status: 502, body: 'Upstream error' }
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; input?: unknown }>
    }
    const toolUse = data.content.find((c) => c.type === 'tool_use')
    if (!toolUse?.input) {
      return { status: 502, body: 'No structured response' }
    }

    return {
      status: 200,
      body: JSON.stringify(toolUse.input),
      contentType: 'application/json',
    }
  } catch {
    return { status: 502, body: 'Upstream request failed' }
  }
}
