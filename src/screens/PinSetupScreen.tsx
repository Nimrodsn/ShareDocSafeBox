import { useState } from 'react'
import { PinPad } from '../components/PinPad'
import { setupLocalPin } from '../lib/localPin/pinStorage'
import { useAuth } from '../lib/state/authContext'
import { useLock } from '../lib/state/lockContext'

type Step = 'create' | 'confirm' | 'error'

export function PinSetupScreen() {
  const { user } = useAuth()
  const { unlock } = useLock()
  const [step, setStep] = useState<Step>('create')
  const [firstPin, setFirstPin] = useState('')

  function handleCreate(pin: string) {
    setFirstPin(pin)
    setStep('confirm')
  }

  async function handleConfirm(pin: string) {
    if (pin !== firstPin || !user) {
      setStep('error')
      return
    }
    await setupLocalPin(user.id, pin)
    unlock()
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-8 px-6 py-12" dir="rtl">
      <div className="text-center space-y-2 max-w-sm">
        <h1 className="text-lg font-semibold">הגדרת קוד נעילה מהיר</h1>
        <p className="text-slate-400 text-sm">
          זו נוחות בלבד למכשיר הזה - החשבון שלכם כבר מאובטח באימייל וסיסמה.
        </p>
      </div>

      {step === 'create' && <PinPad onSubmit={handleCreate} submitLabel="המשך" />}
      {step === 'confirm' && <PinPad onSubmit={handleConfirm} submitLabel="אישור" />}
      {step === 'error' && (
        <div className="space-y-4 text-center">
          <p className="text-red-400 text-sm">הקודים לא תואמים, ננסה שוב</p>
          <PinPad onSubmit={handleCreate} submitLabel="המשך" />
        </div>
      )}
    </div>
  )
}
