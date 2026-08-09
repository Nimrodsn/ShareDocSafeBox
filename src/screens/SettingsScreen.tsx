import { useEffect, useState } from 'react'
import { listVaultMembers, regenerateInviteCode, type VaultMemberView } from '../lib/supabase/vaults'
import { signOut } from '../lib/supabase/auth'
import { PinPad } from '../components/PinPad'
import { verifyLocalPin, setupLocalPin } from '../lib/localPin/pinStorage'
import { useAuth } from '../lib/state/authContext'
import { useVault } from '../lib/state/vaultContext'

export function SettingsScreen() {
  const { user } = useAuth()
  const { vault } = useVault()
  const [members, setMembers] = useState<VaultMemberView[]>([])
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [changingPin, setChangingPin] = useState(false)
  const [oldPinStep, setOldPinStep] = useState(true)
  const [oldPin, setOldPin] = useState('')

  async function reload() {
    if (!vault) return
    setMembers(await listVaultMembers(vault.id))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault?.id])

  const isOwner = members.find((m) => m.user_id === user?.id)?.role === 'owner'

  async function handleCopyCode() {
    if (!vault) return
    await navigator.clipboard.writeText(vault.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerateCode() {
    if (!vault) return
    if (!confirm('קוד ההזמנה הישן יפסיק לעבוד. להמשיך?')) return
    setRegenerating(true)
    try {
      await regenerateInviteCode(vault.id)
      window.location.reload()
    } finally {
      setRegenerating(false)
    }
  }

  function handleOldPin(pin: string) {
    setOldPin(pin)
    setOldPinStep(false)
    setMessage(null)
  }

  async function handleNewPin(pin: string) {
    if (!user) return
    const ok = await verifyLocalPin(user.id, oldPin)
    if (!ok) {
      setMessage('קוד ה-PIN הישן שגוי')
      setChangingPin(false)
      setOldPinStep(true)
      return
    }
    await setupLocalPin(user.id, pin)
    setChangingPin(false)
    setOldPinStep(true)
    setOldPin('')
    setMessage('קוד ה-PIN עודכן')
  }

  return (
    <div className="px-4 py-6 pb-24 space-y-8" dir="rtl">
      <h1 className="text-xl font-bold">הגדרות</h1>

      {message && <p className="text-sm text-amber-300">{message}</p>}

      <section className="space-y-3">
        <h2 className="text-sm text-slate-400">הכספת: {vault?.name}</h2>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <p className="text-xs text-slate-400">קוד הזמנה - שתפו עם בני משפחה כדי שיצטרפו</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-mono tracking-widest" dir="ltr">{vault?.invite_code}</p>
            <button onClick={handleCopyCode} className="text-xs text-emerald-400 underline">
              {copied ? 'הועתק!' : 'העתקה'}
            </button>
          </div>
          {isOwner && (
            <button
              onClick={handleRegenerateCode}
              disabled={regenerating}
              className="text-xs text-slate-400 underline disabled:opacity-40"
            >
              יצירת קוד חדש (מבטל את הישן)
            </button>
          )}
        </div>

        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <p className="text-xs text-slate-400 mb-1">חברי הכספת</p>
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between text-sm">
              <span dir="ltr" className="truncate">{m.email}</span>
              <span className="text-xs text-slate-500">{m.role === 'owner' ? 'בעלים' : 'חבר'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-slate-400">נעילה מהירה</h2>

        {!changingPin && (
          <button
            onClick={() => setChangingPin(true)}
            className="w-full text-right py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-sm"
          >
            שינוי קוד נעילה מהיר
          </button>
        )}

        {changingPin && oldPinStep && (
          <div className="text-center space-y-3 bg-slate-900 rounded-xl p-4 border border-slate-800">
            <p className="text-sm text-slate-300">הזינו את הקוד הנוכחי</p>
            <PinPad onSubmit={handleOldPin} submitLabel="המשך" />
            <button onClick={() => setChangingPin(false)} className="text-xs text-slate-500 underline">
              ביטול
            </button>
          </div>
        )}

        {changingPin && !oldPinStep && (
          <div className="text-center space-y-3 bg-slate-900 rounded-xl p-4 border border-slate-800">
            <p className="text-sm text-slate-300">בחרו קוד חדש</p>
            <PinPad onSubmit={handleNewPin} submitLabel="עדכון" />
          </div>
        )}
      </section>

      <button onClick={() => signOut()} className="w-full py-3 rounded-full bg-slate-800 text-slate-200 text-sm">
        התנתקות
      </button>

      <section className="text-xs text-slate-600 text-center pt-4">
        <p>כספת משפחתית משותפת · הנתונים מאובטחים ב-Supabase</p>
      </section>
    </div>
  )
}
