import { useState } from 'react'

const MAX_LEN = 8
const MIN_LEN = 4

interface PinPadProps {
  onSubmit: (pin: string) => void
  error?: string | null
  disabled?: boolean
  submitLabel?: string
}

export function PinPad({ onSubmit, error, disabled, submitLabel = 'אישור' }: PinPadProps) {
  const [pin, setPin] = useState('')
  const [visible, setVisible] = useState(false)

  function pressDigit(d: string) {
    if (disabled || pin.length >= MAX_LEN) return
    setPin((p) => p + d)
  }

  function backspace() {
    if (disabled) return
    setPin((p) => p.slice(0, -1))
  }

  function submit() {
    if (disabled || pin.length < MIN_LEN) return
    onSubmit(pin)
    setPin('')
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xs mx-auto" dir="ltr">
      <div className="flex items-center gap-3">
        <div className="flex gap-3" aria-label="ספרות שהוזנו">
          {visible
            ? Array.from({ length: MAX_LEN }).map((_, i) => (
                <span
                  key={i}
                  className={`w-3 text-center text-sm font-mono ${
                    i < pin.length ? 'text-slate-100' : 'text-transparent'
                  }`}
                >
                  {pin[i] ?? '0'}
                </span>
              ))
            : Array.from({ length: MAX_LEN }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full border border-slate-400 ${
                    i < pin.length ? 'bg-slate-100' : 'bg-transparent'
                  }`}
                />
              ))}
        </div>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? 'הסתרת הקוד' : 'הצגת הקוד'}
          aria-pressed={visible}
          className="text-slate-400 text-lg disabled:opacity-40"
        >
          {visible ? '🙈' : '👁️'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm text-center" dir="rtl">{error}</p>}

      <div className="grid grid-cols-3 gap-4 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => pressDigit(d)}
            disabled={disabled}
            className="h-16 rounded-full bg-slate-800 text-2xl text-slate-100 active:bg-slate-700 disabled:opacity-40"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={backspace}
          disabled={disabled}
          className="h-16 rounded-full text-slate-300 text-lg active:bg-slate-800 disabled:opacity-40"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={() => pressDigit('0')}
          disabled={disabled}
          className="h-16 rounded-full bg-slate-800 text-2xl text-slate-100 active:bg-slate-700 disabled:opacity-40"
        >
          0
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={disabled || pin.length < MIN_LEN}
          className="h-16 rounded-full bg-emerald-600 text-slate-50 text-sm active:bg-emerald-500 disabled:opacity-30"
          dir="rtl"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
