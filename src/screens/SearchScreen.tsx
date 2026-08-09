import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resolveSearch, resolveWithChosenProfile } from '../lib/search/resolveIntent'
import { useSpeechRecognition } from '../lib/speech/useSpeechRecognition'
import { getProfile } from '../lib/supabase/profiles'
import type { ProfileRow, CategoryType } from '../lib/supabase/types'
import { useVault } from '../lib/state/vaultContext'

export function SearchScreen() {
  const { vault } = useVault()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'thinking'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ProfileRow[]>([])
  const [pending, setPending] = useState<{ categoryType: CategoryType; customLabelGuess: string | null } | null>(
    null,
  )
  const navigate = useNavigate()
  const speech = useSpeechRecognition()

  useEffect(() => {
    if (speech.transcript) setQuery(speech.transcript)
  }, [speech.transcript])

  async function runSearch(text: string) {
    if (!vault) return
    setStatus('thinking')
    setMessage(null)
    setCandidates([])
    setPending(null)

    const result = await resolveSearch(vault.id, text)

    if (result.status === 'found' && result.recordId) {
      setStatus('idle')
      navigate(`/record/${result.recordId}`)
      return
    }

    if (result.status === 'disambiguate' && result.candidateProfileIds) {
      const profiles = await Promise.all(result.candidateProfileIds.map((id) => getProfile(id)))
      setCandidates(profiles.filter((p): p is ProfileRow => !!p))
      if (result.pendingCategoryType) {
        setPending({ categoryType: result.pendingCategoryType, customLabelGuess: result.pendingCustomLabelGuess ?? null })
      }
      setMessage(result.message ?? 'למי מהם התכוונת?')
      setStatus('idle')
      return
    }

    setMessage(result.message ?? 'לא נמצא')
    setStatus('idle')
  }

  async function pickCandidate(profileId: string) {
    if (!pending) return
    setStatus('thinking')
    const result = await resolveWithChosenProfile(profileId, pending.categoryType, pending.customLabelGuess)
    setStatus('idle')
    if (result.status === 'found' && result.recordId) {
      navigate(`/record/${result.recordId}`)
    } else {
      setMessage(result.message ?? 'לא נמצא')
      setCandidates([])
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) runSearch(query.trim())
  }

  return (
    <div className="px-4 py-6 pb-24" dir="rtl">
      <h1 className="text-xl font-bold mb-4">חיפוש חכם</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='למשל: "מה מספר הדרכון של דני"'
          className="flex-1 bg-slate-800 rounded-full px-4 py-3 text-sm outline-none"
          dir="auto"
        />
        {speech.supported && (
          <button
            type="button"
            onClick={speech.listening ? speech.stop : speech.start}
            className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
              speech.listening ? 'bg-red-600' : 'bg-slate-800'
            }`}
            aria-label="חיפוש בקול"
          >
            🎤
          </button>
        )}
        <button
          type="submit"
          className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center shrink-0"
          aria-label="חיפוש"
        >
          🔍
        </button>
      </form>

      {speech.listening && <p className="text-xs text-slate-400 mt-2">מקשיב…</p>}
      {status === 'thinking' && <p className="text-sm text-slate-400 mt-4">בודק…</p>}

      {message && <p className="text-sm text-amber-300 mt-6">{message}</p>}

      {candidates.length > 0 && (
        <div className="mt-4 space-y-2">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => pickCandidate(c.id)}
              className="w-full text-right bg-slate-900 rounded-xl p-3 border border-slate-800"
            >
              {c.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
