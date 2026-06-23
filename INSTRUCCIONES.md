# Barbería Jordan — App de Escritorio

## Requisitos previos
- Node.js 18+
- Python 3.11+ (para el backend cloud)
- Git

---

## Instalación y desarrollo local

```bash
cd barberia-app
npm install
npm run dev
```

Esto abre la app en modo desarrollo con Electron + Vite en modo hot-reload.

**Usuario por defecto:**
- Email: `admin@barberia.com`
- Contraseña: `admin123`

---

## Compilar instalador .exe para Windows

```bash
npm run build:win
```

El instalador queda en `dist-electron/`. Se instala con doble clic.

---

## Backend en la nube (sincronización)

El backend es opcional. Sin él, la app funciona 100% offline.

### Deploy en Render (gratis):
1. Sube `backend-cloud/` a GitHub
2. Crea un nuevo Web Service en render.com apuntando a ese repo
3. Variables de entorno: `DATABASE_URL` (PostgreSQL de Render), `SECRET_KEY`
4. En la app de escritorio, ir a Configuración y poner la URL del backend

### Configurar URL del backend en la app:
La app guarda la URL en su base de datos local. Puedes cambiarla desde
el código modificando `electron/sync.js → getApiUrl()`.

---

## Cómo funciona offline/online

- **Offline**: Todos los datos se guardan en SQLite local (`%APPDATA%/Barbería Jordan/barberia.db`)
- **Cola de sync**: Cada operación (crear/editar/eliminar) se encola en `sync_queue`
- **Reconexión**: Cada 30 segundos se verifica si hay internet. Al reconectar, la cola se procesa automáticamente
- **Indicador**: La barra superior muestra 🟢 Online / ⚫ Offline en tiempo real

---

## Estructura del proyecto

```
barberia-app/
├── electron/
│   ├── main.js        # Proceso principal Electron + IPC handlers
│   ├── preload.js     # Bridge seguro renderer ↔ main
│   ├── database.js    # SQLite local (CRUD + cola sync)
│   └── sync.js        # Servicio de sincronización online
├── src/
│   ├── components/    # Todos los componentes React
│   ├── context/       # AuthContext + SyncContext
│   └── App.jsx        # Router principal
├── backend-cloud/
│   ├── app.py         # Flask API para sync en la nube
│   └── requirements.txt
└── package.json
```
