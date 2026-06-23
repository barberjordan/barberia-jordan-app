import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, UserCheck, X, Check } from 'lucide-react'

const EMPTY = { nombre: '', telefono: '', email: '', especialidad: '', activo: 1 }

export default function Barberos() {
  const [data, setData]       = useState([])
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function cargar() {
    setData(await window.api.barberos.getAll())
  }

  useEffect(() => { cargar() }, [])

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal(true) }
  function abrirEditar(b) { setForm({ ...b }); setEditId(b.id); setModal(true) }

  async function guardar(e) {
    e.preventDefault()
    setLoading(true)
    if (editId) await window.api.barberos.update(editId, form)
    else        await window.api.barberos.create(form)
    setModal(false)
    await cargar()
    setLoading(false)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar barbero?')) return
    await window.api.barberos.delete(id)
    await cargar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Barberos</h1>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white
            text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} /> Nuevo barbero
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Especialidad</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-10">No hay barberos registrados</td></tr>
            )}
            {data.map(b => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {b.nombre.charAt(0)}
                    </div>
                    {b.nombre}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{b.especialidad || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{b.telefono || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{b.email || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${b.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {b.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => abrirEditar(b)} className="text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => eliminar(b.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
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
              <h2 className="font-bold text-slate-800">{editId ? 'Editar barbero' : 'Nuevo barbero'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              {[
                { label: 'Nombre', key: 'nombre', required: true },
                { label: 'Especialidad', key: 'especialidad' },
                { label: 'Teléfono', key: 'telefono' },
                { label: 'Email', key: 'email', type: 'email' },
              ].map(({ label, key, type = 'text', required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    required={required}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.activo}
                  onChange={e => setForm(f => ({ ...f, activo: e.target.checked ? 1 : 0 }))}
                  className="accent-primary-500"
                />
                Activo
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                  Cancelar
                </button>
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
