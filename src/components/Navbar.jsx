import React from 'react'
import { Menu, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSync } from '../context/SyncContext'

export default function Navbar({ onToggleSidebar }) {
  const { user } = useAuth()
  const { online, progreso, forzarSync } = useSync()

  return (
    <header
      className="px-6 py-3 flex items-center justify-between shrink-0 border-b"
      style={{
        backgroundColor: 'var(--navbar-bg)',
        borderColor: 'var(--navbar-border)',
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Progreso sync */}
        {progreso && (
          <span className="text-xs animate-pulse" style={{ color: 'var(--text-secondary)' }}>
            {progreso}
          </span>
        )}

        {/* Estado online */}
        <button
          onClick={forzarSync}
          title={online ? 'Online - Click para sincronizar' : 'Sin conexión - datos guardados localmente'}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            online
              ? 'bg-green-50 text-green-600 hover:bg-green-100'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {online ? <><Wifi size={12} /> Online</> : <><WifiOff size={12} /> Offline</>}
          <RefreshCw size={11} />
        </button>

        {/* Usuario */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--p-500))' }}>
            <span className="text-white text-xs font-bold">
              {user?.nombre?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-sm">
            <p className="font-medium leading-none" style={{ color: 'var(--text-primary)' }}>{user?.nombre}</p>
            <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{user?.rol}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
