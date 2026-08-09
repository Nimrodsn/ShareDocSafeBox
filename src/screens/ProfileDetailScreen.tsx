import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteProfile, getProfile } from '../lib/supabase/profiles'
import { listRecordsForProfile } from '../lib/supabase/records'
import type { ProfileRow, RecordRow } from '../lib/supabase/types'
import { RecordCard } from '../components/RecordCard'
import { ProfileAvatar } from '../components/ProfileAvatar'

export function ProfileDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [records, setRecords] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    Promise.all([getProfile(id), listRecordsForProfile(id)]).then(([p, r]) => {
      setProfile(p)
      setRecords(r)
      setLoading(false)
    })
  }, [id])

  async function handleDeleteProfile() {
    if (!id) return
    if (!confirm('למחוק את הפרופיל וכל הרשומות שלו? הפעולה בלתי הפיכה, ותשפיע על כל חברי הכספת.')) return
    await deleteProfile(id)
    navigate('/', { replace: true })
  }

  if (loading) return <p className="p-6 text-slate-400 text-sm" dir="rtl">טוען…</p>
  if (!profile) return <p className="p-6 text-slate-400 text-sm" dir="rtl">הפרופיל לא נמצא</p>

  return (
    <div className="px-4 py-6 pb-24" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <ProfileAvatar relationship={profile.relationship} name={profile.display_name} />
        <h1 className="text-xl font-bold">{profile.display_name}</h1>
      </div>

      <div className="space-y-3">
        {records.map((r) => (
          <RecordCard key={r.id} record={r} />
        ))}
        {records.length === 0 && (
          <p className="text-slate-400 text-sm">אין עדיין רשומות עבור {profile.display_name}.</p>
        )}
      </div>

      <Link
        to={`/profile/${id}/record/new`}
        className="mt-4 block text-center w-full py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 text-sm"
      >
        + הוספת רשומה
      </Link>

      <button onClick={handleDeleteProfile} className="mt-8 text-xs text-red-400 underline">
        מחיקת הפרופיל
      </button>
    </div>
  )
}
