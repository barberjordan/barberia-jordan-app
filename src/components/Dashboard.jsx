import React, { useEffect, useState, useMemo } from 'react'
import { Calendar, Users, DollarSign, UserCheck, Clock, TrendingUp, Wallet, BadgeDollarSign, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']

function fmt(n) {
  return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatCard({ icon: Icon, label, value, color = 'primary', sub }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    blue:    'bg-blue-50 text-blue-600',
    green:   'bg-green-50 text-green-600',
    purple:  'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]             = useState(null)
  const [porDia, setPorDia]           = useState([])
  const [topSvc, setTopSvc]           = useState([])
  const [comisiones, setComisiones]   = useState([])
  const [historico, setHistorico]     = useState([])
  const [configPct, setConfigPct]     = useState([])   // [{barbero_id, porcentaje_barbero}]
  const [citas, setCitas]             = useState([])
  const [expandedBarbero, setExpandedBarbero] = useState(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function cargar() {
      const [s, d, t, c, h, cfg, allCitas] = await Promise.all([
        window.api.dashboard.getStats(),
        window.api.dashboard.getCitasPorDia(),
        window.api.dashboard.getTopServicios(),
        window.api.dashboard.getComisionesMes(),
        window.api.dashboard.getBalanceHistorico(6),
        window.api.comisiones.getConfig(),
        window.api.citas.getAll(),
      ])
      setStats(s)
      setPorDia(d.map(r => ({ ...r, fecha: r.fecha.slice(5) })))
      setTopSvc(t)
      setComisiones(c)
      setHistorico(h.map(r => ({ ...r, mes: r.mes.slice(5) }))) // solo MM
      setConfigPct(cfg)
      setCitas(allCitas)
      setLoading(false)
    }
    cargar()
  }, [])

  // ── hooks siempre antes del early return ──
  const mesKey = new Date().toISOString().slice(0, 7)

  // Servicios realizados por cada barbero este mes (solo completadas)
  const serviciosPorBarbero = useMemo(() => {
    const map = {}
    for (const c of citas) {
      if (!c.fecha?.startsWith(mesKey) || c.estado !== 'completada') continue
      const b = c.barbero_nombre || 'Sin asignar'
      if (!map[b]) map[b] = {}
      const svcs = (c.servicio_nombre || 'Sin servicio').split(' + ')
      for (const sv of svcs) {
        const t = sv.trim(); if (!t) continue
        map[b][t] = (map[b][t] || 0) + 1
      }
    }
    return map
  }, [citas, mesKey])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Cargando dashboard...</div>
  )

  const totalPagoBarberos  = comisiones.reduce((a, b) => a + Number(b.pago_barbero  || 0), 0)
  const totalGananciaAdmin = comisiones.reduce((a, b) => a + Number(b.ganancia_admin || 0), 0)
  const totalVentas        = comisiones.reduce((a, b) => a + Number(b.total_ventas   || 0), 0)
  const mesActual = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })

  // Promedio de ganancia admin en los últimos 6 meses
  const promedioAdmin = historico.length
    ? historico.reduce((a, r) => a + Number(r.ganancia_admin || 0), 0) / historico.length
    : 0

  // Porcentaje efectivo: si hay datos reales los calculamos, si no usamos la config
  const pctBarberoLabel = (() => {
    if (totalVentas > 0) {
      return Math.round(totalPagoBarberos / totalVentas * 100) + '%'
    }
    const pcts = configPct.map(c => c.porcentaje_barbero)
    if (pcts.length === 0) return '40%'
    const unico = pcts.every(p => p === pcts[0])
    return unico ? pcts[0] + '%' : pcts[0] + '%+'
  })()
  const pctAdminLabel = (() => {
    if (totalVentas > 0) {
      return Math.round(totalGananciaAdmin / totalVentas * 100) + '%'
    }
    const pcts = configPct.map(c => 100 - c.porcentaje_barbero)
    if (pcts.length === 0) return '60%'
    const unico = pcts.every(p => p === pcts[0])
    return unico ? pcts[0] + '%' : pcts[0] + '%+'
  })()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Calendar}       label="Citas hoy"            value={stats.citas_hoy}                    color="primary" />
        <StatCard icon={Clock}          label="Citas este mes"       value={stats.citas_mes}                    color="blue" />
        <StatCard icon={DollarSign}     label="Ingresos del mes"     value={`$${fmt(stats.ingresos_mes)}`}      color="green" />
        <StatCard icon={BadgeDollarSign} label="Tu ganancia este mes" value={`$${fmt(totalGananciaAdmin)}`}     color="green"
          sub="Solo citas completadas" />
        <StatCard icon={TrendingUp}     label="Promedio mensual (6m)" value={`$${fmt(promedioAdmin)}`}          color="purple"
          sub="Tu ganancia promedio" />
        <StatCard icon={UserCheck}      label="Citas pendientes"     value={stats.citas_pendientes}             color="blue" />
      </div>

      {/* ==================== COMISIONES DEL MES ==================== */}
      <div>
        <h2 className="text-base font-bold text-slate-700 mb-3">
          Liquidación del mes — <span className="capitalize text-primary-600">{mesActual}</span>
          <span className="ml-2 text-xs font-normal text-slate-400">(solo citas completadas · % configurado por barbero)</span>
        </h2>

        {/* Resumen total */}
        <div className="mb-4 grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-2xl">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-700 font-medium">Total a pagar a barberos ({pctBarberoLabel})</p>
              <p className="text-xl font-bold text-amber-800">${fmt(totalPagoBarberos)}</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
              <BadgeDollarSign size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">Ganancia del dueño ({pctAdminLabel})</p>
              <p className="text-xl font-bold text-green-800">${fmt(totalGananciaAdmin)}</p>
            </div>
          </div>
        </div>

        {/* Tabla por barbero */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Barbero</th>
                <th className="px-4 py-3 text-right">Citas</th>
                <th className="px-4 py-3 text-right">Total Servicios</th>
                <th className="px-4 py-3 text-right">Comisión barbero</th>
                <th className="px-4 py-3 text-right">Ganancia dueño</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comisiones.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-8 text-sm">
                    No hay citas completadas este mes
                  </td>
                </tr>
              )}
              {comisiones.map(b => {
                const svcs    = serviciosPorBarbero[b.barbero] || {}
                const expanded = expandedBarbero === b.id
                return (
                  <React.Fragment key={b.id}>
                    <tr
                      className="hover:bg-slate-50 transition-colors cursor-pointer select-none"
                      onClick={() => setExpandedBarbero(expanded ? null : b.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {b.barbero.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-800">{b.barbero}</span>
                          <span className="text-slate-300 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{b.citas_completadas}</td>
                      <td className="px-4 py-3 text-right text-slate-700">${fmt(b.total_ventas)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-amber-600">${fmt(b.pago_barbero)}</span>
                        <span className="ml-1 text-xs text-slate-400">({b.pct_barbero}%)</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-green-600">${fmt(b.ganancia_admin)}</span>
                        <span className="ml-1 text-xs text-slate-400">({100 - b.pct_barbero}%)</span>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={5} className="px-0 py-0">
                          <div className="px-12 py-3 bg-slate-50 border-t border-slate-100">
                            {Object.keys(svcs).length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Sin servicios registrados este mes</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(svcs)
                                  .sort((a, b) => b[1] - a[1])
                                  .map(([svc, count]) => (
                                    <span key={svc} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                                      {svc}
                                      <span className="bg-primary-100 text-primary-700 rounded-full px-1.5 py-0.5 font-bold text-xs ml-1">×{count}</span>
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {comisiones.length > 0 && (
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {comisiones.reduce((a, b) => a + Number(b.citas_completadas || 0), 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    ${fmt(comisiones.reduce((a, b) => a + Number(b.total_ventas || 0), 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600">${fmt(totalPagoBarberos)}</td>
                  <td className="px-4 py-3 text-right text-green-600">${fmt(totalGananciaAdmin)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== BALANCE ÚLTIMOS 6 MESES ==================== */}
      {historico.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-1">Balance últimos 6 meses</h2>
          <p className="text-xs text-slate-400 mb-4">Evolución de ingresos totales vs tu ganancia</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={historico} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, name) => [`$${fmt(v)}`, name]} />
              <Bar dataKey="total_ventas"  name="Total ingresos"  fill="#93c5fd" radius={[3,3,0,0]} />
              <Bar dataKey="ganancia_admin" name="Tu ganancia"    fill="#22c55e" radius={[3,3,0,0]} />
              <Bar dataKey="pago_barberos"  name="Pago barberos"  fill="#fbbf24" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          {/* Resumen numérico */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Total generado', val: historico.reduce((a,r)=>a+Number(r.total_ventas||0),0), color: 'text-blue-600' },
              { label: 'Tu ganancia total', val: historico.reduce((a,r)=>a+Number(r.ganancia_admin||0),0), color: 'text-green-600' },
              { label: 'Pagado a barberos', val: historico.reduce((a,r)=>a+Number(r.pago_barberos||0),0), color: 'text-amber-600' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`font-bold text-sm mt-0.5 ${color}`}>${fmt(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Citas últimos 7 días</h2>
          {porDia.length === 0
            ? <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porDia}>
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="rgb(var(--p-500))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Servicios más solicitados</h2>
          {topSvc.length === 0
            ? <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={topSvc} dataKey="total" nameKey="nombre" cx="50%" cy="50%" outerRadius={70} label>
                    {topSvc.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>
    </div>
  )
}
