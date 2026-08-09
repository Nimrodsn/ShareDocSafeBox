import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/state/authContext'
import { VaultProvider, useVault } from './lib/state/vaultContext'
import { LockProvider, useLock } from './lib/state/lockContext'
import { hasLocalPin } from './lib/localPin/pinStorage'
import { AuthScreen } from './screens/AuthScreen'
import { VaultSetupScreen } from './screens/VaultSetupScreen'
import { PinSetupScreen } from './screens/PinSetupScreen'
import { LockScreen } from './screens/LockScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ProfileDetailScreen } from './screens/ProfileDetailScreen'
import { RecordAddEditScreen } from './screens/RecordAddEditScreen'
import { RecordDetailScreen } from './screens/RecordDetailScreen'
import { SearchScreen } from './screens/SearchScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { BottomNav } from './components/BottomNav'

function Loading() {
  return <div className="min-h-full flex items-center justify-center text-slate-500 text-sm">טוען…</div>
}

function AppShell() {
  const { user, loading: authLoading } = useAuth()
  const { vault, loading: vaultLoading } = useVault()
  const { unlocked, lock } = useLock()
  const [needsPinSetup, setNeedsPinSetup] = useState<boolean | null>(null)

  // Re-lock whenever the signed-in account changes (sign-out, or a different
  // person signing in on this device) so a stale `unlocked` state from a
  // previous session can never skip the new account's PIN screen.
  useEffect(() => {
    lock()
    if (!user) {
      setNeedsPinSetup(null)
      return
    }
    setNeedsPinSetup(!hasLocalPin(user.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  if (authLoading) return <Loading />
  if (!user) return <AuthScreen />

  if (vaultLoading) return <Loading />
  if (!vault) return <VaultSetupScreen />

  if (needsPinSetup === null) return <Loading />
  if (needsPinSetup) return <PinSetupScreen />
  if (!unlocked) return <LockScreen />

  return (
    <div className="min-h-full">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/profile/:id" element={<ProfileDetailScreen />} />
        <Route path="/profile/:profileId/record/new" element={<RecordAddEditScreen />} />
        <Route path="/record/:id" element={<RecordDetailScreen />} />
        <Route path="/record/:id/edit" element={<RecordAddEditScreen />} />
        <Route path="/search" element={<SearchScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <VaultProvider>
        <LockProvider>
          <AppShell />
        </LockProvider>
      </VaultProvider>
    </AuthProvider>
  )
}
