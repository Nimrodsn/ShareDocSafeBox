import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteRecord, getRecordWithAttachments } from '../lib/supabase/records'
import { deleteAttachment, listStorageFilesForRecord } from '../lib/supabase/attachments'
import { AttachmentViewer } from '../components/AttachmentViewer'
import { useAuth } from '../lib/state/authContext'
import type { AttachmentRow, RecordRow } from '../lib/supabase/types'
import { debugLog } from '../lib/debugLog'

const CLIPBOARD_CLEAR_MS = 20_000

export function RecordDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const [record, setRecord] = useState<RecordRow | null>(null)
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null)
  const [recordLoading, setRecordLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null)
  const navigate = useNavigate()
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

  const loadRecord = useCallback(async () => {
    debugLog(
      'RecordDetailScreen:loadRecord',
      'loadRecord called',
      { recordId: id ?? null, hasSession: !!session },
      'E',
    )
    if (!id || !session) return
    setRecordLoading(true)
    setAttachmentsLoading(true)
    setAttachmentsError(null)
    try {
      const { record: r, attachments: a } = await getRecordWithAttachments(id)
      setRecord(r)
      setAttachments(a)

      let storageFiles: { name: string }[] = []
      let storageError: string | null = null
      if (debugMode && r) {
        const storage = await listStorageFilesForRecord(r.vault_id, id)
        storageFiles = storage.files
        storageError = storage.error
      }

      const info = {
        recordId: id,
        hasAttachmentsFlag: r?.has_attachments ?? null,
        attachmentCount: a.length,
        showSection: !!(r?.has_attachments || a.length > 0),
        storageFileCount: storageFiles.length,
        storageError,
        storageFileNames: storageFiles.map((f) => f.name),
      }
      setDebugInfo(info)
      debugLog('RecordDetailScreen:loadRecord', 'loadRecord success', info, 'A')
    } catch (err) {
      debugLog(
        'RecordDetailScreen:loadRecord',
        'loadRecord failed',
        { recordId: id, error: err instanceof Error ? err.message : 'unknown' },
        'B',
      )
      setAttachmentsError('לא ניתן לטעון את המסמכים')
    } finally {
      setRecordLoading(false)
      setAttachmentsLoading(false)
    }
  }, [id, session, debugMode])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

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
    if (attId.startsWith('storage-')) return
    await deleteAttachment(attId)
    setAttachments((prev) => prev.filter((a) => a.id !== attId))
    if (record) {
      setRecord({ ...record, has_attachments: attachments.length > 1 })
    }
  }

  async function handleDeleteRecord() {
    if (!id) return
    if (!confirm('למחוק את הרשומה? הפעולה תשפיע על כל חברי הכספת.')) return
    await deleteRecord(id)
    navigate(-1)
  }

  if (recordLoading) return <p className="p-6 text-slate-400 text-sm" dir="rtl">טוען…</p>
  if (!record) return <p className="p-6 text-slate-400 text-sm" dir="rtl">הרשומה לא נמצאה</p>

  const showAttachmentsSection =
    record.has_attachments || attachments.length > 0 || attachmentsLoading

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

      {showAttachmentsSection && (
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-2">קבצים מצורפים</p>

          {attachmentsLoading && (
            <p className="text-slate-500 text-sm">טוען מסמכים…</p>
          )}

          {!attachmentsLoading && attachmentsError && (
            <div className="flex flex-col gap-2">
              <p className="text-red-400 text-sm">{attachmentsError}</p>
              <button type="button" onClick={loadRecord} className="text-emerald-400 text-sm underline text-right">
                נסו שוב
              </button>
            </div>
          )}

          {!attachmentsLoading && !attachmentsError && attachments.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {attachments.map((a) => (
                <AttachmentViewer
                  key={a.id}
                  attachment={a}
                  onDelete={a.id.startsWith('storage-') ? undefined : () => handleDeleteAttachment(a.id)}
                />
              ))}
            </div>
          )}

          {!attachmentsLoading && !attachmentsError && attachments.length === 0 && record.has_attachments && (
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm space-y-2">
              <p className="text-amber-300">המסמך לא נמצא — ייתכן שההעלאה נכשלה.</p>
              <Link to={`/record/${id}/edit`} className="text-emerald-400 underline">
                העלאת מסמך מחדש
              </Link>
            </div>
          )}
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

      {debugMode && debugInfo && (
        <pre className="mt-6 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 overflow-x-auto" dir="ltr">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </div>
  )
}
