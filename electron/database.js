/**
 * database.js — SQLite local usando sql.js (WebAssembly, sin compilación nativa)
 * Compatible con Node 24+ y cualquier versión de Electron.
 */
const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let db = null
let dbPath = null
let _lastInsertId = null  // capturado antes de saveDb para evitar reset por db.export()

// ==================== HELPERS INTERNOS ====================

function saveDb() {
  if (!db || !dbPath) return
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

/** Ejecuta SQL sin retorno (INSERT, UPDATE, DELETE, CREATE) */
function qRun(sql, params = []) {
  db.run(sql, params)
  // Capturar last_insert_rowid ANTES de db.export() (export puede resetear el valor en sql.js)
  try {
    const res = db.exec('SELECT last_insert_rowid()')
    _lastInsertId = res?.[0]?.values?.[0]?.[0] ?? null
  } catch { _lastInsertId = null }
  saveDb()
}

/** Retorna la primera fila como objeto, o null */
function qGet(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()
  return row
}

/** Retorna todas las filas como array de objetos */
function qAll(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length) stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

/** Retorna el ID del último INSERT (capturado antes de saveDb) */
function lastId() {
  return _lastInsertId
}

function now() {
  return new Date().toISOString()
}

function encolarSync(tabla, operacion, datos, local_id = null, server_id = null) {
  qRun(
    'INSERT INTO sync_queue (tabla, operacion, datos, local_id, server_id) VALUES (?,?,?,?,?)',
    [tabla, operacion, JSON.stringify(datos), local_id, server_id]
  )
}

// ==================== INIT ====================

async function initDatabase() {
  dbPath = path.join(app.getPath('userData'), 'barberia.db')

  // Localiza el archivo .wasm de sql.js
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
  })

  // Carga la BD existente o crea una nueva
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  // ==================== ESQUEMA ====================
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      rol         TEXT DEFAULT 'empleado',
      activo      INTEGER DEFAULT 1,
      barbero_id  INTEGER,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now')),
      server_id   INTEGER,
      sync_status TEXT DEFAULT 'pending'
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS barberos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre       TEXT NOT NULL,
      telefono     TEXT,
      email        TEXT,
      especialidad TEXT,
      activo       INTEGER DEFAULT 1,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now')),
      server_id    INTEGER,
      sync_status  TEXT DEFAULT 'pending'
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL,
      telefono    TEXT,
      email       TEXT,
      notas       TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now')),
      server_id   INTEGER,
      sync_status TEXT DEFAULT 'pending'
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS servicios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL,
      descripcion TEXT,
      precio      REAL NOT NULL DEFAULT 0,
      duracion    INTEGER DEFAULT 30,
      activo      INTEGER DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now')),
      server_id   INTEGER,
      sync_status TEXT DEFAULT 'pending'
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS citas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id   INTEGER,
      barbero_id   INTEGER,
      servicio_id  INTEGER,
      fecha        TEXT,
      hora         TEXT,
      estado       TEXT DEFAULT 'pendiente',
      notas        TEXT,
      precio_total REAL DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now')),
      server_id    INTEGER,
      sync_status  TEXT DEFAULT 'pending'
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tabla      TEXT NOT NULL,
      operacion  TEXT NOT NULL,
      datos      TEXT NOT NULL,
      local_id   INTEGER,
      server_id  INTEGER,
      intentos   INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      clave TEXT PRIMARY KEY,
      valor TEXT
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS comisiones_config (
      barbero_id         INTEGER PRIMARY KEY,
      porcentaje_barbero REAL    DEFAULT 40,
      updated_at         TEXT    DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS gastos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT NOT NULL,
      categoria  TEXT DEFAULT 'otro',
      monto      REAL NOT NULL DEFAULT 0,
      frecuencia TEXT DEFAULT 'mensual',
      fecha      TEXT,
      notas      TEXT,
      activo     INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS caja_movimientos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo       TEXT NOT NULL,
      concepto   TEXT NOT NULL,
      monto      REAL NOT NULL DEFAULT 0,
      fecha      TEXT NOT NULL,
      hora       TEXT,
      notas      TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Migraciones
  try { db.run('ALTER TABLE usuarios ADD COLUMN barbero_id INTEGER') } catch {}
  // Guardar nombres directamente en citas (para citas traídas del servidor sin IDs locales)
  try { db.run('ALTER TABLE citas ADD COLUMN _barbero_nombre TEXT') }  catch {}
  try { db.run('ALTER TABLE citas ADD COLUMN _cliente_nombre TEXT') }  catch {}
  try { db.run('ALTER TABLE citas ADD COLUMN _servicio_nombre TEXT') } catch {}
  try { db.run('ALTER TABLE citas ADD COLUMN _cliente_telefono TEXT') } catch {}
  // Multi-servicio
  try { db.run('ALTER TABLE citas ADD COLUMN servicios_ids TEXT') } catch {}
  // Icono de servicio
  try { db.run('ALTER TABLE servicios ADD COLUMN icono TEXT DEFAULT NULL') } catch {}
  // Caja movimientos: método de pago
  try { db.run("ALTER TABLE caja_movimientos ADD COLUMN metodo TEXT DEFAULT 'efectivo'") } catch {}

  // Usuario admin por defecto
  const admin = qGet("SELECT id FROM usuarios WHERE email = 'admin@barberia.com'")
  if (!admin) {
    db.run(
      "INSERT INTO usuarios (nombre, email, password, rol, sync_status) VALUES (?,?,?,?,?)",
      ['Administrador', 'admin@barberia.com', 'admin123', 'admin', 'local']
    )
  }

  saveDb()
  console.log('✅ Base de datos lista en:', dbPath)
  return db
}

// ==================== AUTH ====================

function loginLocal(email, password) {
  const user = qGet('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email])
  if (!user || user.password !== password) return null
  const { password: _, ...safe } = user
  return safe
}

// ==================== USUARIOS ====================

const usuarios = {
  getAll: () => qAll(`
    SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.barbero_id, u.created_at,
           COALESCE(
             (SELECT nombre FROM barberos WHERE id = u.barbero_id),
             CASE WHEN u.rol = 'empleado'
                  THEN (SELECT nombre FROM barberos WHERE email = u.email COLLATE NOCASE LIMIT 1)
             END
           ) AS barbero_nombre
    FROM usuarios u
    ORDER BY u.nombre
  `),
  getById: (id) => qGet('SELECT id,nombre,email,rol,activo,barbero_id FROM usuarios WHERE id=?', [id]),
  create: (d) => {
    const rol = d.rol || 'empleado'
    let barberoId = null

    // Si es empleado, crear barbero vinculado automáticamente
    if (rol === 'empleado') {
      qRun(
        'INSERT INTO barberos (nombre,email,activo,created_at,updated_at) VALUES (?,?,?,?,?)',
        [d.nombre, d.email || null, 1, now(), now()]
      )
      barberoId = lastId()
      encolarSync('barberos', 'create', { nombre: d.nombre, email: d.email || null, activo: 1, local_id: barberoId }, barberoId)
    }

    qRun(
      'INSERT INTO usuarios (nombre,email,password,rol,activo,barbero_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [d.nombre, d.email, d.password, rol, 1, barberoId, now(), now()]
    )
    const id = lastId()
    encolarSync('usuarios', 'create', { ...d, rol, barbero_id: barberoId, local_id: id }, id)
    return id
  },
  update: (id, d) => {
    qRun(
      'UPDATE usuarios SET nombre=?,email=?,rol=?,activo=?,updated_at=?,sync_status=? WHERE id=?',
      [d.nombre, d.email, d.rol, d.activo ?? 1, now(), 'pending', id]
    )
    if (d.password) qRun('UPDATE usuarios SET password=? WHERE id=?', [d.password, id])
    encolarSync('usuarios', 'update', { ...d, local_id: id }, id)
  },
  delete: (id) => {
    const u = qGet('SELECT * FROM usuarios WHERE id=?', [id])
    qRun('DELETE FROM usuarios WHERE id=?', [id])
    if (u?.server_id) encolarSync('usuarios', 'delete', { server_id: u.server_id }, id, u.server_id)
    // También eliminar el barbero vinculado — buscar por barbero_id o por email (fallback)
    const b = u?.barbero_id
      ? qGet('SELECT * FROM barberos WHERE id=?', [u.barbero_id])
      : (u?.email ? qGet('SELECT * FROM barberos WHERE email=? COLLATE NOCASE', [u.email]) : null)
    if (b) {
      qRun('DELETE FROM barberos WHERE id=?', [b.id])
      if (b.server_id) encolarSync('barberos', 'delete', { server_id: b.server_id }, b.id, b.server_id)
    }
  },
  syncServerIds: (serverItems) => {
    for (const s of serverItems) {
      const local = (s.email && qGet('SELECT id FROM usuarios WHERE email=? COLLATE NOCASE', [s.email]))
      if (local && s.id) qRun('UPDATE usuarios SET server_id=? WHERE id=?', [s.id, local.id])
    }
  },
  // Inserta o actualiza usuarios desde el servidor (pull multi-PC)
  upsertFromServer: (serverItems) => {
    for (const s of serverItems) {
      // 1. Buscar por server_id
      const byServerId = s.id ? qGet('SELECT id FROM usuarios WHERE server_id=?', [s.id]) : null
      if (byServerId) {
        qRun('UPDATE usuarios SET nombre=?,email=?,rol=?,activo=?,updated_at=?,sync_status=? WHERE id=?',
          [s.nombre, s.email, s.rol||'empleado', s.activo??1, s.updated_at||now(), 'synced', byServerId.id])
        continue
      }
      // 2. Buscar por email
      const byEmail = s.email ? qGet('SELECT id FROM usuarios WHERE email=? COLLATE NOCASE', [s.email]) : null
      if (byEmail) {
        qRun('UPDATE usuarios SET nombre=?,rol=?,activo=?,updated_at=?,sync_status=?,server_id=? WHERE id=?',
          [s.nombre, s.rol||'empleado', s.activo??1, s.updated_at||now(), 'synced', s.id, byEmail.id])
        continue
      }
      // 3. NO insertar usuarios nuevos desde el servidor — solo actualizamos los que ya existen localmente
      // (evita que usuarios creados en el servidor aparezcan como fantasmas en la app)
      console.log(`⚠️ Usuario del servidor ignorado (no existe localmente): ${s.nombre} <${s.email}>`)
      continue
    }
  },
}

// ==================== BARBEROS ====================

const barberos = {
  getAll: () => qAll('SELECT * FROM barberos ORDER BY nombre'),
  getById: (id) => qGet('SELECT * FROM barberos WHERE id=?', [id]),
  create: (d) => {
    qRun(
      'INSERT INTO barberos (nombre,telefono,email,especialidad,activo,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
      [d.nombre, d.telefono || null, d.email || null, d.especialidad || null, 1, now(), now()]
    )
    const id = lastId()
    encolarSync('barberos', 'create', { ...d, local_id: id }, id)
    return id
  },
  update: (id, d) => {
    qRun(
      'UPDATE barberos SET nombre=?,telefono=?,email=?,especialidad=?,activo=?,updated_at=?,sync_status=? WHERE id=?',
      [d.nombre, d.telefono || null, d.email || null, d.especialidad || null, d.activo ?? 1, now(), 'pending', id]
    )
    encolarSync('barberos', 'update', { ...d, local_id: id }, id)
  },
  delete: (id) => {
    const b = qGet('SELECT * FROM barberos WHERE id=?', [id])
    qRun('DELETE FROM barberos WHERE id=?', [id])
    if (b?.server_id) encolarSync('barberos', 'delete', { server_id: b.server_id }, id, b.server_id)
  },
  getServerIdByLocalId: (localId) => qGet('SELECT server_id FROM barberos WHERE id=?', [localId])?.server_id || null,
  // Actualiza server_id de barberos locales usando email (exacto) o nombre (NOCASE)
  syncServerIds: (serverItems) => {
    for (const s of serverItems) {
      const local = (s.email && qGet('SELECT id FROM barberos WHERE email=? COLLATE NOCASE', [s.email]))
                 || qGet('SELECT id FROM barberos WHERE nombre=? COLLATE NOCASE', [s.nombre])
      if (local && s.id) qRun('UPDATE barberos SET server_id=? WHERE id=?', [s.id, local.id])
    }
  },
  // Inserta o actualiza barberos desde el servidor (pull multi-PC)
  upsertFromServer: (serverItems) => {
    for (const s of serverItems) {
      let localId = null

      const byServerId = s.id ? qGet('SELECT id FROM barberos WHERE server_id=?', [s.id]) : null
      if (byServerId) {
        qRun('UPDATE barberos SET nombre=?,telefono=?,email=?,especialidad=?,activo=?,updated_at=?,sync_status=? WHERE id=?',
          [s.nombre, s.telefono||null, s.email||null, s.especialidad||null, s.activo??1, s.updated_at||now(), 'synced', byServerId.id])
        localId = byServerId.id
      } else {
        const byEmail  = s.email  ? qGet('SELECT id FROM barberos WHERE email=? COLLATE NOCASE', [s.email]) : null
        const byNombre = !byEmail && s.nombre ? qGet('SELECT id FROM barberos WHERE nombre=? COLLATE NOCASE', [s.nombre]) : null
        const existing = byEmail || byNombre
        if (existing) {
          qRun('UPDATE barberos SET nombre=?,telefono=?,email=?,especialidad=?,activo=?,updated_at=?,sync_status=?,server_id=? WHERE id=?',
            [s.nombre, s.telefono||null, s.email||null, s.especialidad||null, s.activo??1, s.updated_at||now(), 'synced', s.id, existing.id])
          localId = existing.id
        } else {
          // NO insertar barberos nuevos desde el servidor — evita fantasmas
          console.log(`⚠️ Barbero del servidor ignorado (no existe localmente): ${s.nombre}`)
          continue
        }
      }

      // Si el servidor envía porcentaje_comision, sincronizarlo en comisiones_config local
      if (localId && s.porcentaje_comision != null) {
        qRun(
          'INSERT OR REPLACE INTO comisiones_config (barbero_id, porcentaje_barbero, updated_at) VALUES (?, ?, datetime("now"))',
          [localId, Number(s.porcentaje_comision)]
        )
      }
    }
  },
}

// ==================== CLIENTES ====================

const clientes = {
  getAll: () => qAll('SELECT * FROM clientes ORDER BY nombre'),
  getById: (id) => qGet('SELECT * FROM clientes WHERE id=?', [id]),
  create: (d) => {
    qRun(
      'INSERT INTO clientes (nombre,telefono,email,notas,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      [d.nombre, d.telefono || null, d.email || null, d.notas || null, now(), now()]
    )
    const id = lastId()
    encolarSync('clientes', 'create', { ...d, local_id: id }, id)
    return id
  },
  update: (id, d) => {
    qRun(
      'UPDATE clientes SET nombre=?,telefono=?,email=?,notas=?,updated_at=?,sync_status=? WHERE id=?',
      [d.nombre, d.telefono || null, d.email || null, d.notas || null, now(), 'pending', id]
    )
    encolarSync('clientes', 'update', { ...d, local_id: id }, id)
  },
  delete: (id) => {
    const c = qGet('SELECT * FROM clientes WHERE id=?', [id])
    qRun('DELETE FROM clientes WHERE id=?', [id])
    if (c?.server_id) encolarSync('clientes', 'delete', { server_id: c.server_id }, id, c.server_id)
  },
  syncServerIds: (serverItems) => {
    for (const s of serverItems) {
      const local = (s.email && qGet('SELECT id FROM clientes WHERE email=? COLLATE NOCASE', [s.email]))
                 || qGet('SELECT id FROM clientes WHERE nombre=? COLLATE NOCASE', [s.nombre])
      if (local && s.id) qRun('UPDATE clientes SET server_id=? WHERE id=?', [s.id, local.id])
    }
  },
  upsertFromServer: (serverItems) => {
    for (const s of serverItems) {
      const byServerId = s.id ? qGet('SELECT id FROM clientes WHERE server_id=?', [s.id]) : null
      if (byServerId) {
        qRun('UPDATE clientes SET nombre=?,telefono=?,email=?,notas=?,updated_at=?,sync_status=? WHERE id=?',
          [s.nombre, s.telefono||null, s.email||null, s.notas||null, s.updated_at||now(), 'synced', byServerId.id])
        continue
      }
      const byEmail  = s.email  ? qGet('SELECT id FROM clientes WHERE email=? COLLATE NOCASE', [s.email]) : null
      const byNombre = !byEmail && s.nombre ? qGet('SELECT id FROM clientes WHERE nombre=? COLLATE NOCASE', [s.nombre]) : null
      const existing = byEmail || byNombre
      if (existing) {
        qRun('UPDATE clientes SET nombre=?,telefono=?,email=?,notas=?,updated_at=?,sync_status=?,server_id=? WHERE id=?',
          [s.nombre, s.telefono||null, s.email||null, s.notas||null, s.updated_at||now(), 'synced', s.id, existing.id])
      } else {
        qRun('INSERT INTO clientes (nombre,telefono,email,notas,created_at,updated_at,server_id,sync_status) VALUES (?,?,?,?,?,?,?,?)',
          [s.nombre, s.telefono||null, s.email||null, s.notas||null, s.created_at||now(), s.updated_at||now(), s.id, 'synced'])
      }
    }
  },
}

// ==================== SERVICIOS ====================

const servicios = {
  getAll: () => qAll('SELECT * FROM servicios ORDER BY nombre'),
  getById: (id) => qGet('SELECT * FROM servicios WHERE id=?', [id]),
  create: (d) => {
    qRun(
      'INSERT INTO servicios (nombre,descripcion,precio,duracion,activo,icono,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [d.nombre, d.descripcion || null, d.precio || 0, d.duracion || 30, 1, d.icono || null, now(), now()]
    )
    const id = lastId()
    encolarSync('servicios', 'create', { ...d, local_id: id }, id)
    return id
  },
  update: (id, d) => {
    qRun(
      'UPDATE servicios SET nombre=?,descripcion=?,precio=?,duracion=?,activo=?,icono=?,updated_at=?,sync_status=? WHERE id=?',
      [d.nombre, d.descripcion || null, d.precio || 0, d.duracion || 30, d.activo ?? 1, d.icono || null, now(), 'pending', id]
    )
    encolarSync('servicios', 'update', { ...d, local_id: id }, id)
  },
  delete: (id) => {
    const s = qGet('SELECT * FROM servicios WHERE id=?', [id])
    qRun('DELETE FROM servicios WHERE id=?', [id])
    if (s?.server_id) encolarSync('servicios', 'delete', { server_id: s.server_id }, id, s.server_id)
  },
  syncServerIds: (serverItems) => {
    for (const s of serverItems) {
      const local = qGet('SELECT id FROM servicios WHERE nombre=? COLLATE NOCASE', [s.nombre])
      if (local && s.id) qRun('UPDATE servicios SET server_id=? WHERE id=?', [s.id, local.id])
    }
  },
  upsertFromServer: (serverItems) => {
    for (const s of serverItems) {
      const byServerId = s.id ? qGet('SELECT id,icono FROM servicios WHERE server_id=?', [s.id]) : null
      if (byServerId) {
        // Preservar ícono local si el servidor no manda uno
        const icono = s.icono || byServerId.icono || null
        qRun('UPDATE servicios SET nombre=?,descripcion=?,precio=?,duracion=?,activo=?,icono=?,updated_at=?,sync_status=? WHERE id=?',
          [s.nombre, s.descripcion||null, s.precio||0, s.duracion||30, s.activo??1, icono, s.updated_at||now(), 'synced', byServerId.id])
        continue
      }
      const byNombre = s.nombre ? qGet('SELECT id,icono FROM servicios WHERE nombre=? COLLATE NOCASE', [s.nombre]) : null
      if (byNombre) {
        const icono = s.icono || byNombre.icono || null
        qRun('UPDATE servicios SET nombre=?,descripcion=?,precio=?,duracion=?,activo=?,icono=?,updated_at=?,sync_status=?,server_id=? WHERE id=?',
          [s.nombre, s.descripcion||null, s.precio||0, s.duracion||30, s.activo??1, icono, s.updated_at||now(), 'synced', s.id, byNombre.id])
      } else {
        qRun('INSERT INTO servicios (nombre,descripcion,precio,duracion,activo,icono,created_at,updated_at,server_id,sync_status) VALUES (?,?,?,?,?,?,?,?,?,?)',
          [s.nombre, s.descripcion||null, s.precio||0, s.duracion||30, s.activo??1, s.icono||null, s.created_at||now(), s.updated_at||now(), s.id, 'synced'])
      }
    }
  },
}

// ==================== CITAS ====================

/**
 * Si una cita tiene múltiples servicios (servicios_ids), construye el nombre combinado.
 * Prioridad: _servicio_nombre del servidor → nombres locales unificados.
 */
function enrichServicioNombre(row) {
  if (!row.servicios_ids) return row
  try {
    const ids = JSON.parse(row.servicios_ids)
    if (!Array.isArray(ids) || ids.length <= 1) return row
    // Si el servidor ya mandó el nombre combinado, usarlo
    if (row._servicio_nombre) {
      return { ...row, servicio_nombre: row._servicio_nombre }
    }
    // Construir desde la tabla local de servicios
    const nombres = ids.map(id => {
      const svc = qGet('SELECT nombre FROM servicios WHERE id=? OR server_id=?', [id, id])
      return svc?.nombre || null
    }).filter(Boolean)
    if (nombres.length > 0) return { ...row, servicio_nombre: nombres.join(' + ') }
  } catch {}
  return row
}

// JOIN con triple fallback: ID local → server_id → nombre guardado al hacer pull del servidor
const CITAS_JOIN = `
  SELECT c.*,
    COALESCE(
      (SELECT nombre   FROM clientes  WHERE id = c.cliente_id),
      (SELECT nombre   FROM clientes  WHERE server_id = c.cliente_id),
      c._cliente_nombre
    ) AS cliente_nombre,
    COALESCE(
      (SELECT telefono FROM clientes  WHERE id = c.cliente_id),
      (SELECT telefono FROM clientes  WHERE server_id = c.cliente_id),
      c._cliente_telefono
    ) AS cliente_telefono,
    COALESCE(
      (SELECT nombre   FROM barberos  WHERE id = c.barbero_id),
      (SELECT nombre   FROM barberos  WHERE server_id = c.barbero_id),
      c._barbero_nombre
    ) AS barbero_nombre,
    COALESCE(
      (SELECT nombre   FROM servicios WHERE id = c.servicio_id),
      (SELECT nombre   FROM servicios WHERE server_id = c.servicio_id),
      c._servicio_nombre
    ) AS servicio_nombre,
    COALESCE(
      (SELECT precio   FROM servicios WHERE id = c.servicio_id),
      (SELECT precio   FROM servicios WHERE server_id = c.servicio_id)
    ) AS servicio_precio
  FROM citas c
`

const citas = {
  getAll: () => qAll(CITAS_JOIN + ' ORDER BY c.fecha DESC, c.hora DESC').map(enrichServicioNombre),
  getById: (id) => qGet('SELECT * FROM citas WHERE id=?', [id]),
  getByFecha: (fecha) => qAll(CITAS_JOIN + ' WHERE c.fecha = ? ORDER BY c.hora', [fecha]).map(enrichServicioNombre),
  create: (d) => {
    // servicios_ids puede venir como array → serializar a JSON para SQLite
    const sidsJson = Array.isArray(d.servicios_ids) && d.servicios_ids.length
      ? JSON.stringify(d.servicios_ids)
      : null
    const servicioId = d.servicio_id || (Array.isArray(d.servicios_ids) ? d.servicios_ids[0] : null) || null
    qRun(
      'INSERT INTO citas (cliente_id,barbero_id,servicio_id,servicios_ids,fecha,hora,estado,notas,precio_total,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [d.cliente_id, d.barbero_id, servicioId, sidsJson, d.fecha, d.hora, d.estado || 'pendiente', d.notas || null, d.precio_total || 0, now(), now()]
    )
    const id = lastId()
    encolarSync('citas', 'create', { ...d, servicio_id: servicioId, servicios_ids: d.servicios_ids || null, local_id: id }, id)
    return id
  },
  update: (id, d) => {
    const sidsJson = Array.isArray(d.servicios_ids) && d.servicios_ids.length
      ? JSON.stringify(d.servicios_ids)
      : null
    const servicioId = d.servicio_id || (Array.isArray(d.servicios_ids) ? d.servicios_ids[0] : null) || null
    qRun(
      'UPDATE citas SET cliente_id=?,barbero_id=?,servicio_id=?,servicios_ids=?,fecha=?,hora=?,estado=?,notas=?,precio_total=?,updated_at=?,sync_status=? WHERE id=?',
      [d.cliente_id, d.barbero_id, servicioId, sidsJson, d.fecha, d.hora, d.estado, d.notas || null, d.precio_total || 0, now(), 'pending', id]
    )
    encolarSync('citas', 'update', { ...d, servicio_id: servicioId, servicios_ids: d.servicios_ids || null, local_id: id }, id)
  },
  delete: (id) => {
    const c = qGet('SELECT * FROM citas WHERE id=?', [id])
    qRun('DELETE FROM citas WHERE id=?', [id])
    if (c?.server_id) encolarSync('citas', 'delete', { server_id: c.server_id }, id, c.server_id)
  },
  // Elimina localmente citas synced que ya no existen en el servidor
  reconcileDeleted: (serverIds) => {
    if (!serverIds || serverIds.length === 0) return
    const placeholders = serverIds.map(() => '?').join(',')
    qRun(
      `DELETE FROM citas WHERE sync_status='synced' AND server_id IS NOT NULL AND server_id NOT IN (${placeholders})`,
      serverIds
    )
  },
  // Upsert de datos recibidos desde el servidor (NO encola sync)
  upsertFromServer: (items) => {
    for (const d of items) {
      // Intentar resolver server IDs → IDs locales
      const localBarbero  = d.barbero_id  ? qGet('SELECT id FROM barberos  WHERE server_id=?', [d.barbero_id])  : null
      const localCliente  = d.cliente_id  ? qGet('SELECT id FROM clientes  WHERE server_id=?', [d.cliente_id])  : null
      const localServicio = d.servicio_id ? qGet('SELECT id FROM servicios WHERE server_id=?', [d.servicio_id]) : null

      const barberoId  = localBarbero?.id  ?? d.barbero_id  ?? null
      const clienteId  = localCliente?.id  ?? d.cliente_id  ?? null
      const servicioId = localServicio?.id ?? d.servicio_id ?? null

      // Guardar nombres directamente como fallback garantizado (vienen en to_dict del backend)
      const barberoNombre  = d.barbero_nombre  || null
      const clienteNombre  = d.cliente_nombre  || null
      const servicioNombre = d.servicio_nombre || null
      const clienteTel     = d.cliente_telefono || null

      // servicios_ids viene como array desde el servidor → guardar como JSON text
      const sidsJson = Array.isArray(d.servicios_ids) && d.servicios_ids.length
        ? JSON.stringify(d.servicios_ids)
        : null

      const existing = qGet('SELECT id FROM citas WHERE server_id=?', [d.id])
      if (existing) {
        qRun(
          `UPDATE citas SET
            cliente_id=?,barbero_id=?,servicio_id=?,servicios_ids=?,fecha=?,hora=?,estado=?,notas=?,precio_total=?,
            updated_at=?,sync_status=?,
            _barbero_nombre=?,_cliente_nombre=?,_servicio_nombre=?,_cliente_telefono=?
          WHERE id=?`,
          [clienteId, barberoId, servicioId, sidsJson, d.fecha, d.hora||'', d.estado, d.notas||null, d.precio_total||0,
           d.updated_at||now(), 'synced',
           barberoNombre, clienteNombre, servicioNombre, clienteTel,
           existing.id]
        )
      } else {
        qRun(
          `INSERT INTO citas
            (cliente_id,barbero_id,servicio_id,servicios_ids,fecha,hora,estado,notas,precio_total,
             server_id,sync_status,created_at,updated_at,
             _barbero_nombre,_cliente_nombre,_servicio_nombre,_cliente_telefono)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [clienteId, barberoId, servicioId, sidsJson, d.fecha, d.hora||'', d.estado, d.notas||null, d.precio_total||0,
           d.id, 'synced', d.created_at||now(), d.updated_at||now(),
           barberoNombre, clienteNombre, servicioNombre, clienteTel]
        )
      }
    }
  },
}

// ==================== DASHBOARD ====================

// Fecha local en Node (evita bug UTC: toISOString devuelve mañana después de las 21hs en Argentina)
function localDateNode(d = new Date()) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const dashboard = {
  getStats: () => {
    const hoy = localDateNode()
    const inicioMes = hoy.slice(0, 7) + '-01'
    return {
      citas_hoy:        qGet('SELECT COUNT(*) as n FROM citas WHERE fecha=?', [hoy])?.n || 0,
      citas_mes:        qGet('SELECT COUNT(*) as n FROM citas WHERE fecha>=?', [inicioMes])?.n || 0,
      ingresos_mes:     qGet("SELECT COALESCE(SUM(precio_total),0) as n FROM citas WHERE fecha>=? AND estado='completada'", [inicioMes])?.n || 0,
      total_clientes:   qGet('SELECT COUNT(*) as n FROM clientes')?.n || 0,
      barberos_activos: qGet('SELECT COUNT(*) as n FROM barberos WHERE activo=1')?.n || 0,
      citas_pendientes: qGet("SELECT COUNT(*) as n FROM citas WHERE estado='pendiente'")?.n || 0,
    }
  },
  getCitasPorDia: () => {
    const hace7 = localDateNode(new Date(Date.now() - 7 * 86400000))
    return qAll('SELECT fecha, COUNT(*) as total FROM citas WHERE fecha >= ? GROUP BY fecha ORDER BY fecha', [hace7])
  },
  getTopServicios: () => qAll(`
    SELECT
      COALESCE(s.nombre, c._servicio_nombre, 'Sin servicio') AS nombre,
      COUNT(*) as total,
      SUM(c.precio_total) as ingresos
    FROM citas c
    LEFT JOIN servicios s ON (c.servicio_id = s.id OR c.servicio_id = s.server_id)
    GROUP BY COALESCE(s.nombre, c._servicio_nombre, 'Sin servicio')
    ORDER BY total DESC LIMIT 5
  `),

  /**
   * Historial mensual de los últimos N meses: ventas, pago barberos y ganancia admin.
   * Usa los porcentajes configurados en comisiones_config (default 40%).
   */
  getBalanceHistorico: (meses = 6) => {
    const desde = new Date()
    desde.setMonth(desde.getMonth() - (meses - 1))
    desde.setDate(1)
    const desdeStr = desde.toISOString().slice(0, 10)

    return qAll(`
      SELECT
        strftime('%Y-%m', c.fecha) AS mes,
        COALESCE(SUM(c.precio_total), 0) AS total_ventas,
        COALESCE(SUM(
          c.precio_total
          * COALESCE((SELECT porcentaje_barbero FROM comisiones_config WHERE barbero_id = b.id), 40)
          / 100.0
        ), 0) AS pago_barberos,
        COALESCE(SUM(
          c.precio_total
          * (100 - COALESCE((SELECT porcentaje_barbero FROM comisiones_config WHERE barbero_id = b.id), 40))
          / 100.0
        ), 0) AS ganancia_admin
      FROM citas c
      LEFT JOIN barberos b ON (c.barbero_id = b.id OR c.barbero_id = b.server_id)
      WHERE c.estado = 'completada'
        AND c.fecha >= ?
      GROUP BY strftime('%Y-%m', c.fecha)
      ORDER BY mes ASC
    `, [desdeStr])
  },

  /**
   * Comisiones del mes indicado usando porcentajes configurados por barbero.
   * Si no hay config para un barbero, se usa 40% por defecto.
   * Solo cuenta citas con estado = 'completada'.
   */
  getComisionesMes: (mesInicio) => {
    const inicio = mesInicio || (new Date().toISOString().slice(0, 7) + '-01')
    const [y, m] = inicio.slice(0, 7).split('-').map(Number)
    const fin = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, '0')}-01`

    return qAll(`
      SELECT
        b.id,
        b.nombre AS barbero,
        COUNT(c.id)                              AS citas_completadas,
        COALESCE(SUM(c.precio_total), 0)         AS total_ventas,
        COALESCE(
          (SELECT porcentaje_barbero FROM comisiones_config WHERE barbero_id = b.id),
          40
        ) AS pct_barbero,
        COALESCE(SUM(c.precio_total), 0)
          * COALESCE((SELECT porcentaje_barbero FROM comisiones_config WHERE barbero_id = b.id), 40)
          / 100.0
          AS pago_barbero,
        COALESCE(SUM(c.precio_total), 0)
          * (100 - COALESCE((SELECT porcentaje_barbero FROM comisiones_config WHERE barbero_id = b.id), 40))
          / 100.0
          AS ganancia_admin
      FROM barberos b
      LEFT JOIN citas c
        ON (c.barbero_id = b.id OR c.barbero_id = b.server_id)
        AND c.estado = 'completada'
        AND c.fecha >= ?
        AND c.fecha <  ?
      WHERE b.activo = 1
      GROUP BY b.id
      ORDER BY total_ventas DESC
    `, [inicio, fin])
  },
}

// ==================== SYNC QUEUE ====================

const syncQueue = {
  getPendientes: () => qAll('SELECT * FROM sync_queue ORDER BY id LIMIT 50'),
  marcarCompletado: (id) => qRun('DELETE FROM sync_queue WHERE id=?', [id]),
  incrementarIntentos: (id) => qRun('UPDATE sync_queue SET intentos=intentos+1 WHERE id=?', [id]),
  actualizarServerId: (tabla, local_id, server_id) => {
    qRun(`UPDATE ${tabla} SET server_id=?, sync_status='synced' WHERE id=?`, [server_id, local_id])
  },
}

// ==================== CONFIG ====================

const config = {
  get: (clave) => qGet('SELECT valor FROM config WHERE clave=?', [clave])?.valor,
  set: (clave, valor) => qRun('INSERT OR REPLACE INTO config (clave,valor) VALUES (?,?)', [clave, String(valor)]),
}

// ==================== COMISIONES CONFIG ====================

const comisionesConfig = {
  /** Devuelve [{barbero_id, nombre, porcentaje_barbero}] para todos los barberos activos */
  getAll: () => qAll(`
    SELECT b.id AS barbero_id, b.nombre,
      COALESCE(cc.porcentaje_barbero, 40) AS porcentaje_barbero
    FROM barberos b
    LEFT JOIN comisiones_config cc ON cc.barbero_id = b.id
    WHERE b.activo = 1
  `),

  /** Guarda el % localmente Y lo encola para sincronizar al servidor */
  set: (barberoId, porcentajeBarbero) => {
    qRun(
      `INSERT OR REPLACE INTO comisiones_config (barbero_id, porcentaje_barbero, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [barberoId, porcentajeBarbero]
    )
    const barbero = qGet('SELECT id, server_id FROM barberos WHERE id=?', [barberoId])
    if (barbero?.server_id) {
      encolarSync('barberos', 'update', { porcentaje_comision: porcentajeBarbero }, barberoId, barbero.server_id)
    }
  },
}

// ==================== GASTOS ====================

const gastos = {
  getAll: () => qAll('SELECT * FROM gastos WHERE activo=1 ORDER BY fecha DESC, created_at DESC'),
  getByFecha: (fecha) => qAll('SELECT * FROM gastos WHERE activo=1 AND fecha=?', [fecha]),
  getByMes: (mes) => qAll("SELECT * FROM gastos WHERE activo=1 AND strftime('%Y-%m', fecha)=?", [mes]),
  create: (d) => {
    qRun(
      'INSERT INTO gastos (nombre, categoria, monto, frecuencia, fecha, notas) VALUES (?,?,?,?,?,?)',
      [d.nombre, d.categoria || 'otro', Number(d.monto) || 0, d.frecuencia || 'mensual', d.fecha || null, d.notas || null]
    )
    return lastId()
  },
  update: (id, d) => {
    qRun(
      'UPDATE gastos SET nombre=?, categoria=?, monto=?, frecuencia=?, fecha=?, notas=? WHERE id=?',
      [d.nombre, d.categoria || 'otro', Number(d.monto) || 0, d.frecuencia || 'mensual', d.fecha || null, d.notas || null, id]
    )
  },
  delete: (id) => qRun('DELETE FROM gastos WHERE id=?', [id]),
}

// ==================== CAJA MOVIMIENTOS ====================

const cajaMovimientos = {
  getAll: () => qAll('SELECT * FROM caja_movimientos ORDER BY fecha DESC, hora DESC'),
  getByFecha: (fecha) => qAll('SELECT * FROM caja_movimientos WHERE fecha=? ORDER BY hora', [fecha]),
  create: (d) => {
    qRun(
      'INSERT INTO caja_movimientos (tipo, concepto, monto, fecha, hora, notas, metodo) VALUES (?,?,?,?,?,?,?)',
      [d.tipo, d.concepto, Number(d.monto) || 0, d.fecha, d.hora || null, d.notas || null, d.metodo || 'efectivo']
    )
    return lastId()
  },
  delete: (id) => qRun('DELETE FROM caja_movimientos WHERE id=?', [id]),
}

module.exports = {
  initDatabase,
  loginLocal,
  usuarios,
  barberos,
  clientes,
  servicios,
  citas,
  dashboard,
  config,
  comisionesConfig,
  syncQueue,
  gastos,
  cajaMovimientos,
}
