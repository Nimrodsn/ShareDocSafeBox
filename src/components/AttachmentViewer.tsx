import { useEffect, useRef, useState } from 'react'
import { downloadAttachmentBlob, isImageAttachment } from '../lib/supabase/attachments'
import type { AttachmentRow } from '../lib/supabase/types'
import { debugLog } from '../lib/debugLog'

interface AttachmentViewerProps {
  attachment: AttachmentRow
  onDelete?: () => void
}

export function AttachmentViewer({ attachment, onDelete }: AttachmentViewerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  function revokeObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  async function loadBlob() {
    setLoading(true)
    setError(null)
    setImageFailed(false)
    revokeObjectUrl()
    setUrl(null)

    const result = await downloadAttachmentBlob(attachment.storage_path)
    debugLog(
      'AttachmentViewer:loadBlob',
      'viewer load result',
      {
        attachmentId: attachment.id,
        mimeType: attachment.mime_type,
        isImage: isImageAttachment(attachment.mime_type, attachment.original_filename),
        hasBlob: !!result.blob,
        error: result.error,
      },
      'D',
    )
    if (result.blob) {
      const objectUrl = URL.createObjectURL(result.blob)
      objectUrlRef.current = objectUrl
      setUrl(objectUrl)
    } else {
      setError(result.error ?? 'לא ניתן לטעון את המסמך')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadBlob()
    return () => revokeObjectUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.storage_path])

  const isImage = isImageAttachment(attachment.mime_type, attachment.original_filename)
  const showAsImage = isImage && !imageFailed

  return (
    <div className="relative rounded-lg border border-slate-800 bg-slate-900 overflow-hidden min-h-[120px]">
      {loading && (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">טוען…</div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-2 h-32 p-3">
          <p className="text-red-400 text-xs text-center">{error}</p>
          <button type="button" onClick={loadBlob} className="text-emerald-400 text-xs underline">
            נסו שוב
          </button>
        </div>
      )}

      {!loading && url && showAsImage && (
        <button type="button" onClick={() => window.open(url, '_blank')} className="block w-full">
          <img
            src={url}
            alt="מסמך"
            className="w-full rounded-lg"
            onError={() => setImageFailed(true)}
          />
        </button>
      )}

      {!loading && url && (!showAsImage || imageFailed) && (
        <div className="flex flex-col items-center justify-center gap-2 h-32 p-3">
          <p className="text-slate-400 text-xs truncate max-w-full">{attachment.original_filename}</p>
          {imageFailed && (
            <p className="text-slate-500 text-xs text-center">לא ניתן להציג תצוגה מקדימה — פתחו את הקובץ</p>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-sm underline">
            פתיחה / הורדה
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
