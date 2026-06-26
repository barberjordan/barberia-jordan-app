import React, { useEffect, useState, useMemo } from 'react'
import { FileSpreadsheet, FileText, Wallet, BadgeDollarSign, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function fmt(n) {
  return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Reportes() {
  const [citas, setCitas]           = useState([])
  const [comisiones, setComisiones] = useState([])
  const [historico, setHistorico]   = useState([])
  const [configPct, setConfigPct]   = useState([])
  const [mes, setMes]               = useState(new Date().toISOString().slice(0, 7))
  const [expandedBarbero, setExpandedBarbero] = useState(null)

  useEffect(() => {
    async function cargar() {
      const mesInicio = mes + '-01'
      const [c, com, h, cfg] = await Promise.all([
        window.api.citas.getAll(),
        window.api.dashboard.getComisionesMes(mesInicio),
        window.api.dashboard.getBalanceHistorico(6),
        window.api.comisiones.getConfig(),
      ])
      setCitas(c)
      setComisiones(com)
      setHistorico(h)
      setConfigPct(cfg)
    }
    cargar()
  }, [mes])

  const promedioAdmin = historico.length
    ? historico.reduce((a, r) => a + Number(r.ganancia_admin || 0), 0) / historico.length
    : 0

  const citasMes      = citas.filter(c => c.fecha?.startsWith(mes))
  const completadas   = citasMes.filter(c => c.estado === 'completada')
  const ingresosMes   = completadas.reduce((a, c) => a + Number(c.precio_total), 0)
  const totalBarberos = comisiones.reduce((a, b) => a + Number(b.pago_barbero || 0), 0)
  const totalAdmin    = comisiones.reduce((a, b) => a + Number(b.ganancia_admin || 0), 0)

  // Servicios por barbero (solo citas completadas del mes)
  const serviciosPorBarbero = useMemo(() => {
    const map = {}
    for (const c of completadas) {
      const b = c.barbero_nombre || 'Sin asignar'
      if (!map[b]) map[b] = {}
      const svcs = (c.servicio_nombre || 'Sin servicio').split(' + ')
      for (const sv of svcs) {
        const t = sv.trim(); if (!t) continue
        map[b][t] = (map[b][t] || 0) + 1
      }
    }
    return map
  }, [completadas])

  // Porcentajes dinámicos según config o datos reales del mes
  const pctBarberoLabel = (() => {
    if (ingresosMes > 0) return Math.round(totalBarberos / ingresosMes * 100) + '%'
    const pcts = configPct.map(c => c.porcentaje_barbero)
    if (pcts.length === 0) return '40%'
    return pcts.every(p => p === pcts[0]) ? pcts[0] + '%' : pcts[0] + '%+'
  })()
  const pctAdminLabel = (() => {
    if (ingresosMes > 0) return Math.round(totalAdmin / ingresosMes * 100) + '%'
    const pcts = configPct.map(c => 100 - c.porcentaje_barbero)
    if (pcts.length === 0) return '60%'
    return pcts.every(p => p === pcts[0]) ? pcts[0] + '%' : pcts[0] + '%+'
  })()

  // Citas por día para la gráfica
  const porDia = citasMes.reduce((acc, c) => {
    const d = c.fecha?.slice(8) || '??'
    acc[d] = (acc[d] || 0) + 1
    return acc
  }, {})
  const dataDia = Object.entries(porDia)
    .map(([dia, total]) => ({ dia, total }))
    .sort((a, b) => a.dia.localeCompare(b.dia))

  // Por barbero para la gráfica
  const porBarbero = citasMes.reduce((acc, c) => {
    const k = c.barbero_nombre || 'Sin asignar'
    if (!acc[k]) acc[k] = { nombre: k, citas: 0, ingresos: 0 }
    acc[k].citas++
    if (c.estado === 'completada') acc[k].ingresos += Number(c.precio_total)
    return acc
  }, {})
  const dataBarbero = Object.values(porBarbero)

  // ==================== EXPORTAR EXCEL ====================
  function exportarExcel() {
    const wb = XLSX.utils.book_new()

    // Hoja 1: Citas
    const wsCitas = XLSX.utils.json_to_sheet(citasMes.map(c => ({
      Fecha: c.fecha, Hora: c.hora,
      Cliente: c.cliente_nombre, Barbero: c.barbero_nombre,
      Servicio: c.servicio_nombre, Estado: c.estado,
      'Precio ($)': c.precio_total,
    })))
    XLSX.utils.book_append_sheet(wb, wsCitas, 'Citas')

    // Hoja 2: Liquidación
    const wsLiq = XLSX.utils.json_to_sheet([
      ['LIQUIDACIÓN DE BARBEROS — ' + mes], [],
      ['Barbero', 'Citas completadas', 'Total vendido ($)', 'Comisión barbero ($)', 'Ganancia dueño ($)'],
      ...comisiones.map(b => [
        b.barbero,
        b.citas_completadas,
        Number(b.total_ventas).toFixed(2),
        Number(b.pago_barbero).toFixed(2),
        Number(b.ganancia_admin).toFixed(2),
      ]),
      [],
      ['TOTALES', comisiones.reduce((a,b)=>a+Number(b.citas_completadas||0),0),
       ingresosMes.toFixed(2), totalBarberos.toFixed(2), totalAdmin.toFixed(2)],
    ], { skipHeader: true })
    XLSX.utils.book_append_sheet(wb, wsLiq, 'Liquidación')

    XLSX.writeFile(wb, `reporte_${mes}.xlsx`)
  }

  // ==================== EXPORTAR PDF ====================
  function exportarPDF() {
    const doc = new jsPDF()
    const PRIMARY = [249, 115, 22]  // naranja

    // Encabezado
    doc.setFontSize(16)
    doc.setTextColor(...PRIMARY)
    doc.text(`Reporte — ${mes}`, 14, 18)
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(10)
    doc.text(
      `Citas: ${citasMes.length}  |  Completadas: ${completadas.length}  |  Ingresos: $${fmt(ingresosMes)}`,
      14, 26
    )

    // Tabla de citas
    autoTable(doc, {
      startY: 32,
      head: [['Fecha', 'Hora', 'Cliente', 'Barbero', 'Servicio', 'Estado', 'Precio']],
      body: citasMes.map(c => [
        c.fecha || '', c.hora || '', c.cliente_nombre || '', c.barbero_nombre || '',
        c.servicio_nombre || '', c.estado, `$${Number(c.precio_total).toFixed(2)}`
      ]),
      headStyles: { fillColor: PRIMARY },
      styles: { fontSize: 7.5 },
    })

    // Liquidación de barberos
    const y2 = doc.lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setTextColor(...PRIMARY)
    doc.text(`Liquidación de barberos (barbero ${pctBarberoLabel} / dueño ${pctAdminLabel})`, 14, y2)
    doc.setTextColor(60, 60, 60)

    autoTable(doc, {
      startY: y2 + 4,
      head: [['Barbero', 'Citas', 'Total vendido', 'Comisión barbero', 'Ganancia dueño']],
      body: [
        ...comisiones.map(b => [
          b.barbero,
          b.citas_completadas,
          `$${fmt(b.total_ventas)}`,
          `$${fmt(b.pago_barbero)} (${b.pct_barbero}%)`,
          `$${fmt(b.ganancia_admin)} (${100 - b.pct_barbero}%)`,
        ]),
        [
          { content: 'TOTAL', styles: { fontStyle: 'bold' } },
          { content: comisiones.reduce((a,b)=>a+Number(b.citas_completadas||0),0), styles: { fontStyle: 'bold' } },
          { content: `$${fmt(ingresosMes)}`, styles: { fontStyle: 'bold' } },
          { content: `$${fmt(totalBarberos)}`, styles: { fontStyle: 'bold', textColor: [180, 100, 0] } },
          { content: `$${fmt(totalAdmin)}`, styles: { fontStyle: 'bold', textColor: [22, 101, 52] } },
        ],
      ],
      headStyles: { fillColor: PRIMARY },
      styles: { fontSize: 8 },
      footStyles: { fillColor: [245, 245, 245] },
    })

    doc.save(`reporte_${mes}.pdf`)
  }

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Reportes</h1>
        <div className="flex items-center gap-3">
          <input
            type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <button onClick={exportarExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white
              text-sm font-medium px-3 py-1.5 rounded-lg transition">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={exportarPDF}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white
              text-sm font-medium px-3 py-1.5 rounded-lg transition">
            <FileText size={15} /> PDF
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total citas',        value: citasMes.length,         color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Completadas',        value: completadas.length,      color: 'text-green-600',   bg: 'bg-green-50' },
          { label: 'Ingresos del mes',   value: `$${fmt(ingresosMes)}`,  color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Tu ganancia',        value: `$${fmt(totalAdmin)}`,   color: 'text-green-700',   bg: 'bg-green-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 border border-slate-100`}>
            <p className="text-slate-500 text-xs">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Balance y promedio */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
            <BadgeDollarSign size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-green-700 font-medium">Tu ganancia — {mes}</p>
            <p className="text-2xl font-bold text-green-800">${fmt(totalAdmin)}</p>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-purple-700 font-medium">Promedio mensual (6 meses)</p>
            <p className="text-2xl font-bold text-purple-800">${fmt(promedioAdmin)}</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-amber-700 font-medium">Pago total barberos — {mes}</p>
            <p className="text-2xl font-bold text-amber-800">${fmt(totalBarberos)}</p>
          </div>
        </div>
      </div>

      {/* ==================== LIQUIDACIÓN DE BARBEROS ==================== */}
      <div>
        <h2 className="text-base font-bold text-slate-700 mb-1">
          Liquidación de barberos
          <span className="ml-2 text-xs font-normal text-slate-400">
            {pctBarberoLabel} barbero · {pctAdminLabel} admin · solo citas completadas
          </span>
        </h2>

        {/* Totales */}
        <div className="mb-3 grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-2xl">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-700 font-medium">A pagar a barberos ({pctBarberoLabel})</p>
              <p className="text-lg font-bold text-amber-800">${fmt(totalBarberos)}</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
              <BadgeDollarSign size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">Ganancia del dueño ({pctAdminLabel})</p>
              <p className="text-lg font-bold text-green-800">${fmt(totalAdmin)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Barbero</th>
                <th className="px-4 py-3 text-right">Citas</th>
                <th className="px-4 py-3 text-right">Total vendido</th>
                <th className="px-4 py-3 text-right">Comisión barbero</th>
                <th className="px-4 py-3 text-right">Ganancia dueño</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comisiones.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-8">
                    No hay citas completadas en {mes}
                  </td>
                </tr>
              )}
              {comisiones.map(b => {
                const svcs    = serviciosPorBarbero[b.barbero] || {}
                const expanded = expandedBarbero === b.id
                return (
                  <React.Fragment key={b.id}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer select-none"
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
                      <td className="px-4 py-3 text-right font-semibold text-amber-600">
                        ${fmt(b.pago_barbero)}
                        <span className="ml-1 text-xs text-slate-400">({b.pct_barbero}%)</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        ${fmt(b.ganancia_admin)}
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
                <tr className="bg-slate-50 font-bold text-sm">
                  <td className="px-4 py-3 text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {comisiones.reduce((a,b)=>a+Number(b.citas_completadas||0),0)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">${fmt(ingresosMes)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">${fmt(totalBarberos)}</td>
                  <td className="px-4 py-3 text-right text-green-600">${fmt(totalAdmin)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Citas por día</h2>
          {dataDia.length === 0
            ? <p className="text-center text-slate-400 py-8 text-sm">Sin datos para este mes</p>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dataDia}>
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="rgb(var(--p-500))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Rendimiento por barbero</h2>
          {dataBarbero.length === 0
            ? <p className="text-center text-slate-400 py-8 text-sm">Sin datos para este mes</p>
            : (
              <div className="space-y-3 mt-2">
                {dataBarbero.map(b => (
                  <div key={b.nombre} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 font-medium">{b.nombre}</span>
                    <div className="flex items-center gap-4 text-slate-500">
                      <span>{b.citas} citas</span>
                      <span className="font-semibold text-green-600">${fmt(b.ingresos)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Tabla detalle citas */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Detalle de citas — {mes}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Barbero</th>
                <th className="px-4 py-3 text-left">Servicio</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {citasMes.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-400 py-10">Sin citas este mes</td></tr>
              )}
              {citasMes.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{c.fecha || '—'} {c.hora || ''}</td>
                  <td className="px-4 py-3 text-slate-700">{c.cliente_nombre || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.barbero_nombre || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.servicio_nombre || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      c.estado === 'completada' ? 'bg-green-100 text-green-700' :
                      c.estado === 'cancelada'  ? 'bg-red-100 text-red-700' :
                      c.estado === 'confirmada' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{c.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    ${fmt(c.precio_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
