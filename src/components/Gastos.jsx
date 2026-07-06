import React, { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Zap, Droplets, Package, Home, Users, HelpCircle } from 'lucide-react'

function fmt(n) {
  return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CATEGORIAS = [
  { value: 'luz',       label: 'Luz',       icon: Zap,        color: 'bg-yellow-100 text-yellow-700' },
  { value: 'agua',      label: 'Agua',      icon: Droplets,   color: 'bg-blue-100 text-blue-700' },
  { value: 'insumos',   label: 'Insumos',   icon: Package,    color: 'bg-orange-100 text-orange-700' },
  { value: 'alquiler',  label: 'Alquiler',  icon: Home,       color: 'bg-purple-100 text-purple-700' },
  { value: 'sueldo',    label: 'Sueldo',    icon: Users,      color: 'bg-green-100 text-green-700' },
  { value: 'otro',      label: 'Otro',      icon: HelpCircle, color: 'bg-slate-100 text-slate-600' },
]

const FRECUENCIAS = [
  { value: 'diario',   label: 'Diario' },
  { value: 'semanal',  label: 'Semanal' },
  { value: 'mensual',  label: 'Mensual' },
  { value: 'unico',    label: 'Único' },
]

const EMPTY = {
  nombre: '', categoria: 'otro', monto: '', frecuencia: 'mensual',
  fecha: new Date().toISOString().slice(0, 10), notas: '',
}

function CategoriaChip({ value }) {
  const cat = CATEGORIAS.find(c => c.value === value) || CATEGORIAS[CATEGORIAS.length - 1]
  const Icon = cat.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cat.color}`}>
      <Icon size={11} />
      {cat.label}
    </span>
  )
}

function FrecuenciaChip({ value }) {
  const map = { diario: 'bg-red-100 text-red-700', semanal: 'bg-blue-100 text-blue-700', mensual: 'bg-indigo-100 text-indigo-700', unico: 'bg-slate-100 text-slate-500' }
  const labels = { diario: 'Diario', semanal: 'Semanal', mensual: 'Mensual', unico: 'Único' }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[value] || map.unico}`}>
      {labels[value] || value}
    </span>
  )
}

export default function Gastos() {
  const [gastos, setGastos]             = useState([])
  const [modalOpen, setModalOpen]       = useState(false)
  const [editando, setEditando]         = useState(null)
  const [form, setForm]                 = useState({ ...EMPTY })
  const [guardando, setGuardando]       = useState(false)
  const [filtroCat, setFiltroCat]       = useState('todas')
  const [filtroFrec, setFiltroFrec]     = useState('todas')
  const [mes, setMes]                   = useState(new Date().toISOString().slice(0, 7))

  async function cargar() {
    const data = await window.api.gastos.getAll()
    setGastos(data)
  }
  useEffect(() => { cargar() }, [])

  // Gastos del mes seleccionado
  const gastosMes = useMemo(() =>
    gastos.filter(g => g.fecha?.startsWith(mes))
  , [gastos, mes])

  // Filtrados
  const gastosFiltrados = useMemo(() => {
    let list = gastosMes
    if (filtroCat !== 'todas') list = list.filter(g => g.categoria === filtroCat)
    if (filtroFrec !== 'todas') list = list.filter(g => g.frecuencia === filtroFrec)
    return list
  }, [gastosMes, filtroCat, filtroFrec])

  // Totales del mes por frecuencia
  const totalMes     = gastosMes.reduce((a, g) => a + Number(g.monto || 0), 0)
  const totalDiario  = gastosMes.filter(g => g.frecuencia === 'diario').reduce((a, g) => a + Number(g.monto), 0)
  const totalSemanal = gastosMes.filter(g => g.frecuencia === 'semanal').reduce((a, g) => a + Number(g.monto), 0)
  const totalMensual = gastosMes.filter(g => g.frecuencia === 'mensual').reduce((a, g) => a + Number(g.monto), 0)

  function abrirNuevo() {
    setEditando(null)
    setForm({ ...EMPTY })
    setModalOpen(true)
  }

  function abrirEditar(g) {
    setEditando(g.id)
    setForm({
      nombre: g.nombre, categoria: g.categoria, monto: String(g.monto),
      frecuencia: g.frecuencia, fecha: g.fecha || EMPTY.fecha, notas: g.notas || '',
    })
    setModalOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim() || !form.monto) return
    setGuardando(true)
    const data = { ...form, monto: Number(form.monto) }
    if (editando) {
      await window.api.gastos.update(editando, data)
    } else {
      await window.api.gastos.create(data)
    }
    setGuardando(false)
    setModalOpen(false)
    cargar()
  }

  async function eliminar(id) {
    const ok = await window.api.dialog.confirm('¿Eliminar este gasto?')
    if (!ok) return
    await window.api.gastos.delete(id)
    cargar()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Gastos</h1>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white
            text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm">
          <Plus size={16} /> Nuevo gasto
        </button>
      </div>

      {/* Selector de mes + filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />

        <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
          <option value="todas">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select value={filtroFrec} onChange={e => setFiltroFrec(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
          <option value="todas">Todas las frecuencias</option>
          {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Total del mes',     value: totalMes,     color: 'text-red-600',    bg: 'bg-red-50 border-red-100' },
          { label: 'Gastos mensuales',  value: totalMensual, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
          { label: 'Gastos semanales',  value: totalSemanal, color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100' },
          { label: 'Gastos diarios',    value: totalDiario,  color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl p-4`}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>${fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Frecuencia</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gastosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-10 text-sm">
                  No hay gastos registrados para este período
                </td>
              </tr>
            )}
            {gastosFiltrados.map(g => (
              <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{g.nombre}</p>
                  {g.notas && <p className="text-xs text-slate-400 mt-0.5">{g.notas}</p>}
                </td>
                <td className="px-4 py-3"><CategoriaChip value={g.categoria} /></td>
                <td className="px-4 py-3"><FrecuenciaChip value={g.frecuencia} /></td>
                <td className="px-4 py-3 text-slate-500">{g.fecha || '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">${fmt(g.monto)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => abrirEditar(g)}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => eliminar(g.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {gastosFiltrados.length > 0 && (
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={4} className="px-4 py-3 text-slate-600">Total filtrado</td>
                <td className="px-4 py-3 text-right text-red-600">
                  ${fmt(gastosFiltrados.reduce((a, g) => a + Number(g.monto || 0), 0))}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== MODAL ==================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">
                {editando ? 'Editar gasto' : 'Nuevo gasto'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => f('nombre', e.target.value)}
                  placeholder="Ej: Factura de luz julio"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Categoría</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIAS.map(cat => {
                    const Icon = cat.icon
                    const sel = form.categoria === cat.value
                    return (
                      <button key={cat.value} type="button" onClick={() => f('categoria', cat.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                          sel ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>
                        <Icon size={13} />
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Monto + Frecuencia */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Monto *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={form.monto} onChange={e => f('monto', e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Frecuencia</label>
                  <select value={form.frecuencia} onChange={e => f('frecuencia', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                    {FRECUENCIAS.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de pago</label>
                <input type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => f('notas', e.target.value)}
                  rows={2} placeholder="Opcional..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando || !form.nombre.trim() || !form.monto}
                className="px-5 py-2 text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-50">
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
