import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteRecord, getRecord } from '../lib/supabase/records'
import { deleteAttachment, getAttachmentSignedUrl, listAttachments } from '../lib/supabase/attachments'
import type { AttachmentRow, RecordRow } from '../lib/supabase/types'

const CLIPBOARD_CLEAR_MS = 20_000

export function RecordDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const [record, setRecord] = useState<RecordRow | null>(null)
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    getRecord(id).then(setRecord)
    listAttachments(id).then(setAttachments)
  }, [id])

  useEffect(() => {
    async function loadUrls() {
      const entries = await Promise.all(
        attachments.map(async (a) => [a.id, await getAttachmentSignedUrl(a.storage_path)] as const),
      )
      const map: Record<string, string> = {}
      for (const [attId, url] of entries) {
        if (url) map[attId] = url
      }
      setAttachmentUrls(map)
    }
    if (attachments.length > 0) loadUrls()
  }, [attachments])

  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current)
  }, [])

  async function handleCopy() {
    if (!record) return
    await navigator.clipboard.writeText(record.field_value)
    setCopied(true)
    if (clearTimer.current) clearTimeout(clearTimer.current)
    clearTimer.current = setTimeout(async () => {
      try {
        const current = await navigator.clipboard.readText()
        if (current === record.field_value) await navigator.clipboard.writeText('')
      } catch {
        // clipboard read permission denied - nothing we can do silently
      }
      setCopied(false)
    }, CLIPBOARD_CLEAR_MS)
  }

  async function handleDeleteAttachment(attId: string) {
    await deleteAttachment(attId)
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
  }

  async function handleDeleteRecord() {
    if (!id) return
    if (!confirm('למחוק את הרשומה? הפעולה תשפיע על כל חברי הכספת.')) return
    await deleteRecord(id)
    navigate(-1)
  }

  if (!record) return <p className="p-6 text-slate-400 text-sm" dir="rtl">טוען…</p>

  return (
    <div className="px-4 py-6 pb-24" dir="rtl">
      <h1 className="text-xl font-bold mb-1">{record.category_label}</h1>
      {record.expiry_date && <p className="text-xs text-slate-500 mb-4">בתוקף עד {record.expiry_date}</p>}

      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-4">
        <p className="text-2xl font-mono tracking-wide break-all" dir="ltr">
          {record.field_value}
        </p>
        <button onClick={handleCopy} className="mt-3 text-sm text-emerald-400">
          {copied ? 'הועתק! ינוקה אוטומטית' : 'העתקה ללוח'}
        </button>
      </div>

      {record.notes && (
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-1">הערות</p>
          <p className="text-sm">{record.notes}</p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-2">קבצים מצורפים</p>
          <div className="grid grid-cols-2 gap-3">
            {attachments.map((a) => (
              <div key={a.id} className="relative">
                {attachmentUrls[a.id] && (
                  <img src={attachmentUrls[a.id]} alt="מסמך" className="rounded-lg border border-slate-800 w-full" />
                )}
                <button
                  onClick={() => handleDeleteAttachment(a.id)}
                  className="absolute top-1 left-1 bg-slate-900/80 text-red-400 rounded-full h-6 w-6 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Link to={`/record/${id}/edit`} className="flex-1 text-center py-2 rounded-full bg-slate-800 text-sm">
          עריכה
        </Link>
        <button onClick={handleDeleteRecord} className="flex-1 py-2 rounded-full bg-red-900/40 text-red-300 text-sm">
          מחיקה
        </button>
      </div>
    </div>
  )
}
