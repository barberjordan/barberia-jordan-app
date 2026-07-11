import React, { useEffect, useState, useMemo } from 'react'

// Fecha local (evita bug UTC: toISOString devuelve mañana después de las 21hs en Argentina)
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
import {
  Banknote, CreditCard, TrendingUp, TrendingDown, BadgeDollarSign,
  Plus, Trash2, ArrowUpCircle, ArrowDownCircle, ChevronUp, Check,
  Briefcase, Split
} from 'lucide-react'

function fmt(n) {
  return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function MetodoBadge({ metodo }) {
  if (metodo === 'transferencia')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><CreditCard size={10} /> Transf.</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><Banknote size={10} /> Efectivo</span>
}

const EMPTY_MOV = { tipo: 'entrada', concepto: '', monto: '', metodo: 'efectivo', notas: '' }

export default function Caja() {
  const [fecha, setFecha]             = useState(() => localDate())
  const [citas, setCitas]             = useState([])
  const [gastosDia, setGastosDia]     = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [configPct, setConfigPct]     = useState([])

  // Saldo inicial del día
  const [saldoEf, setSaldoEf]         = useState('')
  const [saldoTr, setSaldoTr]         = useState('')
  const [saldoGuardado, setSaldoGuardado] = useState(false)

  // Form movimiento rápido
  const [mov, setMov]                 = useState({ ...EMPTY_MOV })
  const [guardandoMov, setGuardandoMov] = useState(false)

  // Pago a barbero
  const [pagoAbierto, setPagoAbierto]     = useState(null) // barbero.nombre
  const [pagoMetodo, setPagoMetodo]       = useState('efectivo')
  const [pagoMontoEf, setPagoMontoEf]     = useState('')
  const [pagoMontoTr, setPagoMontoTr]     = useState('')
  const [pagandoBarbero, setPagandoBarbero] = useState(false)

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

    // Recuperar saldo inicial si ya fue registrado
    const aperEf = m.find(x => x.concepto === '__apertura_ef__')
    const aperTr = m.find(x => x.concepto === '__apertura_tr__')
    if (aperEf || aperTr) {
      setSaldoEf(aperEf ? String(aperEf.monto) : '0')
      setSaldoTr(aperTr ? String(aperTr.monto) : '0')
      setSaldoGuardado(true)
    } else {
      setSaldoEf('')
      setSaldoTr('')
      setSaldoGuardado(false)
    }
  }

  useEffect(() => { cargar() }, [fecha])

  // Citas completadas del día
  const citasDia = useMemo(() =>
    citas.filter(c => c.fecha === fecha && c.estado === 'completada')
  , [citas, fecha])

  const ingresosDia = useMemo(() =>
    citasDia.reduce((a, c) => a + Number(c.precio_total || 0), 0)
  , [citasDia])

  // Liquidación por barbero del día
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
      pagoBarbero:   Math.round(b.total * b.pct / 100),
      gananciaAdmin: Math.round(b.total * (100 - b.pct) / 100),
    })).sort((a, b) => b.total - a.total)
  }, [citasDia, configPct])

  const gananciaAdmin = liquidacionDia.reduce((a, b) => a + b.gananciaAdmin, 0)
  const totalGastos   = gastosDia.reduce((a, g) => a + Number(g.monto || 0), 0)

  // Movimientos visibles (sin aperturas internas)
  const movsVisibles = movimientos.filter(m => !m.concepto.startsWith('__apertura_'))

  // Balance por método
  const aperEfMonto = movimientos.find(m => m.concepto === '__apertura_ef__')?.monto || 0
  const aperTrMonto = movimientos.find(m => m.concepto === '__apertura_tr__')?.monto || 0

  const balanceEf = useMemo(() => {
    const ent = movsVisibles.filter(m => m.tipo === 'entrada' && m.metodo === 'efectivo').reduce((a, m) => a + Number(m.monto), 0)
    const sal = movsVisibles.filter(m => m.tipo === 'salida'  && m.metodo === 'efectivo').reduce((a, m) => a + Number(m.monto), 0)
    return Number(aperEfMonto) + ent - sal
  }, [movsVisibles, aperEfMonto])

  const balanceTr = useMemo(() => {
    const ent = movsVisibles.filter(m => m.tipo === 'entrada' && m.metodo === 'transferencia').reduce((a, m) => a + Number(m.monto), 0)
    const sal = movsVisibles.filter(m => m.tipo === 'salida'  && m.metodo === 'transferencia').reduce((a, m) => a + Number(m.monto), 0)
    return Number(aperTrMonto) + ent - sal
  }, [movsVisibles, aperTrMonto])

  const balanceNeto = gananciaAdmin - totalGastos + balanceEf + balanceTr - Number(aperEfMonto) - Number(aperTrMonto)

  // Navegación de fechas
  function prevDay() { const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() - 1); setFecha(localDate(d)) }
  function nextDay() { const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() + 1); setFecha(localDate(d)) }
  const esHoy = fecha === localDate()
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  // ==================== SALDO INICIAL ====================
  async function guardarSaldo() {
    const hora = new Date().toTimeString().slice(0, 5)
    // Eliminar aperturas previas del día si las hay
    const viejas = movimientos.filter(m => m.concepto.startsWith('__apertura_'))
    for (const v of viejas) await window.api.caja.delete(v.id)

    const promesas = []
    if (Number(saldoEf) > 0) promesas.push(window.api.caja.create({ tipo: 'entrada', concepto: '__apertura_ef__', monto: Number(saldoEf), fecha, hora, metodo: 'efectivo', notas: 'Saldo inicial' }))
    if (Number(saldoTr) > 0) promesas.push(window.api.caja.create({ tipo: 'entrada', concepto: '__apertura_tr__', monto: Number(saldoTr), fecha, hora, metodo: 'transferencia', notas: 'Saldo inicial' }))
    await Promise.all(promesas)
    setSaldoGuardado(true)
    cargar()
  }

  // ==================== MOVIMIENTO RÁPIDO ====================
  async function agregarMovimiento(e) {
    e.preventDefault()
    if (!mov.concepto.trim() || !mov.monto) return
    setGuardandoMov(true)
    const hora = new Date().toTimeString().slice(0, 5)
    await window.api.caja.create({ ...mov, monto: Number(mov.monto), fecha, hora })
    setMov({ ...EMPTY_MOV })
    setGuardandoMov(false)
    cargar()
  }

  async function eliminarMovimiento(id) {
    const ok = await window.api.dialog.confirm('¿Eliminar este movimiento?')
    if (!ok) return
    await window.api.caja.delete(id)
    cargar()
  }

  // ==================== PAGO A BARBERO ====================
  function abrirPago(barbero) {
    if (pagoAbierto === barbero.nombre) { setPagoAbierto(null); return }
    setPagoAbierto(barbero.nombre)
    setPagoMetodo('efectivo')
    setPagoMontoEf(String(barbero.pagoBarbero))
    setPagoMontoTr('')
  }

  async function confirmarPago(barbero) {
    setPagandoBarbero(true)
    const hora = new Date().toTimeString().slice(0, 5)
    const concepto = `Pago ${barbero.nombre}`
    if (pagoMetodo === 'efectivo') {
      await window.api.caja.create({ tipo: 'salida', concepto, monto: Number(pagoMontoEf), fecha, hora, metodo: 'efectivo', notas: `${barbero.pct}% de $${fmt(barbero.total)}` })
    } else if (pagoMetodo === 'transferencia') {
      await window.api.caja.create({ tipo: 'salida', concepto, monto: Number(pagoMontoEf), fecha, hora, metodo: 'transferencia', notas: `${barbero.pct}% de $${fmt(barbero.total)}` })
    } else {
      // Ambas — dos movimientos
      if (Number(pagoMontoEf) > 0) await window.api.caja.create({ tipo: 'salida', concepto: `${concepto} (efectivo)`, monto: Number(pagoMontoEf), fecha, hora, metodo: 'efectivo', notas: `${barbero.pct}% de $${fmt(barbero.total)}` })
      if (Number(pagoMontoTr) > 0) await window.api.caja.create({ tipo: 'salida', concepto: `${concepto} (transferencia)`, monto: Number(pagoMontoTr), fecha, hora, metodo: 'transferencia', notas: `${barbero.pct}% de $${fmt(barbero.total)}` })
    }
    setPagandoBarbero(false)
    setPagoAbierto(null)
    cargar()
  }

  // ¿Ya fue pagado este barbero hoy?
  function yaFuePagado(nombre) {
    return movsVisibles.some(m => m.tipo === 'salida' && m.concepto.startsWith(`Pago ${nombre}`))
  }

  const fm = (k, v) => setMov(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Caja</h1>
          <p className="text-sm text-slate-400 capitalize">{fechaLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={prevDay} className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 text-xl">‹</button>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <button onClick={nextDay} className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 text-xl">›</button>
          {!esHoy && (
            <button onClick={() => setFecha(localDate())}
              className="text-xs px-3 py-2 border border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition">
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* ==================== SALDO INICIAL ==================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Briefcase size={15} className="text-slate-500" /> Saldo inicial del día</h2>
          {saldoGuardado && (
            <button onClick={() => setSaldoGuardado(false)} className="text-xs text-primary-600 hover:underline">Editar</button>
          )}
        </div>
        <div className="px-5 py-4">
          {saldoGuardado ? (
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-green-600" />
                <span className="text-sm text-slate-600">Efectivo:</span>
                <span className="font-bold text-green-700">${fmt(aperEfMonto)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-blue-600" />
                <span className="text-sm text-slate-600">Transferencia:</span>
                <span className="font-bold text-blue-700">${fmt(aperTrMonto)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1"><span className="inline-flex items-center gap-1"><Banknote size={12} className="text-green-600" /> Efectivo en caja</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" min="0" value={saldoEf} onChange={e => setSaldoEf(e.target.value)}
                    placeholder="0"
                    className="pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1"><span className="inline-flex items-center gap-1"><CreditCard size={12} className="text-blue-600" /> Por transferencia</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" min="0" value={saldoTr} onChange={e => setSaldoTr(e.target.value)}
                    placeholder="0"
                    className="pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary-400" />
                </div>
              </div>
              <button onClick={guardarSaldo}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition">
                <Check size={14} /> Confirmar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ==================== BALANCE DEL DÍA ==================== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
            <Banknote size={17} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-green-700 font-medium flex items-center gap-1"><Banknote size={11} /> Efectivo</p>
            <p className="text-xl font-bold text-green-800">${fmt(balanceEf)}</p>
            <p className="text-xs text-green-600">inicio + entradas − salidas</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <CreditCard size={17} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-blue-700 font-medium flex items-center gap-1"><CreditCard size={11} /> Transferencia</p>
            <p className="text-xl font-bold text-blue-800">${fmt(balanceTr)}</p>
            <p className="text-xs text-blue-600">inicio + entradas − salidas</p>
          </div>
        </div>
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={17} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-primary-700 font-medium">Ingresos del día</p>
            <p className="text-xl font-bold text-primary-800">${fmt(ingresosDia)}</p>
            <p className="text-xs text-primary-600">{citasDia.length} cita{citasDia.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${balanceNeto >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-200'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${balanceNeto >= 0 ? 'bg-amber-500' : 'bg-red-600'}`}>
            <BadgeDollarSign size={17} className="text-white" />
          </div>
          <div>
            <p className={`text-xs font-medium ${balanceNeto >= 0 ? 'text-amber-700' : 'text-red-700'}`}>Balance neto</p>
            <p className={`text-xl font-bold ${balanceNeto >= 0 ? 'text-amber-800' : 'text-red-800'}`}>${fmt(Math.abs(balanceNeto))}</p>
            <p className="text-xs text-slate-500">tu ganancia − gastos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ==================== PAGOS A BARBEROS ==================== */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700">Pagar a barberos</h2>

          {liquidacionDia.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-8 text-center text-slate-400 text-sm">
              Sin citas completadas hoy
            </div>
          ) : (
            <div className="space-y-2">
              {liquidacionDia.map(b => {
                const abierto = pagoAbierto === b.nombre
                const pagado  = yaFuePagado(b.nombre)
                return (
                  <div key={b.nombre} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${abierto ? 'border-primary-300' : 'border-slate-100'}`}>
                    {/* Fila barbero */}
                    <div className="flex items-center px-4 py-3 gap-3">
                      <div className="w-9 h-9 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {b.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{b.nombre}</p>
                        <p className="text-xs text-slate-400">{b.citas} cita{b.citas !== 1 ? 's' : ''} · ${fmt(b.total)} facturado</p>
                      </div>
                      <div className="text-right shrink-0 mr-2">
                        <p className="text-xs text-slate-400">Le corresponde ({b.pct}%)</p>
                        <p className="font-bold text-amber-600">${fmt(b.pagoBarbero)}</p>
                      </div>
                      {pagado ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg shrink-0">
                          <Check size={12} /> Pagado
                        </span>
                      ) : (
                        <button onClick={() => abrirPago(b)}
                          className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition shrink-0 ${
                            abierto ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                          }`}>
                          {abierto ? <><ChevronUp size={12}/> Cerrar</> : <><Banknote size={12}/> Pagar</>}
                        </button>
                      )}
                    </div>

                    {/* Panel de pago */}
                    {abierto && !pagado && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50">
                        {/* Selector de método */}
                        <p className="text-xs font-semibold text-slate-500 mb-2">Método de pago</p>
                        <div className="flex gap-2 mb-3">
                          {[['efectivo', <><Banknote size={13}/> Efectivo</>], ['transferencia', <><CreditCard size={13}/> Transferencia</>], ['ambas', <><Split size={13}/> Ambas</>]].map(([val, label]) => (
                            <button key={val} onClick={() => {
                              setPagoMetodo(val)
                              if (val === 'efectivo') { setPagoMontoEf(String(b.pagoBarbero)); setPagoMontoTr('') }
                              if (val === 'transferencia') { setPagoMontoEf(String(b.pagoBarbero)); setPagoMontoTr('') }
                              if (val === 'ambas') { setPagoMontoEf(''); setPagoMontoTr('') }
                            }}
                              className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                                pagoMetodo === val ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}>
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* Campos de monto */}
                        {pagoMetodo !== 'ambas' ? (
                          <div className="mb-3">
                            <label className="block text-xs text-slate-500 mb-1">
                              {pagoMetodo === 'efectivo'
                            ? <span className="inline-flex items-center gap-1"><Banknote size={11} /> Monto en efectivo</span>
                            : <span className="inline-flex items-center gap-1"><CreditCard size={11} /> Monto transferencia</span>}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                              <input type="number" min="0" value={pagoMontoEf} onChange={e => setPagoMontoEf(e.target.value)}
                                className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1 inline-flex items-center gap-1"><Banknote size={11} /> Efectivo</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input type="number" min="0" value={pagoMontoEf} onChange={e => setPagoMontoEf(e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1 inline-flex items-center gap-1"><CreditCard size={11} /> Transferencia</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                <input type="number" min="0" value={pagoMontoTr} onChange={e => setPagoMontoTr(e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                              </div>
                            </div>
                            {(Number(pagoMontoEf) + Number(pagoMontoTr)) > 0 && (
                              <p className={`col-span-2 text-xs font-semibold ${Math.abs((Number(pagoMontoEf) + Number(pagoMontoTr)) - b.pagoBarbero) < 1 ? 'text-green-600' : 'text-amber-600'}`}>
                                Total: ${fmt(Number(pagoMontoEf) + Number(pagoMontoTr))} / Esperado: ${fmt(b.pagoBarbero)}
                              </p>
                            )}
                          </div>
                        )}

                        <button onClick={() => confirmarPago(b)} disabled={pagandoBarbero || (!pagoMontoEf && !pagoMontoTr)}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition disabled:opacity-50">
                          {pagandoBarbero
                            ? 'Registrando…'
                            : <span className="inline-flex items-center gap-2"><Check size={14}/> Confirmar pago ${fmt(pagoMetodo === 'ambas' ? Number(pagoMontoEf) + Number(pagoMontoTr) : Number(pagoMontoEf))}</span>}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ==================== MOVIMIENTOS DEL DÍA ==================== */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-700">Movimientos manuales</h2>

          {/* Form rápido inline */}
          <form onSubmit={agregarMovimiento} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            {/* Tipo + Método */}
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden flex-1">
                {[['entrada', '↑ Entrada'], ['salida', '↓ Salida']].map(([t, l]) => (
                  <button key={t} type="button" onClick={() => fm('tipo', t)}
                    className={`flex-1 py-2 text-xs font-semibold transition ${
                      mov.tipo === t
                        ? t === 'entrada' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}>{l}</button>
                ))}
              </div>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {[['efectivo', <Banknote size={14}/>], ['transferencia', <CreditCard size={14}/>]].map(([m, icon]) => (
                  <button key={m} type="button" onClick={() => fm('metodo', m)}
                    className={`px-3 py-2 text-sm transition flex items-center gap-1 ${
                      mov.metodo === m ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-50'
                    }`}>{icon}</button>
                ))}
              </div>
            </div>

            {/* Concepto + Monto */}
            <div className="flex gap-2">
              <input value={mov.concepto} onChange={e => fm('concepto', e.target.value)}
                placeholder="Concepto (ej: Retiro, Compra insumos…)"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" value={mov.monto} onChange={e => fm('monto', e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 pr-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <button type="submit" disabled={guardandoMov || !mov.concepto.trim() || !mov.monto}
                className="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg disabled:opacity-40 transition">
                <Plus size={16} />
              </button>
            </div>
          </form>

          {/* Lista de movimientos */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {movsVisibles.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Sin movimientos aún</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {movsVisibles.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 w-6">
                        {m.tipo === 'entrada'
                          ? <ArrowUpCircle size={15} className="text-green-500" />
                          : <ArrowDownCircle size={15} className="text-red-500" />}
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-medium text-slate-800 leading-tight">{m.concepto}</p>
                        {m.notas && <p className="text-xs text-slate-400">{m.notas}</p>}
                      </td>
                      <td className="px-2 py-3"><MetodoBadge metodo={m.metodo} /></td>
                      <td className="px-2 py-3 text-xs text-slate-400">{m.hora || '—'}</td>
                      <td className={`px-2 py-3 text-right font-semibold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.tipo === 'entrada' ? '+' : '−'}${fmt(m.monto)}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => eliminarMovimiento(m.id)}
                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totales por método */}
                {movsVisibles.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-100">
                    <tr>
                      <td colSpan={6} className="px-4 py-2.5">
                        <div className="flex gap-4 text-xs font-semibold">
                          <span className="text-green-600 flex items-center gap-1"><Banknote size={11}/> Ef: +${fmt(movsVisibles.filter(m=>m.tipo==='entrada'&&m.metodo==='efectivo').reduce((a,m)=>a+Number(m.monto),0))} −${fmt(movsVisibles.filter(m=>m.tipo==='salida'&&m.metodo==='efectivo').reduce((a,m)=>a+Number(m.monto),0))}</span>
                          <span className="text-blue-600 flex items-center gap-1"><CreditCard size={11}/> Tr: +${fmt(movsVisibles.filter(m=>m.tipo==='entrada'&&m.metodo==='transferencia').reduce((a,m)=>a+Number(m.monto),0))} −${fmt(movsVisibles.filter(m=>m.tipo==='salida'&&m.metodo==='transferencia').reduce((a,m)=>a+Number(m.monto),0))}</span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>

          {/* Gastos del día (si los hay) */}
          {gastosDia.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Gastos del día</h2>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {gastosDia.map(g => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-700">{g.nombre}</p>
                          <p className="text-xs text-slate-400 capitalize">{g.categoria} · {g.frecuencia}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">−${fmt(g.monto)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-2.5 text-slate-600 text-xs">Total gastos</td>
                      <td className="px-4 py-2.5 text-right text-red-600">−${fmt(totalGastos)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
