import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

const IDLE_TIMEOUT_SECONDS = 120

interface LockContextValue {
  unlocked: boolean
  unlock: () => void
  lock: () => void
}

const LockContext = createContext<LockContextValue | null>(null)

export function LockProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lock = useCallback(() => setUnlocked(false), [])
  const unlock = useCallback(() => setUnlocked(true), [])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) lock()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [lock])

  useEffect(() => {
    if (!unlocked) return

    function resetTimer() {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => lock(), IDLE_TIMEOUT_SECONDS * 1000)
    }

    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    events.forEach((ev) => window.addEventListener(ev, resetTimer))
    resetTimer()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer))
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [unlocked, lock])

  return <LockContext.Provider value={{ unlocked, unlock, lock }}>{children}</LockContext.Provider>
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext)
  if (!ctx) throw new Error('useLock must be used within LockProvider')
  return ctx
}
