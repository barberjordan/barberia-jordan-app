const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const { initDatabase, loginLocal, usuarios, barberos, clientes, servicios, citas, dashboard, config, comisionesConfig } = require('./database')
const sync = require('./sync')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow = null

// ==================== AUTO-UPDATER ====================

// Estado global de actualización (para reenviar al renderer si carga tarde)
let updateState = null // null | { tipo: 'disponible'|'descargada', version }

function enviarEstadoUpdate() {
  if (!updateState || !mainWindow || mainWindow.isDestroyed()) return
  if (updateState.tipo === 'disponible') {
    mainWindow.webContents.send('update:disponible', { version: updateState.version })
  } else if (updateState.tipo === 'descargada') {
    mainWindow.webContents.send('update:descargada', { version: updateState.version })
  }
}

function configurarAutoUpdater() {
  // En desarrollo no verificar actualizaciones
  if (isDev) return

  autoUpdater.autoDownload = true        // descarga en segundo plano
  autoUpdater.autoInstallOnAppQuit = true // instala al cerrar la app

  // Verificar actualizaciones al iniciar (con delay para no bloquear la UI)
  setTimeout(() => autoUpdater.checkForUpdates(), 5000)

  // Verificar cada 4 horas mientras esté abierta
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)

  autoUpdater.on('update-available', (info) => {
    console.log(`🔄 Actualización disponible: v${info.version}`)
    updateState = { tipo: 'disponible', version: info.version }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:disponible', { version: info.version })
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:progreso', {
        porcentaje: Math.round(progress.percent),
        velocidad:  Math.round(progress.bytesPerSecond / 1024), // KB/s
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`✅ Actualización descargada: v${info.version}`)
    updateState = { tipo: 'descargada', version: info.version }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:descargada', { version: info.version })
    }
  })

  autoUpdater.on('error', (err) => {
    console.warn('⚠️ Error al verificar actualizaciones:', err.message)
  })
}

// IPC: el renderer puede pedir instalar la actualización ahora
ipcMain.handle('update:instalar', () => {
  autoUpdater.quitAndInstall(false, true) // no silencioso, reiniciar al instante
})

// IPC: el renderer pide el estado actual (por si montó después del evento)
ipcMain.handle('update:estado', () => updateState)

// ==================== VENTANA PRINCIPAL ====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../public/icon.ico'),
    show: false,
  })

  // Carga la app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Recuperar foco del teclado cuando la ventana vuelve a estar activa
  mainWindow.on('focus', () => {
    mainWindow.webContents.focus()
  })

  // Abre links externos en el navegador del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ==================== INICIO ====================
app.whenReady().then(async () => {
  // Inicializa la BD local (async porque sql.js carga un archivo .wasm)
  await initDatabase()

  // Crea la ventana
  createWindow()

  // Inicia el servicio de sincronización
  sync.iniciarSync(mainWindow)

  // Configura actualizaciones automáticas
  configurarAutoUpdater()
})

app.on('window-all-closed', () => {
  sync.detenerSync()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ==================== IPC HANDLERS ====================

// AUTH
ipcMain.handle('auth:login', (_e, email, password) => {
  return loginLocal(email, password)
})

// USUARIOS
ipcMain.handle('usuarios:getAll',   () => usuarios.getAll())
ipcMain.handle('usuarios:create',   (_e, data) => usuarios.create(data))
ipcMain.handle('usuarios:update',   (_e, id, data) => usuarios.update(id, data))
ipcMain.handle('usuarios:delete',   (_e, id) => usuarios.delete(id))

// BARBEROS
ipcMain.handle('barberos:getAll',   () => barberos.getAll())
ipcMain.handle('barberos:create',   (_e, data) => barberos.create(data))
ipcMain.handle('barberos:update',   (_e, id, data) => barberos.update(id, data))
ipcMain.handle('barberos:delete',   (_e, id) => barberos.delete(id))

// CLIENTES
ipcMain.handle('clientes:getAll',   () => clientes.getAll())
ipcMain.handle('clientes:create',   (_e, data) => clientes.create(data))
ipcMain.handle('clientes:update',   (_e, id, data) => clientes.update(id, data))
ipcMain.handle('clientes:delete',   (_e, id) => clientes.delete(id))

// SERVICIOS
ipcMain.handle('servicios:getAll',  () => servicios.getAll())
ipcMain.handle('servicios:create',  (_e, data) => servicios.create(data))
ipcMain.handle('servicios:update',  (_e, id, data) => servicios.update(id, data))
ipcMain.handle('servicios:delete',  (_e, id) => servicios.delete(id))

// CITAS
ipcMain.handle('citas:getAll',      () => citas.getAll())
ipcMain.handle('citas:getByFecha',  (_e, fecha) => citas.getByFecha(fecha))
ipcMain.handle('citas:create',      (_e, data) => citas.create(data))
ipcMain.handle('citas:update',      (_e, id, data) => citas.update(id, data))
ipcMain.handle('citas:delete',      (_e, id) => citas.delete(id))

// DASHBOARD
ipcMain.handle('dashboard:getStats',            () => dashboard.getStats())
ipcMain.handle('dashboard:getCitasPorDia',      () => dashboard.getCitasPorDia())
ipcMain.handle('dashboard:getTopServicios',     () => dashboard.getTopServicios())
ipcMain.handle('dashboard:getComisionesMes',    (_e, mes) => dashboard.getComisionesMes(mes))
ipcMain.handle('dashboard:getBalanceHistorico', (_e, meses) => dashboard.getBalanceHistorico(meses))

// SYNC
ipcMain.handle('sync:forzar', async () => {
  await sync.forzarSync()
  return { ok: true }
})

// CONFIG
ipcMain.handle('config:get', (_e, clave) => config.get(clave))
ipcMain.handle('config:set', (_e, clave, valor) => {
  config.set(clave, valor)
  return true
})

// COMISIONES CONFIG
ipcMain.handle('comisiones:getConfig',   ()          => comisionesConfig.getAll())
ipcMain.handle('comisiones:setConfig',   (_e, id, pct) => { comisionesConfig.set(id, pct); return true })

// APP INFO
ipcMain.handle('app:getVersion', () => app.getVersion())

// DIALOG CONFIRM (evita que window.confirm() rompa el foco del teclado en Electron)
ipcMain.handle('dialog:confirm', (_e, message) => {
  return dialog.showMessageBoxSync(mainWindow, {
    type: 'question',
    title: 'Confirmar',
    message,
    buttons: ['Cancelar', 'Sí, eliminar'],
    defaultId: 0,
    cancelId: 0,
  }) === 1
})
