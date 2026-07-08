import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, Scissors,
  Calendar, BarChart2, Settings, LogOut, SlidersHorizontal,
  Vault, Receipt, Palette
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard',     icon: LayoutDashboard,   label: 'Dashboard' },
  { to: '/citas',         icon: Calendar,          label: 'Citas' },
  { to: '/caja',          icon: Vault,             label: 'Caja' },
  { to: '/gastos',        icon: Receipt,           label: 'Gastos' },
  { to: '/clientes',      icon: Users,             label: 'Clientes' },
  { to: '/barberos',      icon: UserCheck,         label: 'Barberos' },
  { to: '/servicios',     icon: Scissors,          label: 'Servicios' },
  { to: '/reportes',      icon: BarChart2,         label: 'Reportes' },
  { to: '/usuarios',      icon: Settings,          label: 'Usuarios' },
  { to: '/temas',         icon: Palette,           label: 'Temas' },
  { to: '/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
]

export default function Sidebar({ open }) {
  const { logout } = useAuth()

  return (
    <aside
      className="text-white flex flex-col transition-all duration-300 shrink-0"
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        width: open ? 224 : 64,
      }}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-white/10 shrink-0 overflow-hidden
        ${open ? 'px-4 py-3 gap-3' : 'justify-center py-3'}`}
      >
        <img
          src="logo.png"
          alt="Jordan"
          className="shrink-0 object-contain"
          style={{ width: open ? 40 : 36, height: open ? 40 : 36 }}
          onError={e => {
            e.target.style.display = 'none'
          }}
        />
        {/* Fallback si no hay logo */}
        <div
          className="w-8 h-8 rounded-lg items-center justify-center shrink-0 hidden"
          style={{ backgroundColor: 'rgb(var(--p-500))' }}
        >
          <Scissors size={16} className="text-white" />
        </div>
        {open && (
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate text-white">Barbería</p>
            <p className="text-xs font-semibold truncate" style={{ color: 'rgb(var(--p-400))' }}>Jordan</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium${isActive ? ' active' : ''}`
            }
          >
            <Icon size={18} className="shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 border-t border-white/10 pt-3">
        <button
          onClick={logout}
          className="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {open && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
