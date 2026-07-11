import React, { useEffect, useState } from 'react'

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
import {
  RefreshCw, Download, CheckCircle, AlertCircle, Loader,
  Store, Wifi, Clock, FileSpreadsheet, AlertTriangle, Save,
} from 'lucide-react'

// ── Helpers de estilos ──────────────────────────────────────────────────────
const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white'
const btnPrimary = 'flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition'
const btnGhost   = 'flex items-center gap-1.5 text-sm px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50'

function SectionCard({ icon, iconBg = 'bg-primary-50 text-primary-600', title, desc, danger, children }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border ${danger ? 'border-red-200' : 'border-slate-100'}`}>
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${danger ? 'border-red-100' : 'border-slate-100'}`}>
        <div className={`w-9 h-9 ${danger ? 'bg-red-50 text-red-500' : iconBg} rounded-xl flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div>
          <p className={`font-semibold text-sm ${danger ? 'text-red-700' : 'text-slate-800'}`}>{title}</p>
          <p className="text-xs text-slate-400">{desc}</p>
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function OkMsg({ show, msg = '✅ Guardado correctamente' }) {
  if (!show) return null
  return <span className="text-sm text-green-600 font-medium">{msg}</span>
}

// ==================== ACTUALIZACIONES ====================
function SeccionActualizaciones() {
  const [version, setVersion]   = useState('')
  const [estado, setEstado]     = useState('idle')
  const [updateVersion, setUV]  = useState('')
  const [progreso, setProgreso] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    window.api.app.getVersion().then(v => setVersion(v)).catch(() => {})
    if (!window.api?.updater) return
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
    setEstado('verificando'); setErrorMsg('')
    const res = await window.api.updater.verificar()
    if (res?.error === 'dev') {
      setErrorMsg('Las actualizaciones automáticas solo están disponibles en la versión instalada.')
      setEstado('error')
    }
  }

  return (
    <SectionCard icon={<Download size={18} />} iconBg="bg-blue-50 text-blue-600"
      title="Actualizaciones" desc={`Versión actual: ${version ? `v${version}` : '...'}`}>
      <div className="space-y-3">
        {estado === 'idle' && (
          <p className="text-sm text-slate-500">Hacé clic en "Verificar" para buscar actualizaciones.</p>
        )}
        {estado === 'verificando' && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader size={14} className="animate-spin" /> Buscando actualizaciones...
          </div>
        )}
        {estado === 'al-dia' && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <CheckCircle size={15} /> <span className="font-medium">¡La aplicación está al día!</span>
          </div>
        )}
        {estado === 'disponible' && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Download size={14} /> Nueva versión <strong>v{updateVersion}</strong> disponible — descargando...
          </div>
        )}
        {estado === 'descargando' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
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
              <CheckCircle size={15} /> v{updateVersion} lista para instalar.
            </div>
            <button onClick={() => window.api.updater.instalar()}
              className={`w-full justify-center ${btnPrimary} bg-green-500 hover:bg-green-600`}>
              <RefreshCw size={14} /> Reiniciar e instalar ahora
            </button>
          </div>
        )}
        {estado === 'error' && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{errorMsg || 'No se pudo verificar actualizaciones.'}</span>
          </div>
        )}
        {['idle', 'al-dia', 'error'].includes(estado) && (
          <button onClick={verificar} className={btnPrimary + ' bg-blue-500 hover:bg-blue-600'}>
            <RefreshCw size={14} /> Verificar actualizaciones
          </button>
        )}
      </div>
    </SectionCard>
  )
}

// ==================== CONFIGURACIÓN PRINCIPAL ====================
const INTERVALOS = [
  { ms: 15000,  label: '15 seg' },
  { ms: 30000,  label: '30 seg' },
  { ms: 60000,  label: '1 min'  },
  { ms: 120000, label: '2 min'  },
]

export default function Configuracion() {
  // -- Info barbería --
  const [info, setInfo]       = useState({ nombre: '', telefono: '', direccion: '' })
  const [savingInfo, setSI]   = useState(false)
  const [okInfo, setOkInfo]   = useState(false)

  // -- API URL --
  const [apiUrl, setApiUrl]       = useState('')
  const [testingApi, setTestingA] = useState(false)
  const [apiStatus, setApiStatus] = useState(null)  // null | 'ok' | 'error' | 'saved'
  const [savingApi, setSavingApi] = useState(false)

  // -- Sync interval --
  const [intervalMs, setIntervalMs] = useState(30000)

  // -- Export --
  const [exportMes, setExportMes]   = useState(localDate().slice(0, 7))
  const [exporting, setExporting]   = useState(false)
  const [exportOk, setExportOk]     = useState(false)

  // -- Danger zone --
  const [resyncing, setResyncing] = useState(false)
  const [resyncOk, setResyncOk]   = useState(false)

  // Carga inicial de todos los valores
  useEffect(() => {
    Promise.all([
      window.api.config.get('nombre_barberia'),
      window.api.config.get('telefono_barberia'),
      window.api.config.get('direccion_barberia'),
      window.api.sync.getApiUrl(),
      window.api.config.get('sync_interval'),
    ]).then(([nombre, telefono, direccion, url, syncInt]) => {
      setInfo({ nombre: nombre || '', telefono: telefono || '', direccion: direccion || '' })
      setApiUrl(url || '')
      if (syncInt) setIntervalMs(Number(syncInt))
    })
  }, [])

  // ── Info barbería ──
  async function guardarInfo(e) {
    e.preventDefault(); setSI(true)
    await window.api.config.set('nombre_barberia',  info.nombre)
    await window.api.config.set('telefono_barberia', info.telefono)
    await window.api.config.set('direccion_barberia', info.direccion)
    setSI(false); setOkInfo(true); setTimeout(() => setOkInfo(false), 2500)
  }

  // ── API URL ──
  async function testApi() {
    setTestingA(true); setApiStatus(null)
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(6000) })
      setApiStatus(res.ok ? 'ok' : 'error')
    } catch { setApiStatus('error') }
    setTestingA(false)
  }

  async function guardarApiUrl() {
    setSavingApi(true)
    await window.api.sync.setApiUrl(apiUrl)
    setSavingApi(false); setApiStatus('saved'); setTimeout(() => setApiStatus(null), 2500)
  }

  // ── Intervalo ──
  async function cambiarIntervalo(ms) {
    setIntervalMs(ms)
    await window.api.sync.setInterval(ms)
  }

  // ── Exportar Excel ──
  async function exportarExcel() {
    setExporting(true); setExportOk(false)
    try {
      const todas    = await window.api.citas.getAll()
      const filtradas = todas.filter(c => c.fecha?.startsWith(exportMes))
      if (filtradas.length === 0) { alert('No hay citas para ese mes.'); setExporting(false); return }

      const rows = filtradas
        .sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')))
        .map(c => ({
          Fecha:    c.fecha || '',
          Hora:     c.hora?.slice(0, 5) || '',
          Cliente:  c.cliente_nombre || '—',
          Barbero:  c.barbero_nombre || '—',
          Servicio: c.servicio_nombre || '—',
          Precio:   Number(c.precio_total || 0),
          Estado:   c.estado || '',
        }))

      const result = await window.api.exportar.citas(rows, exportMes)
      if (result?.ok) { setExportOk(true); setTimeout(() => setExportOk(false), 3000) }
    } catch (err) { console.error(err) }
    setExporting(false)
  }

  // ── Re-sync ──
  async function forzarResync() {
    if (!await window.api.dialog.confirm('¿Descargar todos los datos del servidor y reemplazar los locales?')) return
    setResyncing(true); setResyncOk(false)
    try { await window.api.sync.descargar(); setResyncOk(true); setTimeout(() => setResyncOk(false), 3000) }
    catch {}
    setResyncing(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Información del local, servidor, sincronización y exportación</p>
      </div>

      {/* 1. Información de la barbería */}
      <SectionCard icon={<Store size={18} />} title="Información de la barbería" desc="Nombre, teléfono y dirección del local">
        <form onSubmit={guardarInfo} className="space-y-3">
          <Field label="Nombre del local">
            <input type="text" value={info.nombre}
              onChange={e => setInfo(i => ({ ...i, nombre: e.target.value }))}
              placeholder="Barbería Jordan" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <input type="tel" value={info.telefono}
                onChange={e => setInfo(i => ({ ...i, telefono: e.target.value }))}
                placeholder="+54 9 11 1234-5678" className={inputCls} />
            </Field>
            <Field label="Dirección">
              <input type="text" value={info.direccion}
                onChange={e => setInfo(i => ({ ...i, direccion: e.target.value }))}
                placeholder="Av. Siempreviva 742" className={inputCls} />
            </Field>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={savingInfo} className={btnPrimary}>
              <Save size={14} /> {savingInfo ? 'Guardando...' : 'Guardar'}
            </button>
            <OkMsg show={okInfo} />
          </div>
        </form>
      </SectionCard>

      {/* 2. URL del servidor */}
      <SectionCard icon={<Wifi size={18} />} iconBg="bg-indigo-50 text-indigo-600"
        title="Servidor API" desc="URL del backend de sincronización">
        <div className="space-y-3">
          <Field label="URL del servidor">
            <input type="url" value={apiUrl} onChange={e => setApiUrl(e.target.value)}
              placeholder="https://mi-servidor.onrender.com" className={inputCls} />
          </Field>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={testApi} disabled={testingApi || !apiUrl} className={btnGhost}>
              {testingApi ? <Loader size={13} className="animate-spin" /> : <Wifi size={13} />}
              Probar conexión
            </button>
            <button onClick={guardarApiUrl} disabled={savingApi || !apiUrl} className={btnPrimary}>
              <Save size={14} /> {savingApi ? 'Guardando...' : 'Guardar URL'}
            </button>
            {apiStatus === 'ok'    && <span className="text-sm text-green-600 font-medium">✅ Conectado</span>}
            {apiStatus === 'error' && <span className="text-sm text-red-500  font-medium">❌ Sin respuesta</span>}
            {apiStatus === 'saved' && <span className="text-sm text-green-600 font-medium">✅ URL guardada</span>}
          </div>
        </div>
      </SectionCard>

      {/* 3. Intervalo de sincronización */}
      <SectionCard icon={<Clock size={18} />} iconBg="bg-amber-50 text-amber-600"
        title="Intervalo de sincronización" desc="Cada cuánto tiempo se sincroniza con el servidor">
        <div className="flex gap-2 flex-wrap">
          {INTERVALOS.map(({ ms, label }) => (
            <button key={ms} onClick={() => cambiarIntervalo(ms)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                intervalMs === ms
                  ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:bg-primary-50'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Actual: cada <strong className="text-slate-600">{intervalMs / 1000} segundos</strong>.
          Menor intervalo = notificaciones más rápidas pero más tráfico de red.
        </p>
      </SectionCard>

      {/* 4. Exportar citas */}
      <SectionCard icon={<FileSpreadsheet size={18} />} iconBg="bg-green-50 text-green-600"
        title="Exportar citas a Excel" desc="Descargá todas las citas de un mes como planilla .xlsx">
        <div className="flex items-end gap-3 flex-wrap">
          <Field label="Mes a exportar">
            <input type="month" value={exportMes} onChange={e => setExportMes(e.target.value)}
              className={inputCls + ' w-auto'} />
          </Field>
          <button onClick={exportarExcel} disabled={exporting} className={btnPrimary + ' bg-green-600 hover:bg-green-700'}>
            {exporting
              ? <><Loader size={14} className="animate-spin" /> Generando...</>
              : <><Download size={14} /> Exportar Excel</>
            }
          </button>
          <OkMsg show={exportOk} msg="✅ Archivo guardado" />
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Incluye: Fecha, Hora, Cliente, Barbero, Servicio, Precio y Estado de cada cita.
        </p>
      </SectionCard>

      {/* 5. Actualizaciones */}
      <SeccionActualizaciones />

      {/* 6. Zona de peligro */}
      <SectionCard icon={<AlertTriangle size={18} />} title="Zona de peligro"
        desc="Acciones que afectan los datos locales del dispositivo" danger>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Re-sincronización completa</p>
              <p className="text-xs text-slate-400 mt-1">
                Descarga todos los datos del servidor y actualiza la base de datos local.
                Útil si esta PC quedó desincronizada.
              </p>
            </div>
            <button onClick={forzarResync} disabled={resyncing}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition shrink-0">
              {resyncing ? <Loader size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {resyncing ? 'Sincronizando...' : 'Re-sincronizar'}
            </button>
          </div>
          {resyncOk && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2.5 font-medium">
              ✅ Re-sincronización completada correctamente
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
