const axios = require('axios')
const { syncQueue, config, citas, barberos, clientes, servicios, usuarios } = require('./database')

let syncInterval = null
let isOnline = false
let syncWindow = null // referencia a la ventana principal para emitir eventos

const SYNC_INTERVAL_MS = 30000 // cada 30 segundos

function setSyncWindow(win) {
  syncWindow = win
}

function getApiUrl() {
  return config.get('api_url') || 'https://barberia-jordan-api-1g9p.onrender.com'
}

function getApiToken() {
  return config.get('api_token') || ''
}

// Notifica al renderer del estado de conexión
function notificarEstado(online) {
  if (syncWindow && !syncWindow.isDestroyed()) {
    syncWindow.webContents.send('sync:estado', { online })
  }
}

function notificarProgreso(msg) {
  if (syncWindow && !syncWindow.isDestroyed()) {
    syncWindow.webContents.send('sync:progreso', { msg })
  }
}

// Verifica conectividad real al backend
async function checkOnline() {
  try {
    await axios.get(`${getApiUrl()}/api/health`, { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

// Procesa la cola de operaciones pendientes
async function procesarCola() {
  const pendientes = syncQueue.getPendientes()
  if (pendientes.length === 0) return

  const token = getApiToken()
  const headers = { Authorization: `Bearer ${token}` }
  const base = getApiUrl()

  notificarProgreso(`Sincronizando ${pendientes.length} operacion(es)...`)

  for (const item of pendientes) {
    try {
      const datos = JSON.parse(item.datos)

      // Resolver barbero_id local → server_id para que el backend reciba el ID correcto
      if (item.tabla === 'usuarios' && datos.barbero_id) {
        const serverBarberoId = barberos.getServerIdByLocalId(datos.barbero_id)
        if (serverBarberoId) datos.barbero_id = serverBarberoId
      }

      let ok = false

      if (item.operacion === 'create') {
        const res = await axios.post(`${base}/api/sync/${item.tabla}`, datos, { headers, timeout: 10000 })
        if (res.data?.id) {
          syncQueue.actualizarServerId(item.tabla, item.local_id, res.data.id)
        }
        ok = true
      } else if (item.operacion === 'update') {
        if (item.server_id) {
          await axios.put(`${base}/api/sync/${item.tabla}/${item.server_id}`, datos, { headers, timeout: 10000 })
          ok = true
        }
      } else if (item.operacion === 'delete') {
        if (item.server_id) {
          await axios.delete(`${base}/api/sync/${item.tabla}/${item.server_id}`, { headers, timeout: 10000 })
          ok = true
        } else {
          ok = true // no tiene server_id, nunca fue sincronizado; simplemente eliminar de cola
        }
      }

      if (ok) {
        syncQueue.marcarCompletado(item.id)
      } else {
        syncQueue.incrementarIntentos(item.id)
      }
    } catch (err) {
      const MAX_INTENTOS = 10
      const intentoActual = (item.intentos || 0) + 1
      if (intentoActual >= MAX_INTENTOS) {
        syncQueue.marcarCompletado(item.id) // descartar ítems irrecuperables
        console.warn(`🗑️ Item ${item.id} (${item.tabla}:${item.operacion}) descartado tras ${MAX_INTENTOS} intentos`)
      } else {
        syncQueue.incrementarIntentos(item.id)
        console.warn(`⚠️ Sync error en item ${item.id} (intento ${intentoActual}/${MAX_INTENTOS}):`, err.message)
      }
    }
  }

  notificarProgreso('Sincronización completada')
}

// Pull completo: sincroniza server_ids de tablas de referencia y luego upsertea citas
async function pullAll() {
  const token = getApiToken()
  const headers = { Authorization: `Bearer ${token}` }
  const base = getApiUrl()

  try {
    // 1. Sincronizar server_ids de todas las tablas de referencia
    const [rBarb, rCli, rSvc, rUsr] = await Promise.all([
      axios.get(`${base}/api/barberos`,  { headers, timeout: 10000 }),
      axios.get(`${base}/api/clientes`,  { headers, timeout: 10000 }),
      axios.get(`${base}/api/servicios`, { headers, timeout: 10000 }),
      axios.get(`${base}/api/usuarios`,  { headers, timeout: 10000 }),
    ])
    if (Array.isArray(rBarb.data))  barberos.syncServerIds(rBarb.data)
    if (Array.isArray(rCli.data))   clientes.syncServerIds(rCli.data)
    if (Array.isArray(rSvc.data))   servicios.syncServerIds(rSvc.data)
    if (Array.isArray(rUsr.data))   usuarios.syncServerIds(rUsr.data)

    // 2. Upsert citas del servidor y reconciliar eliminadas
    const rCitas = await axios.get(`${base}/api/citas`, { headers, timeout: 15000 })
    const items  = rCitas.data?.data || rCitas.data || []
    citas.upsertFromServer(items)
    // Eliminar localmente las citas que ya no existen en el servidor
    const serverIds = items.map(i => i.id)
    if (serverIds.length > 0) {
      citas.reconcileDeleted(serverIds)
    }
    console.log(`📥 citas: ${items.length} sincronizadas desde servidor`)
    if (syncWindow && !syncWindow.isDestroyed()) {
      syncWindow.webContents.send('sync:refresh')
    }
  } catch (err) {
    console.warn('⚠️ Error en pull sync:', err.message)
  }
}

// Descarga datos del servidor (para cuando se instala en una nueva PC)
async function descargarDatos() {
  notificarProgreso('Descargando datos del servidor...')
  await pullAll()
  notificarProgreso('Datos descargados correctamente')
}

async function cicloSync() {
  const online = await checkOnline()

  if (online !== isOnline) {
    isOnline = online
    notificarEstado(online)
    console.log(online ? '🟢 Online - iniciando sync' : '🔴 Offline')
  }

  if (online) {
    await procesarCola()
    await pullAll()
  }
}

function iniciarSync(win) {
  setSyncWindow(win)
  // Primera verificación inmediata
  cicloSync()
  // Luego cada 30s
  syncInterval = setInterval(cicloSync, SYNC_INTERVAL_MS)
}

function detenerSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

function forzarSync() {
  return cicloSync()
}

function estaOnline() {
  return isOnline
}

module.exports = {
  iniciarSync,
  detenerSync,
  forzarSync,
  estaOnline,
  descargarDatos,
  setSyncWindow,
}
