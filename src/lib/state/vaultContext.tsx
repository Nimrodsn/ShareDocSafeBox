import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMyVault } from '../supabase/vaults'
import type { VaultRow } from '../supabase/types'
import { useAuth } from './authContext'

interface VaultContextValue {
  vault: VaultRow | null
  loading: boolean
  refresh: () => Promise<void>
}

const VaultContext = createContext<VaultContextValue | null>(null)

export function VaultProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [vault, setVault] = useState<VaultRow | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setVault(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const v = await getMyVault()
    setVault(v)
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <VaultContext.Provider value={{ vault, loading, refresh }}>{children}</VaultContext.Provider>
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}
