import React, { useState, useRef, useEffect } from 'react'
import { Menu, Wifi, WifiOff, RefreshCw, Palette } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSync } from '../context/SyncContext'
import { useTheme, TEMAS } from '../context/ThemeContext'

export default function Navbar({ onToggleSidebar }) {
  const { user } = useAuth()
  const { online, progreso, forzarSync } = useSync()
  const { tema, setTema } = useTheme()
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  // Cierra el picker al hacer click fuera
  useEffect(() => {
    function handler(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Progreso sync */}
        {progreso && (
          <span className="text-xs text-slate-500 animate-pulse">{progreso}</span>
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

        {/* Selector de tema */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(s => !s)}
            title="Cambiar tema de color"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full
              bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Palette size={13} />
            Tema
          </button>

          {showPicker && (
            <div className="absolute right-0 top-9 bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-50 w-44">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2 px-1">Color de acento</p>
              <div className="space-y-1">
                {TEMAS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTema(t.id); setShowPicker(false) }}
                    className={`flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      tema === t.id
                        ? 'bg-slate-100 font-semibold text-slate-800'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.label}
                    {tema === t.id && (
                      <span className="ml-auto text-xs text-slate-400">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Usuario */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.nombre?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-700 leading-none">{user?.nombre}</p>
            <p className="text-slate-400 text-xs capitalize">{user?.rol}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
