import React, { useEffect, useState } from 'react'
import { Calendar, Users, DollarSign, UserCheck, Clock, TrendingUp, Wallet, BadgeDollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

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
  const [stats, setStats]         = useState(null)
  const [porDia, setPorDia]       = useState([])
  const [topSvc, setTopSvc]       = useState([])
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function cargar() {
      const [s, d, t, c] = await Promise.all([
        window.api.dashboard.getStats(),
        window.api.dashboard.getCitasPorDia(),
        window.api.dashboard.getTopServicios(),
        window.api.dashboard.getComisionesMes(),
      ])
      setStats(s)
      setPorDia(d.map(r => ({ ...r, fecha: r.fecha.slice(5) })))
      setTopSvc(t)
      setComisiones(c)
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">Cargando dashboard...</div>
  )

  const totalPagoBarberos = comisiones.reduce((a, b) => a + Number(b.pago_barbero || 0), 0)
  const totalGananciaAdmin = comisiones.reduce((a, b) => a + Number(b.ganancia_admin || 0), 0)
  const mesActual = new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })

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
        <StatCard icon={Calendar}     label="Citas hoy"        value={stats.citas_hoy}        color="primary" />
        <StatCard icon={Clock}        label="Citas este mes"   value={stats.citas_mes}        color="blue" />
        <StatCard icon={DollarSign}   label="Ingresos mes"     value={`$${fmt(stats.ingresos_mes)}`} color="green" />
        <StatCard icon={Users}        label="Total clientes"   value={stats.total_clientes}   color="purple" />
        <StatCard icon={UserCheck}    label="Barberos activos" value={stats.barberos_activos} color="primary" />
        <StatCard icon={TrendingUp}   label="Citas pendientes" value={stats.citas_pendientes} color="blue" />
      </div>

      {/* ==================== COMISIONES DEL MES ==================== */}
      <div>
        <h2 className="text-base font-bold text-slate-700 mb-3">
          Liquidación del mes — <span className="capitalize text-primary-600">{mesActual}</span>
          <span className="ml-2 text-xs font-normal text-slate-400">(solo citas completadas · 40% barbero / 60% admin)</span>
        </h2>

        {/* Resumen total */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-700 font-medium">Total a pagar a barberos (40%)</p>
              <p className="text-xl font-bold text-amber-800">${fmt(totalPagoBarberos)}</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
              <BadgeDollarSign size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">Ganancia del dueño (60%)</p>
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
                <th className="px-4 py-3 text-right">Total vendido</th>
                <th className="px-4 py-3 text-right">Pago barbero (40%)</th>
                <th className="px-4 py-3 text-right">Ganancia admin (60%)</th>
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
              {comisiones.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                        {b.barbero.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{b.barbero}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{b.citas_completadas}</td>
                  <td className="px-4 py-3 text-right text-slate-700">${fmt(b.total_ventas)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-amber-600">${fmt(b.pago_barbero)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-green-600">${fmt(b.ganancia_admin)}</span>
                  </td>
                </tr>
              ))}
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
