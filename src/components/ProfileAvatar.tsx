const RELATIONSHIP_EMOJI: Record<string, string> = {
  self: '🧑',
  spouse: '💑',
  son: '👦',
  daughter: '👧',
  other: '👤',
}

export function ProfileAvatar({ relationship, name }: { relationship: string; name: string }) {
  return (
    <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0">
      <span aria-hidden>{RELATIONSHIP_EMOJI[relationship] ?? '👤'}</span>
      <span className="sr-only">{name}</span>
    </div>
  )
}
