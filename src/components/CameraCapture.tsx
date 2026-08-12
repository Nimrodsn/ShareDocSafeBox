import { useRef, useState } from 'react'
import { useLock } from '../lib/state/lockContext'
import { isPdfAttachment } from '../lib/supabase/attachments'

interface CameraCaptureProps {
  onFileSelected: (file: File) => void
}

export function CameraCapture({ onFileSelected }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const { suspendLock, resumeLock } = useLock()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0]
      if (!file) return
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (isPdfAttachment(file.type, file.name)) {
        setPreviewUrl(null)
        setPdfName(file.name)
      } else {
        setPdfName(null)
        setPreviewUrl(URL.createObjectURL(file))
      }
      onFileSelected(file)
      e.target.value = ''
    } finally {
      resumeLock()
    }
  }

  function openInput(ref: React.RefObject<HTMLInputElement | null>) {
    suspendLock()
    ref.current?.click()
    window.addEventListener('focus', () => resumeLock(), { once: true })
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {previewUrl && (
        <img src={previewUrl} alt="תצוגה מקדימה" className="max-h-40 rounded-lg border border-slate-700" />
      )}
      {pdfName && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 max-w-full">
          <span>📄</span>
          <span className="text-xs text-slate-300 truncate">{pdfName}</span>
        </div>
      )}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => openInput(cameraInputRef)}
          className="px-4 py-2 rounded-full bg-slate-800 text-sm text-slate-100"
        >
          {previewUrl ? 'צילום נוסף' : 'צילום מסמך'}
        </button>
        <button
          type="button"
          onClick={() => openInput(galleryInputRef)}
          className="px-4 py-2 rounded-full bg-slate-800 text-sm text-slate-100"
        >
          בחירת תמונה קיימת
        </button>
        <button
          type="button"
          onClick={() => openInput(pdfInputRef)}
          className="px-4 py-2 rounded-full bg-slate-800 text-sm text-slate-100"
        >
          בחירת קובץ PDF
        </button>
      </div>
    </div>
  )
}
