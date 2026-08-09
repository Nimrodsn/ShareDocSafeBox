import { useEffect, useState } from 'react'
import { PinPad } from '../components/PinPad'
import { getLockoutState, recordFailedAttempt, resetFailedAttempts, verifyLocalPin } from '../lib/localPin/pinStorage'
import { useAuth } from '../lib/state/authContext'
import { useLock } from '../lib/state/lockContext'

export function LockScreen() {
  const { user } = useAuth()
  const { unlock } = useLock()
  const [error, setError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!user) return
    setLockedUntil(getLockoutState(user.id).lockedUntil)
  }, [user])

  useEffect(() => {
    if (!lockedUntil) {
      setRemaining(0)
      return
    }
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setRemaining(secs)
      if (secs === 0) {
        setLockedUntil(null)
        clearInterval(interval)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [lockedUntil])

  async function handleSubmit(pin: string) {
    if (!user) return
    setError(null)
    const ok = await verifyLocalPin(user.id, pin)
    if (ok) {
      resetFailedAttempts(user.id)
      unlock()
      return
    }
    const state = recordFailedAttempt(user.id)
    setLockedUntil(state.lockedUntil)
    setError('קוד שגוי, נסו שוב')
  }

  const isCoolingDown = !!lockedUntil && remaining > 0

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-8 px-6 py-12" dir="rtl">
      <h1 className="text-xl font-bold">הכספת נעולה</h1>

      {isCoolingDown ? (
        <p className="text-amber-400 text-sm text-center">
          נעילה זמנית עקב ניסיונות כושלים. נסו שוב בעוד {remaining} שניות.
        </p>
      ) : (
        <PinPad onSubmit={handleSubmit} error={error} submitLabel="פתיחה" />
      )}
    </div>
  )
}
