import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ShieldCheck, Scissors } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMPTY = { nombre: '', email: '', password: '', rol: 'empleado', activo: 1 }
const ROLES = ['admin', 'empleado']

export default function Usuarios() {
  const { user: me } = useAuth()
  const [data, setData]       = useState([])
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [loading, setLoading] = useState(false)

  async function cargar() { setData(await window.api.usuarios.getAll()) }
  useEffect(() => { cargar() }, [])

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal(true) }
  function abrirEditar(u) { setForm({ ...u, password: '' }); setEditId(u.id); setModal(true) }

  async function guardar(e) {
    e.preventDefault()
    setLoading(true)
    if (editId) {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      await window.api.usuarios.update(editId, payload)
    } else {
      await window.api.usuarios.create(form)
    }
    setModal(false)
    await cargar()
    setLoading(false)
  }

  async function eliminar(id) {
    if (id === me?.id) return alert('No puedes eliminar tu propia cuenta')
    if (!confirm('¿Eliminar usuario?')) return
    await window.api.usuarios.delete(id)
    await cargar()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Usuarios</h1>
          <p className="text-xs text-slate-400 mt-0.5">Al crear un empleado se crea su barbero vinculado automáticamente</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Barbero vinculado</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-10">No hay usuarios</td></tr>
            )}
            {data.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => abrirEditar(u)}>
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {u.nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 hover:text-primary-600 transition-colors">{u.nombre}</p>
                      {u.id === me?.id && <p className="text-xs text-primary-500">Tú</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 w-fit ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                    {u.rol === 'admin' && <ShieldCheck size={11} />} {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.barbero_nombre ? (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Scissors size={11} className="text-primary-500" /> {u.barbero_nombre}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => abrirEditar(u)} className="text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={15} /></button>
                    <button onClick={() => eliminar(u.id)} disabled={u.id === me?.id}
                      className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800">{editId ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input type="text" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {editId ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                </label>
                <input type="password" required={!editId} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {!editId && form.rol === 'empleado' && (
                  <p className="text-xs text-primary-500 mt-1 flex items-center gap-1">
                    <Scissors size={10} /> Se creará un barbero con este nombre automáticamente
                  </p>
                )}
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
