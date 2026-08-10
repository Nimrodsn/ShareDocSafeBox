import type { Handler } from '@netlify/functions'
import { handleParseSearchIntent, type ParseSearchIntentRequest } from '../../server/parseSearchIntentCore'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  let body: ParseSearchIntentRequest
  try {
    // Netlify's Lambda-compatible runtime base64-encodes the body for some
    // payloads (notably multi-byte UTF-8, e.g. Hebrew). Decoding as latin1
    // here instead of utf-8 silently corrupts non-ASCII text without
    // throwing, so it must be handled explicitly.
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf-8')
      : (event.body ?? '{}')
    body = JSON.parse(rawBody)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const result = await handleParseSearchIntent(body)

  return {
    statusCode: result.status,
    headers: result.contentType ? { 'content-type': result.contentType } : undefined,
    body: result.body,
  }
}
