import React, { useEffect, useState } from 'react'
import { SlidersHorizontal, Save, RefreshCw, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react'

// ==================== SECCIÓN ACTUALIZACIONES ====================
function SeccionActualizaciones() {
  const [version, setVersion]     = useState('')
  const [estado, setEstado]       = useState('idle') // idle | verificando | al-dia | disponible | descargando | lista | error
  const [updateVersion, setUV]    = useState('')
  const [progreso, setProgreso]   = useState(0)
  const [errorMsg, setErrorMsg]   = useState('')

  useEffect(() => {
    // Versión actual
    window.api.app.getVersion().then(v => setVersion(v)).catch(() => {})

    if (!window.api?.updater) return

    // Si ya había una actualización en curso al montar
    window.api.updater.getEstado().then((s) => {
      if (!s) return
      setUV(s.version)
      if (s.tipo === 'descargada')  setEstado('lista')
      else if (s.tipo === 'disponible') setEstado('disponible')
    })

    window.api.updater.onDisponible(({ version: v }) => { setUV(v); setEstado('disponible') })
    window.api.updater.onProgreso(({ porcentaje })    => { setProgreso(porcentaje); setEstado('descargando') })
    window.api.updater.onDescargada(({ version: v })  => { setUV(v); setEstado('lista') })
    window.api.updater.onAlDia(()                     => setEstado('al-dia'))
    window.api.updater.onError(({ mensaje })           => { setErrorMsg(mensaje); setEstado('error') })
  }, [])

  async function verificar() {
    setEstado('verificando')
    setErrorMsg('')
    const res = await window.api.updater.verificar()
    if (res?.error === 'dev') {
      setErrorMsg('Las actualizaciones automáticas solo están disponibles en la versión instalada.')
      setEstado('error')
    }
    // Si no hay error, los eventos onDisponible / onAlDia actualizarán el estado
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Download size={18} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">Actualizaciones</p>
          <p className="text-xs text-slate-400">
            Versión actual: <span className="font-medium text-slate-600">{version ? `v${version}` : '...'}</span>
          </p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Estado */}
        {estado === 'idle' && (
          <p className="text-sm text-slate-500">Hacé clic en "Verificar" para buscar actualizaciones disponibles.</p>
        )}

        {estado === 'verificando' && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader size={15} className="animate-spin" />
            Buscando actualizaciones...
          </div>
        )}

        {estado === 'al-dia' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle size={16} />
            <span className="font-medium">¡La aplicación está al día!</span>
          </div>
        )}

        {estado === 'disponible' && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Download size={15} />
            <span>Nueva versión <strong>v{updateVersion}</strong> disponible — descargando en segundo plano...</span>
          </div>
        )}

        {estado === 'descargando' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Descargando v{updateVersion}...</span>
              <span className="text-slate-400">{progreso}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progreso}%` }} />
            </div>
          </div>
        )}

        {estado === 'lista' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle size={16} />
              <span>v{updateVersion} descargada y lista para instalar.</span>
            </div>
            <button
              onClick={() => window.api.updater.instalar()}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              <RefreshCw size={15} /> Reiniciar e instalar ahora
            </button>
          </div>
        )}

        {estado === 'error' && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{errorMsg || 'No se pudo verificar actualizaciones.'}</span>
          </div>
        )}

        {/* Botón verificar — visible en idle, al-dia o error */}
        {['idle', 'al-dia', 'error'].includes(estado) && (
          <button
            onClick={verificar}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <RefreshCw size={14} /> Verificar actualizaciones
          </button>
        )}
      </div>
    </div>
  )
}

// ==================== CONFIGURACIÓN PRINCIPAL ====================
export default function Configuracion() {
  const [barberos, setBarberos] = useState([])
  const [editados, setEditados] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)

  async function cargar() {
    const data = await window.api.comisiones.getConfig()
    setBarberos(data)
    const init = {}
    data.forEach(b => { init[b.barbero_id] = b.porcentaje_barbero })
    setEditados(init)
  }

  useEffect(() => { cargar() }, [])

  function cambiar(barberoId, valor) {
    const num = Math.min(100, Math.max(0, Number(valor) || 0))
    setEditados(prev => ({ ...prev, [barberoId]: num }))
  }

  async function guardar() {
    setGuardando(true)
    for (const b of barberos) {
      const pct = editados[b.barbero_id] ?? b.porcentaje_barbero
      await window.api.comisiones.setConfig(b.barbero_id, pct)
    }
    setGuardando(false)
    setOk(true)
    setTimeout(() => setOk(false), 2500)
    cargar()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Ajustá los porcentajes de comisión y verificá actualizaciones</p>
      </div>

      {/* Sección actualizaciones */}
      <SeccionActualizaciones />

      {/* Sección comisiones */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-9 h-9 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center shrink-0">
            <SlidersHorizontal size={18} />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Porcentajes de comisión</p>
            <p className="text-xs text-slate-400">
              El % del barbero se paga al barbero. El resto es la ganancia del administrador.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {barberos.length === 0 && (
            <p className="text-center text-slate-400 py-10 text-sm">No hay barberos activos</p>
          )}

          {barberos.map(b => {
            const pctBarbero = editados[b.barbero_id] ?? b.porcentaje_barbero
            const pctAdmin   = 100 - pctBarbero

            return (
              <div key={b.barbero_id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full
                    flex items-center justify-center text-sm font-bold shrink-0">
                    {b.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800">{b.nombre}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-amber-700 mb-1 block">
                      % Barbero — {pctBarbero}%
                    </label>
                    <input
                      type="range"
                      min={0} max={100} step={1}
                      value={pctBarbero}
                      onChange={e => cambiar(b.barbero_id, e.target.value)}
                      className="w-full accent-amber-500"
                    />
                    <input
                      type="number"
                      min={0} max={100}
                      value={pctBarbero}
                      onChange={e => cambiar(b.barbero_id, e.target.value)}
                      className="mt-1 w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm
                        text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-green-700 mb-1 block">
                      % Administrador — {pctAdmin}%
                    </label>
                    <input
                      type="range"
                      min={0} max={100} step={1}
                      value={pctAdmin}
                      readOnly
                      className="w-full accent-green-500 opacity-60 cursor-not-allowed"
                    />
                    <div className="mt-1 w-20 border border-slate-100 bg-slate-50 rounded-lg px-2 py-1
                      text-sm text-center text-slate-500 font-medium">
                      {pctAdmin}%
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-2.5 rounded-full overflow-hidden bg-slate-100 flex">
                  <div className="bg-amber-400 transition-all duration-200" style={{ width: `${pctBarbero}%` }} />
                  <div className="bg-green-500 transition-all duration-200"  style={{ width: `${pctAdmin}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>🟡 Barbero</span>
                  <span>🟢 Admin</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <button onClick={cargar}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition">
            <RefreshCw size={14} /> Recargar
          </button>
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-60
              text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            <Save size={15} />
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {ok && (
          <div className="mx-5 mb-4 bg-green-50 border border-green-200 text-green-700
            text-sm rounded-lg px-4 py-2.5 text-center font-medium">
            ✅ Porcentajes guardados correctamente
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">¿Cómo funciona?</p>
        <p>
          El porcentaje del barbero se calcula sobre el total de cada cita completada.
          El resto va al administrador. Estos valores se reflejan automáticamente en el
          Dashboard y en los Reportes.
        </p>
      </div>
    </div>
  )
}
