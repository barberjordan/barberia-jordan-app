import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Calendar } from 'lucide-react'
import { useSync } from '../context/SyncContext'

const EMPTY = { cliente_id: '', barbero_id: '', servicio_id: '', fecha: '', hora: '', estado: 'pendiente', notas: '', precio_total: '' }
const ESTADOS = ['pendiente', 'confirmada', 'en proceso', 'completada', 'cancelada']
const ESTADO_COLORS = {
  pendiente:   'bg-yellow-100 text-yellow-700',
  confirmada:  'bg-blue-100 text-blue-700',
  'en proceso':'bg-indigo-100 text-indigo-700',
  completada:  'bg-green-100 text-green-700',
  cancelada:   'bg-red-100 text-red-700',
}

export default function Citas() {
  const { refreshTick } = useSync()
  const [citas, setCitas]         = useState([])
  const [clientes, setClientes]   = useState([])
  const [barberos, setBarberos]   = useState([])
  const [servicios, setServicios] = useState([])
  const [filtroFecha, setFiltroFecha] = useState('')
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [loading, setLoading]     = useState(false)

  async function cargar() {
    const [c, cl, b, s] = await Promise.all([
      window.api.citas.getAll(),
      window.api.clientes.getAll(),
      window.api.barberos.getAll(),
      window.api.servicios.getAll(),
    ])
    setCitas(c); setClientes(cl); setBarberos(b); setServicios(s)
  }
  useEffect(() => { cargar() }, [refreshTick])

  // Auto-rellena precio al seleccionar servicio
  function onServicioChange(id) {
    const svc = servicios.find(s => s.id === parseInt(id))
    setForm(f => ({ ...f, servicio_id: id, precio_total: svc ? String(svc.precio) : '' }))
  }

  const filtradas = filtroFecha
    ? citas.filter(c => c.fecha === filtroFecha)
    : citas

  function abrirCrear() {
    const hoy = new Date().toISOString().split('T')[0]
    setForm({ ...EMPTY, fecha: hoy }); setEditId(null); setModal(true)
  }
  function abrirEditar(c) {
    setForm({
      cliente_id: String(c.cliente_id), barbero_id: String(c.barbero_id),
      servicio_id: String(c.servicio_id), fecha: c.fecha, hora: c.hora,
      estado: c.estado, notas: c.notas || '', precio_total: String(c.precio_total),
    })
    setEditId(c.id); setModal(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      ...form,
      cliente_id:  parseInt(form.cliente_id),
      barbero_id:  parseInt(form.barbero_id),
      servicio_id: parseInt(form.servicio_id),
      precio_total: parseFloat(form.precio_total) || 0,
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
        <button onClick={abrirCrear}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus size={16} /> Nueva cita
        </button>
      </div>

      {/* Filtro fecha */}
      <div className="flex items-center gap-3">
        <Calendar size={16} className="text-slate-400" />
        <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        {filtroFecha && (
          <button onClick={() => setFiltroFecha('')} className="text-slate-400 hover:text-slate-600 text-xs">Limpiar</button>
        )}
        <span className="text-slate-400 text-sm">{filtradas.length} cita(s)</span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
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
              <tr><td colSpan={7} className="text-center text-slate-400 py-10">No hay citas</td></tr>
            )}
            {filtradas.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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
              ].map(({ label, key, opts, req }) => (
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Servicio *</label>
                <select required value={form.servicio_id} onChange={e => onServicioChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                  <option value="">Seleccionar...</option>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre} - ${s.precio}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio total</label>
                  <input type="number" min="0" step="0.01" value={form.precio_total} onChange={e => setForm(f => ({ ...f, precio_total: e.target.value }))}
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
        </div>
      )}
    </div>
  )
}
