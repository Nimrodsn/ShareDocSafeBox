import { useState } from 'react'
import { createVault, joinVaultByCode } from '../lib/supabase/vaults'
import { useVault } from '../lib/state/vaultContext'

export function VaultSetupScreen() {
  const { refresh } = useVault()
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [name, setName] = useState('המשפחה שלי')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createVault(name.trim())
      await refresh()
    } catch {
      setError('שגיאה ביצירת הכספת')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await joinVaultByCode(code.trim())
      await refresh()
    } catch {
      setError('קוד הזמנה לא תקין')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-8 px-6 py-12" dir="rtl">
      {mode === 'choose' && (
        <div className="text-center space-y-6 max-w-sm">
          <h1 className="text-xl font-bold">ברוכים הבאים</h1>
          <p className="text-slate-300 text-sm">כדי להתחיל, צרו כספת משפחתית חדשה או הצטרפו לכספת קיימת עם קוד הזמנה.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setMode('create')} className="px-6 py-3 rounded-full bg-emerald-600 text-slate-50">
              יצירת כספת חדשה
            </button>
            <button onClick={() => setMode('join')} className="px-6 py-3 rounded-full bg-slate-800 text-slate-100">
              הצטרפות עם קוד הזמנה
            </button>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="w-full max-w-xs space-y-4 text-center">
          <h2 className="text-lg font-semibold">שם הכספת</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none text-center"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-emerald-600 text-slate-50 disabled:opacity-40"
          >
            {loading ? 'יוצר…' : 'יצירה'}
          </button>
          <button type="button" onClick={() => setMode('choose')} className="text-xs text-slate-500 underline">
            חזרה
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="w-full max-w-xs space-y-4 text-center">
          <h2 className="text-lg font-semibold">קוד הזמנה</h2>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="לדוגמה: A1B2C3D4"
            dir="ltr"
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none text-center tracking-widest"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 rounded-full bg-emerald-600 text-slate-50 disabled:opacity-40"
          >
            {loading ? 'מצטרף…' : 'הצטרפות'}
          </button>
          <button type="button" onClick={() => setMode('choose')} className="text-xs text-slate-500 underline">
            חזרה
          </button>
        </form>
      )}
    </div>
  )
}
