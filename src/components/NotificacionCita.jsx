import React, { useEffect, useState, useRef } from 'react'
import { Scissors, X, User, Clock } from 'lucide-react'

/**
 * Muestra una notificación grande animada cuando un barbero registra una cita nueva.
 * Recibe un array `notificaciones` y muestra sólo la primera; al cerrarla llama a `onDismiss`.
 * Auto-dismiss a los 12 segundos.
 */
export default function NotificacionCita({ notificaciones = [], onDismiss }) {
  const cita = notificaciones[0] || null
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(100)
  const timerRef    = useRef(null)
  const intervalRef = useRef(null)
  const prevIdRef   = useRef(null)

  // Cuando llega una cita nueva, disparar animación de entrada
  useEffect(() => {
    if (!cita) {
      setVisible(false)
      return
    }
    if (cita.id === prevIdRef.current) return  // misma notificación, no reiniciar
    prevIdRef.current = cita.id

    setVisible(true)
    setProgress(100)

    // Limpiar timers anteriores
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)

    // Barra de progreso: decrece 100 → 0 en 12 s
    const DURATION = 12000
    const TICK     = 100
    const steps    = DURATION / TICK
    let current    = steps

    intervalRef.current = setInterval(() => {
      current -= 1
      setProgress((current / steps) * 100)
      if (current <= 0) clearInterval(intervalRef.current)
    }, TICK)

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      handleDismiss()
    }, DURATION)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(intervalRef.current)
    }
  }, [cita?.id])

  function handleDismiss() {
    setVisible(false)
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)
    // Esperar que termine la animación de salida antes de sacar del array
    setTimeout(() => {
      onDismiss?.()
    }, 350)
  }

  if (!cita) return null

  const hora = cita.hora?.slice(0, 5) || ''
  const precio = cita.precio_total
    ? `$${Number(cita.precio_total).toLocaleString('es-AR')}`
    : ''

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] flex items-start justify-center"
      style={{ paddingTop: '1.25rem' }}
    >
      <div
        className="pointer-events-auto w-full max-w-lg mx-4"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(-120%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          borderRadius: '1rem',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,165,0,0.3), 0 0 40px rgba(255,120,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Barra de progreso superior */}
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #ff6b00, #ff9500)',
              transition: 'width 0.1s linear',
              borderRadius: '2px',
            }}
          />
        </div>

        <div className="p-5">
          {/* Cabecera */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                style={{
                  background: 'linear-gradient(135deg, #ff6b00, #ff9500)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  animation: 'pulse-orange 2s ease-in-out infinite',
                }}
              >
                <Scissors size={18} color="white" />
              </div>
              <div>
                <p style={{ color: '#ff9500', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                  Nueva cita registrada
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem', margin: 0 }}>
                  Ahora mismo
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Barbero → Cliente */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '0.75rem',
              padding: '0.9rem 1rem',
              marginBottom: '0.75rem',
              border: '1px solid rgba(255,165,0,0.15)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <User size={14} color="#ff9500" />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 500 }}>
                Barbero
              </span>
            </div>
            <p style={{ color: 'white', fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem 0', lineHeight: 1.2 }}>
              {cita.barbero_nombre || '—'}
            </p>

            {/* Flecha */}
            <div style={{ color: '#ff9500', fontSize: '1.1rem', margin: '0.15rem 0', opacity: 0.8 }}>↓</div>

            <div className="flex items-center gap-2 mb-1">
              <User size={14} color="#60a5fa" />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 500 }}>
                Cliente
              </span>
            </div>
            <p style={{ color: 'white', fontSize: '1.35rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
              {cita.cliente_nombre || '—'}
            </p>
          </div>

          {/* Detalle: servicio + hora + precio */}
          <div className="flex gap-2">
            <div
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '0.6rem',
                padding: '0.55rem 0.75rem',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Servicio</p>
              <p style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
                {cita.servicio_nombre || '—'}
              </p>
            </div>
            {hora && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '0.6rem',
                  padding: '0.55rem 0.75rem',
                  border: '1px solid rgba(255,255,255,0.07)',
                  minWidth: '5rem',
                }}
              >
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hora</p>
                <p style={{ color: '#60a5fa', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>
                  {hora}
                </p>
              </div>
            )}
            {precio && (
              <div
                style={{
                  background: 'rgba(255,165,0,0.08)',
                  borderRadius: '0.6rem',
                  padding: '0.55rem 0.75rem',
                  border: '1px solid rgba(255,165,0,0.2)',
                  minWidth: '5rem',
                }}
              >
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
                <p style={{ color: '#ff9500', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>
                  {precio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Animación pulso en CSS */}
        <style>{`
          @keyframes pulse-orange {
            0%, 100% { box-shadow: 0 0 0 0 rgba(255, 120, 0, 0.5); }
            50%       { box-shadow: 0 0 0 8px rgba(255, 120, 0, 0); }
          }
        `}</style>
      </div>
    </div>
  )
}
