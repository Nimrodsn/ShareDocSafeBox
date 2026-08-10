import { useEffect, useState } from 'react'
import { getAttachmentSignedUrl } from '../lib/supabase/attachments'
import type { AttachmentRow } from '../lib/supabase/types'

interface AttachmentViewerProps {
  attachment: AttachmentRow
  onDelete?: () => void
}

export function AttachmentViewer({ attachment, onDelete }: AttachmentViewerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadUrl() {
    setLoading(true)
    setError(null)
    const result = await getAttachmentSignedUrl(attachment.storage_path)
    if (result.url) {
      setUrl(result.url)
    } else {
      setUrl(null)
      setError(result.error ?? 'לא ניתן לטעון את המסמך')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.storage_path])

  const isImage = attachment.mime_type.startsWith('image/')

  return (
    <div className="relative rounded-lg border border-slate-800 bg-slate-900 overflow-hidden min-h-[120px]">
      {loading && (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">טוען…</div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-2 h-32 p-3">
          <p className="text-red-400 text-xs text-center">{error}</p>
          <button type="button" onClick={loadUrl} className="text-emerald-400 text-xs underline">
            נסו שוב
          </button>
        </div>
      )}

      {!loading && url && isImage && (
        <button type="button" onClick={() => window.open(url, '_blank')} className="block w-full">
          <img src={url} alt="מסמך" className="w-full rounded-lg" />
        </button>
      )}

      {!loading && url && !isImage && (
        <div className="flex flex-col items-center justify-center gap-2 h-32 p-3">
          <p className="text-slate-400 text-xs truncate max-w-full">{attachment.original_filename}</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-sm underline">
            הורדה / צפייה
          </a>
        </div>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-1 left-1 bg-slate-900/80 text-red-400 rounded-full h-6 w-6 text-xs"
        >
          ✕
        </button>
      )}
    </div>
  )
}
