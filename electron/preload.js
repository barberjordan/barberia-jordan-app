const { contextBridge, ipcRenderer } = require('electron')

// Expone APIs seguras al renderer (React)
contextBridge.exposeInMainWorld('api', {
  // ---- AUTH ----
  login: (email, password) => ipcRenderer.invoke('auth:login', email, password),

  // ---- USUARIOS ----
  usuarios: {
    getAll:  ()       => ipcRenderer.invoke('usuarios:getAll'),
    create:  (data)   => ipcRenderer.invoke('usuarios:create', data),
    update:  (id, d)  => ipcRenderer.invoke('usuarios:update', id, d),
    delete:  (id)     => ipcRenderer.invoke('usuarios:delete', id),
  },

  // ---- BARBEROS ----
  barberos: {
    getAll:  ()       => ipcRenderer.invoke('barberos:getAll'),
    create:  (data)   => ipcRenderer.invoke('barberos:create', data),
    update:  (id, d)  => ipcRenderer.invoke('barberos:update', id, d),
    delete:  (id)     => ipcRenderer.invoke('barberos:delete', id),
  },

  // ---- CLIENTES ----
  clientes: {
    getAll:  ()       => ipcRenderer.invoke('clientes:getAll'),
    create:  (data)   => ipcRenderer.invoke('clientes:create', data),
    update:  (id, d)  => ipcRenderer.invoke('clientes:update', id, d),
    delete:  (id)     => ipcRenderer.invoke('clientes:delete', id),
  },

  // ---- SERVICIOS ----
  servicios: {
    getAll:  ()       => ipcRenderer.invoke('servicios:getAll'),
    create:  (data)   => ipcRenderer.invoke('servicios:create', data),
    update:  (id, d)  => ipcRenderer.invoke('servicios:update', id, d),
    delete:  (id)     => ipcRenderer.invoke('servicios:delete', id),
  },

  // ---- CITAS ----
  citas: {
    getAll:    ()       => ipcRenderer.invoke('citas:getAll'),
    getByFecha:(fecha)  => ipcRenderer.invoke('citas:getByFecha', fecha),
    create:    (data)   => ipcRenderer.invoke('citas:create', data),
    update:    (id, d)  => ipcRenderer.invoke('citas:update', id, d),
    delete:    (id)     => ipcRenderer.invoke('citas:delete', id),
  },

  // ---- DASHBOARD ----
  dashboard: {
    getStats:             ()       => ipcRenderer.invoke('dashboard:getStats'),
    getCitasPorDia:       ()       => ipcRenderer.invoke('dashboard:getCitasPorDia'),
    getTopServicios:      ()       => ipcRenderer.invoke('dashboard:getTopServicios'),
    getComisionesMes:     (mes)    => ipcRenderer.invoke('dashboard:getComisionesMes', mes),
    getBalanceHistorico:  (meses)  => ipcRenderer.invoke('dashboard:getBalanceHistorico', meses),
  },

  // ---- SYNC ----
  sync: {
    forzar:       ()    => ipcRenderer.invoke('sync:forzar'),
    descargar:    ()    => ipcRenderer.invoke('sync:descargar'),
    setInterval:  (ms)  => ipcRenderer.invoke('sync:setInterval', ms),
    estado:       (cb)  => ipcRenderer.on('sync:estado',   (_e, data) => cb(data)),
    progreso:     (cb)  => ipcRenderer.on('sync:progreso', (_e, data) => cb(data)),
    refresh:      (cb)  => ipcRenderer.on('sync:refresh',  (_e)       => cb()),
    onCitaNueva:  (cb)  => ipcRenderer.on('cita:nueva',   (_e, data) => cb(data)),
    getApiUrl:    ()    => ipcRenderer.invoke('config:get', 'api_url'),
    setApiUrl:    (url) => ipcRenderer.invoke('config:set', 'api_url', url),
  },

  // ---- EXPORTAR ----
  exportar: {
    citas: (rows, mes) => ipcRenderer.invoke('export:citas', rows, mes),
  },

  // ---- CONFIG ----
  config: {
    get: (clave) => ipcRenderer.invoke('config:get', clave),
    set: (clave, valor) => ipcRenderer.invoke('config:set', clave, valor),
  },

  // ---- COMISIONES CONFIG ----
  comisiones: {
    getConfig: ()          => ipcRenderer.invoke('comisiones:getConfig'),
    setConfig: (id, pct)   => ipcRenderer.invoke('comisiones:setConfig', id, pct),
  },

  // ---- GASTOS ----
  gastos: {
    getAll:     ()          => ipcRenderer.invoke('gastos:getAll'),
    getByFecha: (fecha)     => ipcRenderer.invoke('gastos:getByFecha', fecha),
    getByMes:   (mes)       => ipcRenderer.invoke('gastos:getByMes', mes),
    create:     (data)      => ipcRenderer.invoke('gastos:create', data),
    update:     (id, data)  => ipcRenderer.invoke('gastos:update', id, data),
    delete:     (id)        => ipcRenderer.invoke('gastos:delete', id),
  },

  // ---- CAJA MOVIMIENTOS ----
  caja: {
    getAll:     ()          => ipcRenderer.invoke('caja:getAll'),
    getByFecha: (fecha)     => ipcRenderer.invoke('caja:getByFecha', fecha),
    create:     (data)      => ipcRenderer.invoke('caja:create', data),
    delete:     (id)        => ipcRenderer.invoke('caja:delete', id),
  },

  // ---- APP ----
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },

  // ---- DIALOGS ----
  dialog: {
    confirm: (msg) => ipcRenderer.invoke('dialog:confirm', msg),
  },

  // ---- ACTUALIZACIONES ----
  updater: {
    onDisponible:  (cb) => ipcRenderer.on('update:disponible', (_e, data) => cb(data)),
    onProgreso:    (cb) => ipcRenderer.on('update:progreso',   (_e, data) => cb(data)),
    onDescargada:  (cb) => ipcRenderer.on('update:descargada', (_e, data) => cb(data)),
    onAlDia:       (cb) => ipcRenderer.on('update:al-dia', () => cb()),
    onError:       (cb) => ipcRenderer.on('update:error', (_e, data) => cb(data)),
    instalar:      ()   => ipcRenderer.invoke('update:instalar'),
    getEstado:     ()   => ipcRenderer.invoke('update:estado'),
    verificar:     ()   => ipcRenderer.invoke('update:verificar'),
  },
})
