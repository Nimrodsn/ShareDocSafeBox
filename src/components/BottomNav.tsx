import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'בית', icon: '🏠' },
  { to: '/search', label: 'חיפוש', icon: '🔍' },
  { to: '/settings', label: 'הגדרות', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-slate-900/95 border-t border-slate-800 flex justify-around py-2 pb-[env(safe-area-inset-bottom)]"
      dir="rtl"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-4 py-1 text-xs ${
              isActive ? 'text-emerald-400' : 'text-slate-400'
            }`
          }
        >
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
