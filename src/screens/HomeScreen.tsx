import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProfile, listProfiles } from '../lib/supabase/profiles'
import { listAllRecords } from '../lib/supabase/records'
import type { ProfileRow, RelationshipTag } from '../lib/supabase/types'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { useVault } from '../lib/state/vaultContext'

const RELATIONSHIP_OPTIONS: { value: RelationshipTag; label: string }[] = [
  { value: 'self', label: 'אני' },
  { value: 'spouse', label: 'בן/בת זוג' },
  { value: 'son', label: 'בן' },
  { value: 'daughter', label: 'בת' },
  { value: 'other', label: 'אחר' },
]

export function HomeScreen() {
  const { vault } = useVault()
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState<RelationshipTag>('self')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function reload() {
    if (!vault) return
    setLoading(true)
    const [profileList, records] = await Promise.all([listProfiles(vault.id), listAllRecords(vault.id)])
    setProfiles(profileList)
    const counts: Record<string, number> = {}
    for (const r of records) counts[r.profile_id] = (counts[r.profile_id] ?? 0) + 1
    setRecordCounts(counts)
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault?.id])

  async function handleAddProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !vault) return
    const id = await createProfile({ vaultId: vault.id, displayName: name.trim(), relationship })
    setName('')
    setShowAddForm(false)
    await reload()
    navigate(`/profile/${id}`)
  }

  return (
    <div className="px-4 py-6 pb-24" dir="rtl">
      <h1 className="text-xl font-bold mb-4">{vault?.name ?? 'הכספת שלנו'}</h1>

      {loading && <p className="text-slate-400 text-sm">טוען…</p>}

      {!loading && profiles.length === 0 && !showAddForm && (
        <div className="text-center text-slate-400 text-sm mt-12 space-y-4">
          <p>עדיין אין פרופילים. נתחיל עם "אני".</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2 rounded-full bg-emerald-600 text-slate-50"
          >
            הוספת פרופיל ראשון
          </button>
        </div>
      )}

      <div className="space-y-3">
        {profiles.map((p) => (
          <Link
            key={p.id}
            to={`/profile/${p.id}`}
            className="flex items-center gap-3 bg-slate-900 rounded-xl p-3 border border-slate-800"
          >
            <ProfileAvatar relationship={p.relationship} name={p.display_name} />
            <div className="flex-1">
              <p className="font-medium">{p.display_name}</p>
              <p className="text-xs text-slate-400">{recordCounts[p.id] ?? 0} רשומות</p>
            </div>
          </Link>
        ))}
      </div>

      {profiles.length > 0 && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-4 w-full py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 text-sm"
        >
          + הוספת בן משפחה
        </button>
      )}

      {showAddForm && (
        <form onSubmit={handleAddProfile} className="mt-4 bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם (למשל: דני)"
            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setRelationship(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  relationship === opt.value ? 'bg-emerald-600 text-slate-50' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 rounded-full bg-emerald-600 text-slate-50 text-sm">
              שמירה
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-full text-slate-400 text-sm"
            >
              ביטול
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
