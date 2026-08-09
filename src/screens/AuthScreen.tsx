import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase/auth'

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password)
        if (error) setError(error)
        else setInfo('נרשמת בהצלחה. אם נדרש אימות אימייל - בדקו את תיבת הדואר שלכם ואז התחברו.')
      } else {
        const { error } = await signIn(email, password)
        if (error) setError('פרטי התחברות שגויים')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-6 py-12" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">כספת משפחתית משותפת</h1>
        <p className="text-slate-400 text-sm">
          {mode === 'signin' ? 'התחברות לחשבון' : 'יצירת חשבון חדש'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל"
          dir="ltr"
          className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה (לפחות 6 תווים)"
          dir="ltr"
          className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
        />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        {info && <p className="text-emerald-400 text-sm text-center">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-emerald-600 text-slate-50 disabled:opacity-40"
        >
          {loading ? 'רגע…' : mode === 'signin' ? 'התחברות' : 'הרשמה'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
          setError(null)
          setInfo(null)
        }}
        className="text-sm text-slate-400 underline"
      >
        {mode === 'signin' ? 'אין לכם חשבון? הרשמה' : 'כבר יש לכם חשבון? התחברות'}
      </button>
    </div>
  )
}
