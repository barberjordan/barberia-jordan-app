import React, { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** Formatea un número al estilo es-AR (sin símbolo $) */
export function fmtNum(n) {
  return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Modo privacidad: oculta todos los montos en pantalla.
 * Cada pantalla usa su propia clave (se recuerda entre sesiones).
 *
 *   const { oculto, toggle, money } = usePrivacidad('priv_dashboard')
 *   <p>{money(total)}</p>   // → "$1.234,00"  ó  "$ ••••••"
 */
export function usePrivacidad(storageKey = 'priv') {
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(storageKey, oculto ? '1' : '0') } catch { /* ignore */ }
  }, [oculto, storageKey])

  const toggle = useCallback(() => setOculto(o => !o), [])

  const money = useCallback(
    n => (oculto ? '$ ••••••' : `$${fmtNum(n)}`),
    [oculto]
  )

  return { oculto, setOculto, toggle, money }
}

/** Botón con icono de ojo para activar/desactivar el modo privacidad */
export function BotonPrivacidad({ oculto, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={oculto ? 'Mostrar montos' : 'Ocultar montos (clientes curiosos)'}
      aria-label={oculto ? 'Mostrar montos' : 'Ocultar montos'}
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition ${
        oculto
          ? 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      } ${className}`}
    >
      {oculto ? <EyeOff size={16} /> : <Eye size={16} />}
      <span>{oculto ? 'Mostrar' : 'Ocultar'}</span>
    </button>
  )
}

/** Envuelve un gráfico: lo difumina cuando el modo privacidad está activo */
export function BlurPrivado({ oculto, children, height }) {
  if (!oculto) return children
  return (
    <div className="relative" style={height ? { minHeight: height } : undefined}>
      <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/90 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
          <EyeOff size={13} /> Montos ocultos
        </span>
      </div>
    </div>
  )
}
