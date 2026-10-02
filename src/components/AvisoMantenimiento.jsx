import React, { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, X, Copy, Check, Server, Clock, WifiOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Aviso de la factura de mantenimiento del sistema (servidor + DB + soporte).
 * Solo lo ve el administrador del negocio, nunca los empleados.
 *
 * No bloquea nada: a lo sumo muestra una barra fija y un recordatorio al abrir.
 * El cliente paga por transferencia y marca "Ya transferí"; la confirmación final
 * la hace el proveedor con su OWNER_KEY desde el servidor.
 */

const ESTILOS = {
  aviso:    { bg: '#f59e0b', texto: '#1f1300', titulo: 'Mantenimiento del sistema' },
  urgente:  { bg: '#f97316', texto: '#1f0f00', titulo: 'Mantenimiento por vencer' },
  critico:  { bg: '#ef4444', texto: '#ffffff', titulo: 'Mantenimiento vence pronto' },
  vencida:  { bg: '#b91c1c', texto: '#ffffff', titulo: 'Mantenimiento vencido' },
  informado:{ bg: '#2563eb', texto: '#ffffff', titulo: 'Pago informado' },
}

const REFRESCO_MS = 6 * 60 * 60 * 1000   // 6 h

const plata = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`

const nDias = (n) => `${n} ${Math.abs(n) === 1 ? 'día' : 'días'}`

const fechaLarga = (iso) => iso
  ? new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
  : ''

const periodoLargo = (p) => {
  if (!p || p.length !== 7) return p || ''
  const [a, m] = p.split('-')
  const nombre = new Date(Number(a), Number(m) - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long' })
  return `${nombre} ${a}`
}

export default function AvisoMantenimiento() {
  const { user } = useAuth()
  const esAdmin = user?.rol === 'admin'

  const [estado, setEstado]     = useState(null)
  const [modal, setModal]       = useState(false)
  const [ocultoHoy, setOculto]  = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setError]  = useState('')
  const [copiado, setCopiado]   = useState(false)

  const cargar = useCallback(async () => {
    if (!window.api?.mantenimiento) return
    try {
      const data = await window.api.mantenimiento.estado()
      setEstado(data)
      setOculto(!!data?.oculto_hoy)
      // Recordatorio al abrir la app cuando ya está por vencer o vencido
      if (data && !data.al_dia && !data.oculto_hoy &&
          ['critico', 'vencida'].includes(data.nivel) &&
          data.factura?.estado !== 'pago_informado') {
        setModal(true)
      }
    } catch {
      // Sin red y sin cache: no mostramos nada antes que mostrar algo incorrecto
    }
  }, [])

  useEffect(() => {
    if (!esAdmin) return
    cargar()
    const id = setInterval(cargar, REFRESCO_MS)
    return () => clearInterval(id)
  }, [esAdmin, cargar])

  async function informarPago() {
    setEnviando(true)
    setError('')
    const res = await window.api.mantenimiento.informarPago({ metodo: 'transferencia' })
    setEnviando(false)
    if (res?.ok) {
      await cargar()
      setModal(false)
    } else {
      setError(res?.error || 'No se pudo avisar. Revisá la conexión e intentá de nuevo.')
    }
  }

  async function recordarMañana() {
    await window.api.mantenimiento.ocultarHoy()
    setOculto(true)
    setModal(false)
  }

  async function copiarDatos() {
    try {
      await navigator.clipboard.writeText(estado.datos_pago)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* el portapapeles puede fallar; el dato queda visible igual */ }
  }

  if (!esAdmin || !estado || estado.al_dia || !estado.factura) return null

  const f          = estado.factura
  const informado  = f.estado === 'pago_informado'
  const nivel      = informado ? 'informado' : estado.nivel
  const st         = ESTILOS[nivel] || ESTILOS.aviso
  const dias       = f.dias_restantes

  // A nivel "aviso" el cliente puede sacarse la barra por el día.
  // De "urgente" en adelante la barra queda fija y "recordar mañana" solo
  // evita que se vuelva a abrir el modal.
  const barraOcultable = nivel === 'aviso' || informado
  if (ocultoHoy && barraOcultable) return null

  const resumen = informado
    ? `Avisaste el pago de ${periodoLargo(f.periodo)}. Queda pendiente de confirmación.`
    : f.vencida
      ? `Venció el ${fechaLarga(f.vence_el)}${dias < -1 ? ` (hace ${nDias(Math.abs(dias))})` : ''}`
      : dias === 0
        ? 'Vence hoy'
        : `Vence en ${nDias(dias)} · ${fechaLarga(f.vence_el)}`

  return (
    <>
      {/* ── Barra ───────────────────────────────────────────── */}
      <div style={{ background: st.bg, color: st.texto, flexShrink: 0 }}>
        <div className="flex items-center gap-3 px-4 py-2">
          {informado
            ? <Check size={17} style={{ flexShrink: 0 }} />
            : <AlertTriangle size={17} style={{ flexShrink: 0 }} />}

          <p className="text-sm m-0" style={{ flex: 1, minWidth: 0 }}>
            <strong>{st.titulo}</strong>
            <span style={{ opacity: 0.85 }}> — {resumen} · {plata(f.monto)}</span>
            {estado.pendientes > 1 && (
              <span style={{ opacity: 0.85 }}>
                {' '}· {estado.pendientes} meses sin pagar ({plata(estado.deuda_total)})
              </span>
            )}
          </p>

          {estado.desde_cache && (
            <span title="Sin conexión al servidor: último dato conocido"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8, fontSize: 11 }}>
              <WifiOff size={13} /> sin conexión
            </span>
          )}

          <button onClick={() => setModal(true)}
            style={{
              background: 'rgba(255,255,255,0.22)', color: st.texto, border: 'none',
              borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0,
            }}>
            Ver detalle
          </button>

          {barraOcultable && (
            <button onClick={recordarMañana} title="Recordar mañana"
              style={{
                background: 'transparent', border: 'none', color: st.texto, opacity: 0.7,
                cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0,
              }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Modal de detalle ────────────────────────────────── */}
      {modal && (
        <div
          onClick={() => setModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)', color: 'var(--text-primary)',
              border: '1px solid var(--card-border)', borderRadius: 14,
              width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}
          >
            {/* Cabecera */}
            <div style={{ background: st.bg, color: st.texto, padding: '14px 18px' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={18} />
                  <p className="m-0 font-bold">Mantenimiento del sistema</p>
                </div>
                <button onClick={() => setModal(false)}
                  style={{ background: 'transparent', border: 'none', color: st.texto, cursor: 'pointer', display: 'flex' }}>
                  <X size={18} />
                </button>
              </div>
              <p className="m-0 text-xs" style={{ opacity: 0.85, marginTop: 4 }}>
                {periodoLargo(f.periodo)}
              </p>
            </div>

            <div style={{ padding: 18 }}>
              {/* Monto y vencimiento */}
              <div className="flex gap-3" style={{ marginBottom: 16 }}>
                <div style={{ flex: 1, background: 'var(--content-bg)', borderRadius: 10, padding: '10px 12px' }}>
                  <p className="m-0 text-xs" style={{ color: 'var(--text-muted)' }}>Importe</p>
                  <p className="m-0 font-bold" style={{ fontSize: 20 }}>{plata(f.monto)}</p>
                </div>
                <div style={{ flex: 1, background: 'var(--content-bg)', borderRadius: 10, padding: '10px 12px' }}>
                  <p className="m-0 text-xs" style={{ color: 'var(--text-muted)' }}>Vencimiento</p>
                  <p className="m-0 font-bold flex items-center gap-1" style={{ fontSize: 15 }}>
                    <Clock size={14} /> {fechaLarga(f.vence_el)}
                  </p>
                  <p className="m-0 text-xs" style={{ color: f.vencida ? '#dc2626' : 'var(--text-secondary)' }}>
                    {f.vencida ? `vencido hace ${nDias(Math.abs(dias))}`
                               : dias === 0 ? 'vence hoy' : `en ${nDias(dias)}`}
                  </p>
                </div>
              </div>

              {estado.pendientes > 1 && (
                <p className="text-sm" style={{
                  background: 'rgba(185,28,28,0.1)', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.25)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 14,
                }}>
                  Hay {estado.pendientes} períodos sin pagar. Total acumulado: <strong>{plata(estado.deuda_total)}</strong>.
                </p>
              )}

              <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 14 }}>
                Incluye el servidor en la nube, la base de datos, las copias de seguridad
                y el soporte técnico del sistema.
              </p>

              {/* Datos de pago */}
              {estado.datos_pago ? (
                <div style={{
                  background: 'var(--content-bg)', border: '1px solid var(--card-border)',
                  borderRadius: 10, padding: '12px', marginBottom: 14,
                }}>
                  <p className="m-0 text-xs" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
                    Transferir a
                  </p>
                  <div className="flex items-center gap-2">
                    <code style={{ flex: 1, fontSize: 13, wordBreak: 'break-all' }}>{estado.datos_pago}</code>
                    <button onClick={copiarDatos} title="Copiar"
                      style={{
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        color: 'var(--text-primary)', fontSize: 12, flexShrink: 0,
                      }}>
                      {copiado ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)', marginBottom: 14 }}>
                  Pedile los datos de pago al soporte.
                </p>
              )}

              {errorEnvio && (
                <p className="text-sm" style={{ color: '#dc2626', marginBottom: 12 }}>{errorEnvio}</p>
              )}

              {/* Acciones */}
              {informado ? (
                <p className="text-sm m-0" style={{
                  background: 'rgba(37,99,235,0.1)', color: '#1d4ed8',
                  border: '1px solid rgba(37,99,235,0.25)', borderRadius: 8, padding: '10px 12px',
                }}>
                  Ya avisaste el pago. En cuanto se confirme, este aviso desaparece solo.
                </p>
              ) : (
                <div className="flex gap-2">
                  <button onClick={informarPago} disabled={enviando}
                    style={{
                      flex: 1, background: '#16a34a', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '10px 14px', fontWeight: 600, fontSize: 14,
                      cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.6 : 1,
                    }}>
                    {enviando ? 'Avisando...' : 'Ya transferí'}
                  </button>
                  <button onClick={recordarMañana}
                    style={{
                      background: 'var(--content-bg)', color: 'var(--text-secondary)',
                      border: '1px solid var(--card-border)', borderRadius: 8,
                      padding: '10px 14px', fontSize: 14, cursor: 'pointer',
                    }}>
                    Recordar mañana
                  </button>
                </div>
              )}

              {estado.contacto && (
                <p className="text-xs m-0" style={{ color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                  Dudas: {estado.contacto}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
