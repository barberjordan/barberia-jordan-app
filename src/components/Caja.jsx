import React, { useEffect, useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, BadgeDollarSign, Plus, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

function fmt(n) {
  return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const EMPTY_MOV = { tipo: 'entrada', concepto: '', monto: '', notas: '' }

export default function Caja() {
  const [fecha, setFecha]             = useState(() => new Date().toISOString().slice(0, 10))
  const [citas, setCitas]             = useState([])
  const [gastosDia, setGastosDia]     = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [configPct, setConfigPct]     = useState([])
  const [modalOpen, setModalOpen]     = useState(false)
  const [form, setForm]               = useState({ ...EMPTY_MOV })
  const [guardando, setGuardando]     = useState(false)

  async function cargar() {
    const [c, g, m, cfg] = await Promise.all([
      window.api.citas.getAll(),
      window.api.gastos.getByFecha(fecha),
      window.api.caja.getByFecha(fecha),
      window.api.comisiones.getConfig(),
    ])
    setCitas(c)
    setGastosDia(g)
    setMovimientos(m)
    setConfigPct(cfg)
  }

  useEffect(() => { cargar() }, [fecha])

  // Citas completadas del día
  const citasDia = useMemo(() =>
    citas.filter(c => c.fecha === fecha && c.estado === 'completada')
  , [citas, fecha])

  const ingresosDia = useMemo(() =>
    citasDia.reduce((a, c) => a + Number(c.precio_total || 0), 0)
  , [citasDia])

  // Liquidación por barbero del día (para desglose)
  const liquidacionDia = useMemo(() => {
    const map = {}
    for (const c of citasDia) {
      const key = c.barbero_nombre || 'Sin asignar'
      const pct = configPct.find(p => p.barbero_id === c.barbero_id)?.porcentaje_barbero ?? 55
      if (!map[key]) map[key] = { nombre: key, citas: 0, total: 0, pct }
      map[key].citas++
      map[key].total += Number(c.precio_total || 0)
    }
    return Object.values(map).map(b => ({
      ...b,
      pagoBarbero:   b.total * b.pct / 100,
      gananciaAdmin: b.total * (100 - b.pct) / 100,
    }))
  }, [citasDia, configPct])

  const gananciaAdmin = liquidacionDia.reduce((a, b) => a + b.gananciaAdmin, 0)
  const totalGastos   = gastosDia.reduce((a, g) => a + Number(g.monto || 0), 0)
  const totalEntradas = movimientos.filter(m => m.tipo === 'entrada').reduce((a, m) => a + Number(m.monto || 0), 0)
  const totalSalidas  = movimientos.filter(m => m.tipo === 'salida').reduce((a, m) => a + Number(m.monto || 0), 0)
  const balanceNeto   = gananciaAdmin - totalGastos + totalEntradas - totalSalidas

  function prevDay() { const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() - 1); setFecha(d.toISOString().slice(0, 10)) }
  function nextDay() { const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() + 1); setFecha(d.toISOString().slice(0, 10)) }
  const esHoy = fecha === new Date().toISOString().slice(0, 10)
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  async function guardarMovimiento() {
    if (!form.concepto.trim() || !form.monto) return
    setGuardando(true)
    const hora = new Date().toTimeString().slice(0, 5)
    await window.api.caja.create({ ...form, monto: Number(form.monto), fecha, hora })
    setGuardando(false)
    setModalOpen(false)
    setForm({ ...EMPTY_MOV })
    cargar()
  }

  async function eliminarMovimiento(id) {
    const ok = await window.api.dialog.confirm('¿Eliminar este movimiento?')
    if (!ok) return
    await window.api.caja.delete(id)
    cargar()
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">

      {/* Header con fecha */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Caja</h1>
          <p className="text-sm text-slate-400 capitalize">{fechaLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={prevDay}
            className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 text-xl leading-none">‹</button>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <button onClick={nextDay}
            className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 text-xl leading-none">›</button>
          {!esHoy && (
            <button onClick={() => setFecha(new Date().toISOString().slice(0, 10))}
              className="text-xs px-3 py-2 border border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition">
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Resumen del día — 4 tarjetas */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Ingresos */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-green-700 font-medium">Ingresos del día</p>
            <p className="text-xl font-bold text-green-800">${fmt(ingresosDia)}</p>
            <p className="text-xs text-green-600">{citasDia.length} cita{citasDia.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Gastos */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-red-700 font-medium">Gastos del día</p>
            <p className="text-xl font-bold text-red-800">${fmt(totalGastos)}</p>
            <p className="text-xs text-red-600">{gastosDia.length} gasto{gastosDia.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Movimientos neto */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-blue-700 font-medium">Movimientos</p>
            <p className="text-xl font-bold text-blue-800">
              {totalEntradas - totalSalidas >= 0 ? '+' : ''}${fmt(totalEntradas - totalSalidas)}
            </p>
            <p className="text-xs text-blue-600">↑${fmt(totalEntradas)} ↓${fmt(totalSalidas)}</p>
          </div>
        </div>

        {/* Balance neto */}
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${
          balanceNeto >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-200'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            balanceNeto >= 0 ? 'bg-amber-500' : 'bg-red-600'
          }`}>
            <BadgeDollarSign size={18} className="text-white" />
          </div>
          <div>
            <p className={`text-xs font-medium ${balanceNeto >= 0 ? 'text-amber-700' : 'text-red-700'}`}>Balance neto</p>
            <p className={`text-xl font-bold ${balanceNeto >= 0 ? 'text-amber-800' : 'text-red-800'}`}>
              {balanceNeto >= 0 ? '' : '−'}${fmt(Math.abs(balanceNeto))}
            </p>
            <p className="text-xs text-slate-500">Tu ganancia − gastos</p>
          </div>
        </div>
      </div>

      {/* Fórmula visual */}
      <div className="bg-white border border-slate-100 rounded-xl px-5 py-4 flex flex-wrap items-center gap-2 text-sm text-slate-600 shadow-sm">
        <span className="font-medium text-green-700">${fmt(gananciaAdmin)} ganancia</span>
        <span className="text-slate-400">−</span>
        <span className="font-medium text-red-600">${fmt(totalGastos)} gastos</span>
        <span className="text-slate-400">+</span>
        <span className="font-medium text-blue-600">${fmt(totalEntradas)} entradas</span>
        <span className="text-slate-400">−</span>
        <span className="font-medium text-orange-600">${fmt(totalSalidas)} salidas</span>
        <span className="text-slate-300 mx-1">=</span>
        <span className={`font-bold text-base ${balanceNeto >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
          ${fmt(balanceNeto)}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ==================== DESGLOSE DE INGRESOS ==================== */}
        <div>
          <h2 className="text-sm font-bold text-slate-700 mb-3">Desglose de ingresos del día</h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Barbero</th>
                  <th className="px-4 py-2.5 text-right">Citas</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Tu ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liquidacionDia.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-400 py-8 text-sm">
                      Sin citas completadas
                    </td>
                  </tr>
                )}
                {liquidacionDia.map(b => (
                  <tr key={b.nombre} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {b.nombre.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800">{b.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{b.citas}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">${fmt(b.total)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-600">${fmt(b.gananciaAdmin)}</td>
                  </tr>
                ))}
                {liquidacionDia.length > 0 && (
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-4 py-2.5 text-slate-700">Total</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{citasDia.length}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">${fmt(ingresosDia)}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">${fmt(gananciaAdmin)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Gastos del día */}
          {gastosDia.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-bold text-slate-700 mb-2">Gastos del día</h2>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {gastosDia.map(g => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-700">{g.nombre}</p>
                          <p className="text-xs text-slate-400 capitalize">{g.categoria} · {g.frecuencia}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">${fmt(g.monto)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-2.5 text-slate-600">Total gastos</td>
                      <td className="px-4 py-2.5 text-right text-red-600">${fmt(totalGastos)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ==================== MOVIMIENTOS MANUALES ==================== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Movimientos manuales</h2>
            <button onClick={() => { setForm({ ...EMPTY_MOV }); setModalOpen(true) }}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition">
              <Plus size={13} /> Agregar
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Concepto</th>
                  <th className="px-4 py-2.5 text-left">Hora</th>
                  <th className="px-4 py-2.5 text-right">Monto</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-400 py-8 text-sm">
                      Sin movimientos manuales
                    </td>
                  </tr>
                )}
                {movimientos.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {m.tipo === 'entrada'
                          ? <ArrowUpCircle size={15} className="text-green-500 shrink-0" />
                          : <ArrowDownCircle size={15} className="text-red-500 shrink-0" />}
                        <div>
                          <p className="font-medium text-slate-800">{m.concepto}</p>
                          {m.notas && <p className="text-xs text-slate-400">{m.notas}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{m.hora || '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${
                      m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {m.tipo === 'entrada' ? '+' : '−'}${fmt(m.monto)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => eliminarMovimiento(m.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {movimientos.length > 0 && (
                  <tr className="bg-slate-50">
                    <td colSpan={2} className="px-4 py-2.5 text-xs text-slate-500">
                      <span className="text-green-600 font-semibold">↑ ${fmt(totalEntradas)}</span>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className="text-red-600 font-semibold">↓ ${fmt(totalSalidas)}</span>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-bold ${
                      totalEntradas - totalSalidas >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {totalEntradas - totalSalidas >= 0 ? '+' : '−'}${fmt(Math.abs(totalEntradas - totalSalidas))}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================== MODAL MOVIMIENTO ==================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">Nuevo movimiento</h2>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {['entrada', 'salida'].map(tipo => (
                  <button key={tipo} type="button" onClick={() => f('tipo', tipo)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${
                      form.tipo === tipo
                        ? tipo === 'entrada'
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-red-400 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    {tipo === 'entrada'
                      ? <><ArrowUpCircle size={16} /> Entrada</>
                      : <><ArrowDownCircle size={16} /> Salida</>}
                  </button>
                ))}
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Concepto *</label>
                <input value={form.concepto} onChange={e => f('concepto', e.target.value)}
                  placeholder="Ej: Retiro de caja, Pago insumos..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" value={form.monto} onChange={e => f('monto', e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notas</label>
                <input value={form.notas} onChange={e => f('notas', e.target.value)}
                  placeholder="Opcional..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={guardarMovimiento} disabled={guardando || !form.concepto.trim() || !form.monto}
                className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition disabled:opacity-50 ${
                  form.tipo === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                }`}>
                {guardando ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
