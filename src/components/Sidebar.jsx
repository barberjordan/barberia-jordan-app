import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, Scissors,
  Calendar, BarChart2, Settings, LogOut, SlidersHorizontal,
  Vault, Receipt
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
  { to: '/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
]

export default function Sidebar({ open }) {
  const { logout } = useAuth()

  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${
        open ? 'w-56' : 'w-16'
      } shrink-0`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-slate-700 shrink-0 overflow-hidden
        ${open ? 'px-4 py-3 gap-3' : 'justify-center py-3'}`}
      >
        <img
          src="logo.png"
          alt="Jordan"
          className="shrink-0 object-contain"
          style={{ width: open ? 40 : 36, height: open ? 40 : 36 }}
          onError={e => {
            e.target.style.display = 'none'
            e.target.nextSibling && (e.target.nextSibling.style.display = 'flex')
          }}
        />
        {/* Fallback si no hay logo */}
        <div
          className="w-8 h-8 bg-primary-500 rounded-lg items-center justify-center shrink-0 hidden"
          style={{ display: 'none' }}
        >
          <Scissors size={16} className="text-white" />
        </div>
        {open && (
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">Barbería</p>
            <p className="text-primary-400 text-xs font-semibold truncate">Jordan</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {open && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 border-t border-slate-700 pt-4">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-slate-400 hover:bg-slate-800 hover:text-white w-full transition-colors"
        >
          <LogOut size={18} className="shrink-0" />
          {open && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
