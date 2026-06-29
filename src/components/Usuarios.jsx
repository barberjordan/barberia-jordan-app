import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ShieldCheck, Scissors } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const EMPTY = { nombre: '', email: '', password: '', rol: 'empleado', activo: 1, porcentaje_comision: 55 }
const ROLES = ['admin', 'empleado']

export default function Usuarios() {
  const { user: me } = useAuth()
  const [data, setData]           = useState([])
  const [comisiones, setComisiones] = useState([])   // [{barbero_id, nombre, porcentaje_barbero}]
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [seleccionados, setSelec] = useState(new Set())

  async function cargar() {
    const [users, coms] = await Promise.all([
      window.api.usuarios.getAll(),
      window.api.comisiones.getConfig(),
    ])
    setData(users)
    setComisiones(Array.isArray(coms) ? coms : [])
    setSelec(new Set())
  }
  useEffect(() => { cargar() }, [])

  // Devuelve el porcentaje del barbero vinculado al usuario
  function getPct(u) {
    if (!u.barbero_id) return null
    return comisiones.find(c => c.barbero_id === u.barbero_id)?.porcentaje_barbero ?? 55
  }

  // ── Selección ──
  const elegibles = data.filter(u => u.id !== me?.id)
  const todosSeleccionados = elegibles.length > 0 && elegibles.every(u => seleccionados.has(u.id))

  function toggleTodos() {
    todosSeleccionados ? setSelec(new Set()) : setSelec(new Set(elegibles.map(u => u.id)))
  }

  function toggleUno(id) {
    if (id === me?.id) return
    setSelec(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function eliminarSeleccionados() {
    const ids = [...seleccionados]
    if (!await window.api.dialog.confirm(`¿Eliminar ${ids.length} usuario(s) seleccionado(s)?`)) return
    for (const id of ids) await window.api.usuarios.delete(id)
    await cargar()
  }

  // ── CRUD ──
  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal(true) }

  function abrirEditar(u) {
    const pct = getPct(u) ?? 55
    setForm({ ...u, password: '', porcentaje_comision: pct })
    setEditId(u.id)
    setModal(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editId) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        await window.api.usuarios.update(editId, payload)
        // Guardar comisión si es empleado con barbero vinculado
        if (form.rol === 'empleado' && form.barbero_id) {
          await window.api.comisiones.setConfig(form.barbero_id, Number(form.porcentaje_comision) || 55)
        }
      } else {
        await window.api.usuarios.create(form)
        // Buscar el nuevo barbero_id y guardar comisión
        if (form.rol === 'empleado') {
          const users = await window.api.usuarios.getAll()
          const newUser = users.find(u => u.email.toLowerCase() === form.email.toLowerCase())
          if (newUser?.barbero_id) {
            await window.api.comisiones.setConfig(newUser.barbero_id, Number(form.porcentaje_comision) || 55)
          }
        }
      }
      setModal(false)
      await cargar()
    } finally {
      setLoading(false)
    }
  }

  async function eliminar(id) {
    if (id === me?.id) return alert('No puedes eliminar tu propia cuenta')
    if (!await window.api.dialog.confirm('¿Eliminar usuario?')) return
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

      {/* Barra de selección */}
      {seleccionados.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-red-700">
            {seleccionados.size} usuario(s) seleccionado(s)
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelec(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
            <button onClick={eliminarSeleccionados}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition">
              <Trash2 size={13} /> Eliminar seleccionados
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos}
                  className="accent-primary-500 w-4 h-4 cursor-pointer" />
              </th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Barbero vinculado</th>
              <th className="px-4 py-3 text-left">% Comisión</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr><td colSpan={7} className="text-center text-slate-400 py-10">No hay usuarios</td></tr>
            )}
            {data.map(u => {
              const sel   = seleccionados.has(u.id)
              const esYo  = u.id === me?.id
              return (
                <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${sel ? 'bg-primary-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={sel} onChange={() => toggleUno(u.id)}
                      disabled={esYo}
                      className="accent-primary-500 w-4 h-4 cursor-pointer disabled:opacity-30" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => abrirEditar(u)}>
                      <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {u.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 hover:text-primary-600 transition-colors">{u.nombre}</p>
                        {esYo && <p className="text-xs text-primary-500">Tú</p>}
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
                    {u.rol === 'empleado' && u.barbero_id != null ? (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                        {getPct(u)}%
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
                      <button onClick={() => eliminar(u.id)} disabled={esYo}
                        className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
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
              {form.rol === 'empleado' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    % Comisión del barbero
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min="0" max="100" step="1"
                      value={form.porcentaje_comision}
                      onChange={e => setForm(f => ({ ...f, porcentaje_comision: Number(e.target.value) }))}
                      className="flex-1 accent-amber-500"
                    />
                    <input
                      type="number" min="0" max="100"
                      value={form.porcentaje_comision}
                      onChange={e => setForm(f => ({ ...f, porcentaje_comision: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                      className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                  {/* Barra visual */}
                  <div className="mt-2 h-2.5 rounded-full overflow-hidden bg-slate-100 flex">
                    <div className="bg-amber-400 transition-all duration-150" style={{ width: `${form.porcentaje_comision}%` }} />
                    <div className="bg-green-500 transition-all duration-150"  style={{ width: `${100 - form.porcentaje_comision}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>🟡 Barbero: <strong className="text-amber-700">{form.porcentaje_comision}%</strong></span>
                    <span>🟢 Admin: <strong className="text-green-700">{100 - form.porcentaje_comision}%</strong></span>
                  </div>
                </div>
              )}
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
