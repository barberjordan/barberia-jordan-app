const axios = require('axios')
const { config } = require('./database')

const API_DEFAULT = 'https://barberia-jordan-api-1g9p.onrender.com'
const CACHE_KEY    = 'mant_estado_cache'
const OCULTO_KEY   = 'mant_oculto_hasta'

function getApiUrl() {
  return config.get('api_url') || API_DEFAULT
}

// Fecha local de la PC — es la que ve el cliente, no la del servidor
function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function estaOcultoHoy() {
  return config.get(OCULTO_KEY) === hoyStr()
}

function ocultarHoy() {
  config.set(OCULTO_KEY, hoyStr())
  return true
}

/**
 * Estado de la factura de mantenimiento.
 * Si el servidor no responde devuelve el último estado conocido: en Render el
 * servicio puede tardar en despertar, y el aviso no debería desaparecer por eso.
 */
async function getEstado() {
  let data = null
  try {
    const res = await axios.get(`${getApiUrl()}/api/mantenimiento/estado`, { timeout: 15000 })
    data = res.data
    config.set(CACHE_KEY, JSON.stringify(data))
  } catch (err) {
    try { data = JSON.parse(config.get(CACHE_KEY) || 'null') } catch { data = null }
    if (data) data.desde_cache = true
  }
  if (!data) return null
  data.oculto_hoy = estaOcultoHoy()
  return data
}

/** El cliente avisa que transfirió. El proveedor después lo confirma. */
async function informarPago(payload = {}) {
  try {
    const { data } = await axios.post(
      `${getApiUrl()}/api/mantenimiento/informar-pago`, payload, { timeout: 20000 }
    )
    config.set(CACHE_KEY, '')   // invalidar cache: el próximo getEstado va al servidor
    return { ok: true, factura: data }
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Error de conexión'
    console.warn('⚠️ No se pudo informar el pago:', msg)
    return { ok: false, error: msg }
  }
}

module.exports = { getEstado, informarPago, ocultarHoy }
