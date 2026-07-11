import React, { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Pencil, Trash2, X, Calendar, Search, LayoutList, Users } from 'lucide-react'
import { useSync } from '../context/SyncContext'

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

const EMPTY = { cliente_id: '', barbero_id: '', servicios_ids: [], fecha: '', hora: '', estado: 'pendiente', notas: '', precio_total: '' }
const ESTADOS = ['pendiente', 'confirmada', 'en proceso', 'completada', 'cancelada']
const ESTADO_COLORS = {
  pendiente:    'bg-yellow-100 text-yellow-700',
  confirmada:   'bg-blue-100 text-blue-700',
  'en proceso': 'bg-indigo-100 text-indigo-700',
  completada:   'bg-green-100 text-green-700',
  cancelada:    'bg-red-100 text-red-700',
}

export default function Citas() {
  const { refreshTick } = useSync()
  const [citas, setCitas]           = useState([])
  const [clientes, setClientes]     = useState([])
  const [barberos, setBarberos]     = useState([])
  const [servicios, setServicios]   = useState([])
  const [filtroFecha, setFiltroFecha] = useState('')
  const [busqueda, setBusqueda]       = useState('')
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY)
  const [editId, setEditId]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [seleccionados, setSelec]   = useState(new Set())
  const [vista, setVista]           = useState('tabla')  // 'tabla' | 'barberos'

  async function cargar() {
    const [c, cl, b, s] = await Promise.all([
      window.api.citas.getAll(),
      window.api.clientes.getAll(),
      window.api.barberos.getAll(),
      window.api.servicios.getAll(),
    ])
    setCitas(c); setClientes(cl); setBarberos(b); setServicios(s)
    setSelec(new Set())
  }
  useEffect(() => { cargar() }, [refreshTick])

  const filtradas = citas.filter(c => {
    if (filtroFecha && c.fecha !== filtroFecha) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        (c.cliente_nombre  || '').toLowerCase().includes(q) ||
        (c.barbero_nombre  || '').toLowerCase().includes(q) ||
        (c.servicio_nombre || '').toLowerCase().includes(q) ||
        String(c.precio_total || '').includes(q)
      )
    }
    return true
  })

  // ── Vista por barbero ──
  const porBarbero = useMemo(() => {
    const map = {}
    for (const c of filtradas) {
      const k = c.barbero_nombre || 'Sin asignar'
      if (!map[k]) map[k] = { nombre: k, citas: [], total: 0 }
      map[k].citas.push(c)
      if (c.estado === 'completada') map[k].total += Number(c.precio_total || 0)
    }
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [filtradas])

  // ── Selección ──
  const todosSeleccionados = filtradas.length > 0 && filtradas.every(c => seleccionados.has(c.id))

  function toggleTodos() {
    todosSeleccionados ? setSelec(new Set()) : setSelec(new Set(filtradas.map(c => c.id)))
  }

  function toggleUno(id) {
    setSelec(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function eliminarSeleccionados() {
    const ids = [...seleccionados]
    if (!await window.api.dialog.confirm(`¿Eliminar ${ids.length} cita(s) seleccionada(s)?`)) return
    for (const id of ids) await window.api.citas.delete(id)
    await cargar()
  }

  // ── CRUD ──
  function toggleServicio(svcId) {
    const id = parseInt(svcId)
    setForm(f => {
      const current = f.servicios_ids || []
      const next = current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id]
      const total = next.reduce((sum, sid) => {
        const svc = servicios.find(s => s.id === sid)
        return sum + (svc?.precio || 0)
      }, 0)
      return { ...f, servicios_ids: next, precio_total: String(total) }
    })
  }

  function abrirCrear() {
    const hoy = localDate()
    setForm({ ...EMPTY, fecha: hoy }); setEditId(null); setModal(true)
  }
  function abrirEditar(c) {
    // servicios_ids puede venir como array JSON string o como array directo
    let sids = c.servicios_ids
    if (typeof sids === 'string') {
      try { sids = JSON.parse(sids) } catch { sids = [] }
    }
    if (!Array.isArray(sids) || sids.length === 0) {
      sids = c.servicio_id ? [parseInt(c.servicio_id)] : []
    }
    setForm({
      cliente_id:   String(c.cliente_id || ''),
      barbero_id:   String(c.barbero_id || ''),
      servicios_ids: sids,
      fecha:         c.fecha, hora: c.hora,
      estado:        c.estado, notas: c.notas || '',
      precio_total:  String(c.precio_total),
    })
    setEditId(c.id); setModal(true)
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.servicios_ids || form.servicios_ids.length === 0) {
      await window.api.dialog.confirm('Seleccioná al menos un servicio')
      return
    }
    setLoading(true)
    const payload = {
      ...form,
      cliente_id:    form.cliente_id ? parseInt(form.cliente_id) : null,
      barbero_id:    parseInt(form.barbero_id),
      servicio_id:   form.servicios_ids[0],
      servicios_ids: form.servicios_ids,
      precio_total:  parseFloat(form.precio_total) || 0,
    }
    if (editId) await window.api.citas.update(editId, payload)
    else        await window.api.citas.create(payload)
    setModal(false)
    await cargar()
    setLoading(false)
  }

  async function eliminar(id) {
    if (!await window.api.dialog.confirm('¿Eliminar cita?')) return
    await window.api.citas.delete(id)
    await cargar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Citas</h1>
        <div className="flex items-center gap-2">
          {/* Toggle de vista */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
            <button onClick={() => setVista('tabla')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                vista === 'tabla' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <LayoutList size={13} /> Tabla
            </button>
            <button onClick={() => setVista('barberos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                vista === 'barberos' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Users size={13} /> Por barbero
            </button>
          </div>
          <button onClick={abrirCrear}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            <Plus size={16} /> Nueva cita
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Fecha */}
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-slate-400" />
          <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          {filtroFecha && (
            <button onClick={() => setFiltroFecha('')} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          )}
        </div>

        {/* Búsqueda texto */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente, barbero, servicio o precio..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={13} />
            </button>
          )}
        </div>

        <span className="text-slate-400 text-sm whitespace-nowrap">{filtradas.length} cita(s)</span>
      </div>

      {/* Barra de selección */}
      {seleccionados.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-red-700">
            {seleccionados.size} cita(s) seleccionada(s)
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelec(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
            <button onClick={eliminarSeleccionados}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
              <Trash2 size={13} /> Eliminar seleccionadas
            </button>
          </div>
        </div>
      )}

      {/* ── Vista tabla ── */}
      {vista === 'tabla' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos}
                    className="accent-primary-500 w-4 h-4 cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-left">Fecha / Hora</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Barbero</th>
                <th className="px-4 py-3 text-left">Servicio</th>
                <th className="px-4 py-3 text-left">Precio</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.length === 0 && (
                <tr><td colSpan={8} className="text-center text-slate-400 py-10">No hay citas</td></tr>
              )}
              {filtradas.map(c => {
                const sel = seleccionados.has(c.id)
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${sel ? 'bg-primary-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={sel} onChange={() => toggleUno(c.id)}
                        className="accent-primary-500 w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.fecha}</p>
                      <p className="text-slate-400 text-xs">{c.hora}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.cliente_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.barbero_nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.servicio_nombre || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">${Number(c.precio_total).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_COLORS[c.estado] || ''}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => abrirEditar(c)} className="text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => eliminar(c.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Vista por barbero ── */}
      {vista === 'barberos' && (
        <div className="space-y-3">
          {porBarbero.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-100 py-12 text-center text-slate-400">
              No hay citas para mostrar
            </div>
          )}
          {porBarbero.map(b => (
            <div key={b.nombre} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Cabecera del barbero */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                    {b.nombre.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{b.nombre}</p>
                    <p className="text-xs text-slate-400">{b.citas.length} cita(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">${Number(b.total).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">completadas</p>
                </div>
              </div>

              {/* Lista de clientes */}
              <div className="divide-y divide-slate-50">
                {b.citas.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Avatar cliente */}
                      <div className="w-7 h-7 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                        {(c.cliente_nombre || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.cliente_nombre || 'Sin cliente'}</p>
                        <p className="text-xs text-slate-400">
                          {c.servicio_nombre || '—'}
                          {c.fecha && ` · ${c.fecha}`}
                          {c.hora && ` ${c.hora.slice(0, 5)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLORS[c.estado] || ''}`}>
                        {c.estado}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        ${Number(c.precio_total).toLocaleString()}
                      </span>
                      <div className="flex gap-1.5 ml-1">
                        <button onClick={() => abrirEditar(c)} className="text-slate-300 hover:text-blue-500 transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => eliminar(c.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">{editId ? 'Editar cita' : 'Nueva cita'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                  <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              </div>
              {[
                { label: 'Cliente', key: 'cliente_id', opts: clientes },
                { label: 'Barbero *', key: 'barbero_id', opts: barberos },
              ].map(({ label, key, opts }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    <option value="">Seleccionar...</option>
                    {opts.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Servicio(s) *
                  {form.servicios_ids.length > 0 && (
                    <span className="ml-2 text-xs text-primary-600 font-semibold">
                      Total: ${parseFloat(form.precio_total || 0).toLocaleString()}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {servicios.map(svc => {
                    const sel = (form.servicios_ids || []).includes(svc.id)
                    return (
                      <button key={svc.id} type="button" onClick={() => toggleServicio(svc.id)}
                        className={`text-left px-3 py-2 border rounded-lg text-sm transition-all ${
                          sel
                            ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold ring-1 ring-primary-400'
                            : 'border-slate-200 hover:border-primary-300 text-slate-600'
                        }`}>
                        <div className="font-medium leading-tight">{svc.nombre}</div>
                        <div className="text-xs opacity-60 mt-0.5">${Number(svc.precio).toLocaleString()}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio total</label>
                  <input type="number" min="0" step="0.01" value={form.precio_total}
                    onChange={e => setForm(f => ({ ...f, precio_total: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 text-sm rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition disabled:opacity-60">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
