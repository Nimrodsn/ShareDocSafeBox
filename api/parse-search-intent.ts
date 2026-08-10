import { handleParseSearchIntent, type ParseSearchIntentRequest } from '../server/parseSearchIntentCore'

interface VercelRequest {
  method?: string
  body?: ParseSearchIntentRequest | string
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => VercelResponse
  send: (body: string) => void
  json: (body: unknown) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  let body: ParseSearchIntentRequest
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
  } catch {
    return res.status(400).send('Invalid JSON')
  }

  const result = await handleParseSearchIntent(body)

  if (result.contentType) {
    res.setHeader('content-type', result.contentType)
  }

  if (result.contentType === 'application/json') {
    return res.status(result.status).json(JSON.parse(result.body))
  }

  return res.status(result.status).send(result.body)
}
