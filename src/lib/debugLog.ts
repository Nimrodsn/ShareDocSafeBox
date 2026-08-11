const DEBUG_KEY = 'debug-8cc855'

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = 'pre-fix',
) {
  const entry = {
    sessionId: '8cc855',
    runId,
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  }

  // #region agent log
  try {
    const prev = JSON.parse(sessionStorage.getItem(DEBUG_KEY) ?? '[]') as unknown[]
    prev.push(entry)
    sessionStorage.setItem(DEBUG_KEY, JSON.stringify(prev.slice(-50)))
  } catch {
    // ignore storage errors
  }
  console.warn('[DEBUG-8cc855]', message, data)
  fetch('http://127.0.0.1:7555/ingest/24819420-bd93-438a-9938-7ef5fd500a8c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '8cc855' },
    body: JSON.stringify(entry),
  }).catch(() => {})
  // #endregion
}
