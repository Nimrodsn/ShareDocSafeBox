import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORY_LABELS, createRecord, getRecord, updateRecord } from '../lib/supabase/records'
import { addAttachment } from '../lib/supabase/attachments'
import { CameraCapture } from '../components/CameraCapture'
import type { CategoryType } from '../lib/supabase/types'
import { useVault } from '../lib/state/vaultContext'

const CATEGORY_OPTIONS: { value: CategoryType; label: string }[] = [
  { value: 'id_number', label: CATEGORY_LABELS.id_number },
  { value: 'passport', label: CATEGORY_LABELS.passport },
  { value: 'birth_date', label: CATEGORY_LABELS.birth_date },
  { value: 'drivers_license', label: CATEGORY_LABELS.drivers_license },
  { value: 'custom', label: 'שדה מותאם אישית' },
]

export function RecordAddEditScreen() {
  const { profileId, id } = useParams<{ profileId?: string; id?: string }>()
  const editMode = !!id
  const navigate = useNavigate()
  const { vault } = useVault()

  const [categoryType, setCategoryType] = useState<CategoryType>('id_number')
  const [categoryLabel, setCategoryLabel] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const [notes, setNotes] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [resolvedProfileId, setResolvedProfileId] = useState<string | null>(profileId ?? null)

  useEffect(() => {
    if (!editMode || !id) return
    getRecord(id).then((r) => {
      if (!r) return
      setCategoryType(r.category_type)
      setCategoryLabel(r.category_label)
      setFieldValue(r.field_value)
      setNotes(r.notes ?? '')
      setExpiryDate(r.expiry_date ?? '')
      setResolvedProfileId(r.profile_id)
    })
  }, [editMode, id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fieldValue.trim() || !vault) return
    setSaving(true)
    try {
      let recordId = id
      if (editMode && recordId) {
        await updateRecord(recordId, {
          categoryLabel: categoryType === 'custom' ? categoryLabel || 'שדה מותאם אישית' : undefined,
          fieldValue,
          notes,
          expiryDate,
        })
      } else if (resolvedProfileId) {
        recordId = await createRecord({
          profileId: resolvedProfileId,
          categoryType,
          categoryLabel: categoryType === 'custom' ? categoryLabel : undefined,
          fieldValue,
          notes,
          expiryDate,
        })
      }
      if (recordId) {
        for (const file of pendingFiles) {
          await addAttachment(vault.id, recordId, file)
        }
      }
      navigate(recordId ? `/record/${recordId}` : '/', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-6 pb-24" dir="rtl">
      <h1 className="text-xl font-bold mb-6">{editMode ? 'עריכת רשומה' : 'רשומה חדשה'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!editMode && (
          <div>
            <label className="text-sm text-slate-400 block mb-2">סוג</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setCategoryType(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs ${
                    categoryType === opt.value ? 'bg-emerald-600 text-slate-50' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {categoryType === 'custom' && (
          <div>
            <label className="text-sm text-slate-400 block mb-1">תווית (למשל: כרטיס קופת חולים)</label>
            <input
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
        )}

        <div>
          <label className="text-sm text-slate-400 block mb-1">ערך</label>
          <input
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
            dir="auto"
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 block mb-1">תוקף (אופציונלי)</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 block mb-1">הערות (אופציונלי)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
            rows={2}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 block mb-2">צילום מסמך (אופציונלי)</label>
          <CameraCapture onFileSelected={(f) => setPendingFiles((prev) => [...prev, f])} />
          {pendingFiles.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">{pendingFiles.length} קבצים ימתינו לשמירה</p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !fieldValue.trim()}
          className="w-full py-3 rounded-full bg-emerald-600 text-slate-50 disabled:opacity-40"
        >
          {saving ? 'שומר…' : 'שמירה'}
        </button>
      </form>
    </div>
  )
}
