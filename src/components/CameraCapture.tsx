import { useRef, useState } from 'react'

interface CameraCaptureProps {
  onFileSelected: (file: File) => void
}

export function CameraCapture({ onFileSelected }: CameraCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    onFileSelected(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {previewUrl && (
        <img src={previewUrl} alt="תצוגה מקדימה" className="max-h-40 rounded-lg border border-slate-700" />
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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="px-4 py-2 rounded-full bg-slate-800 text-sm text-slate-100"
        >
          {previewUrl ? 'צילום נוסף' : 'צילום מסמך'}
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="px-4 py-2 rounded-full bg-slate-800 text-sm text-slate-100"
        >
          בחירת תמונה קיימת
        </button>
      </div>
    </div>
  )
}
