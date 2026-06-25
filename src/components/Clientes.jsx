import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'

const EMPTY = { nombre: '', telefono: '', email: '', notas: '' }

export default function Clientes() {
  const [data, setData]       = useState([])
  const [filtro, setFiltro]   = useState('')
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function cargar() {
    setData(await window.api.clientes.getAll())
  }
  useEffect(() => { cargar() }, [])

  const filtrados = data.filter(c =>
    c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    (c.telefono || '').includes(filtro) ||
    (c.email || '').toLowerCase().includes(filtro.toLowerCase())
  )

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal(true) }
  function abrirEditar(c) { setForm({ ...c }); setEditId(c.id); setModal(true) }

  async function guardar(e) {
    e.preventDefault()
    setLoading(true)
    if (editId) await window.api.clientes.update(editId, form)
    else        await window.api.clientes.create(form)
    setModal(false)
    await cargar()
    setLoading(false)
  }

  async function eliminar(id) {
    if (!await window.api.dialog.confirm('¿Eliminar cliente?')) return
    await window.api.clientes.delete(id)
    await cargar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Clientes <span className="text-slate-400 font-normal text-base">({data.length})</span></h1>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Notas</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 && (
              <tr><td colSpan={5} className="text-center text-slate-400 py-10">No hay clientes registrados</td></tr>
            )}
            {filtrados.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {c.nombre.charAt(0)}
                    </div>
                    {c.nombre}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{c.telefono || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{c.email || '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{c.notas || '—'}</td>
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
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">{editId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              {[
                { label: 'Nombre', key: 'nombre', required: true },
                { label: 'Teléfono', key: 'telefono' },
                { label: 'Email', key: 'email', type: 'email' },
              ].map(({ label, key, type = 'text', required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea value={form.notas || ''} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
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
