import { Link } from 'react-router-dom'
import type { RecordRow } from '../lib/supabase/types'

const CATEGORY_ICON: Record<string, string> = {
  id_number: '🪪',
  passport: '📘',
  birth_date: '🎂',
  drivers_license: '🚗',
  custom: '📎',
}

export function RecordCard({ record }: { record: RecordRow }) {
  return (
    <Link
      to={`/record/${record.id}`}
      className="flex items-center gap-3 bg-slate-900 rounded-xl p-3 border border-slate-800"
    >
      <span className="text-xl">{CATEGORY_ICON[record.category_type] ?? '📎'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{record.category_label}</p>
        <p className="text-xs text-slate-500">•••• (הצג בפרטי הרשומה)</p>
      </div>
      {record.has_attachments && <span title="יש קובץ מצורף">📷</span>}
    </Link>
  )
}
