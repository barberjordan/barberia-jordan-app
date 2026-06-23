import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Scissors } from 'lucide-react'

const EMPTY = { nombre: '', descripcion: '', precio: '', duracion: '', activo: 1 }

export default function Servicios() {
  const [data, setData]       = useState([])
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function cargar() { setData(await window.api.servicios.getAll()) }
  useEffect(() => { cargar() }, [])

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal(true) }
  function abrirEditar(s) { setForm({ ...s, precio: String(s.precio) }); setEditId(s.id); setModal(true) }

  async function guardar(e) {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form, precio: parseFloat(form.precio) || 0, duracion: parseInt(form.duracion) || 30 }
    if (editId) await window.api.servicios.update(editId, payload)
    else        await window.api.servicios.create(payload)
    setModal(false)
    await cargar()
    setLoading(false)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar servicio?')) return
    await window.api.servicios.delete(id)
    await cargar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Servicios</h1>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-16">No hay servicios registrados</div>
        )}
        {data.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                <Scissors size={18} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {s.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <h3 className="font-semibold text-slate-800">{s.nombre}</h3>
            {s.descripcion && <p className="text-slate-400 text-xs mt-1 line-clamp-2">{s.descripcion}</p>}
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-2xl font-bold text-primary-500">${Number(s.precio).toLocaleString()}</p>
                <p className="text-slate-400 text-xs">{s.duracion} min</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirEditar(s)} className="text-slate-400 hover:text-blue-600 transition-colors p-1"><Pencil size={15} /></button>
                <button onClick={() => eliminar(s.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">{editId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input type="text" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio ($) *</label>
                <input type="number" required min="0" step="0.01" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked ? 1 : 0 }))} className="accent-primary-500" />
                Activo
              </label>
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
