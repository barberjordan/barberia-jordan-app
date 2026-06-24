import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SyncProvider } from './context/SyncContext'
import { ThemeProvider } from './context/ThemeContext'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Barberos from './components/Barberos'
import Clientes from './components/Clientes'
import Servicios from './components/Servicios'
import Citas from './components/Citas'
import Reportes from './components/Reportes'
import Usuarios from './components/Usuarios'
import Configuracion from './components/Configuracion'
import { Download, RefreshCw, X } from 'lucide-react'

// ==================== NOTIFICACIÓN DE ACTUALIZACIÓN ====================
function UpdateBanner() {
  const [estado, setEstado] = useState(null) // null | 'disponible' | 'descargando' | 'lista'
  const [version, setVersion] = useState('')
  const [progreso, setProgreso] = useState(0)
  const [cerrado, setCerrado] = useState(false)

  useEffect(() => {
    if (!window.api?.updater) return

    // Consultar estado actual (por si el evento llegó antes de que este componente montara)
    window.api.updater.getEstado().then((estado) => {
      if (!estado) return
      setVersion(estado.version)
      if (estado.tipo === 'descargada') {
        setEstado('lista')
      } else if (estado.tipo === 'disponible') {
        setEstado('disponible')
      }
      setCerrado(false)
    })

    window.api.updater.onDisponible(({ version: v }) => {
      setVersion(v)
      setEstado('disponible')
      setCerrado(false)
    })

    window.api.updater.onProgreso(({ porcentaje }) => {
      setEstado('descargando')
      setProgreso(porcentaje)
    })

    window.api.updater.onDescargada(({ version: v }) => {
      setVersion(v)
      setEstado('lista')
      setCerrado(false)
    })
  }, [])

  if (!estado || cerrado) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
          {estado === 'lista' ? <RefreshCw size={16} className="text-primary-600" /> : <Download size={16} className="text-primary-600" />}
        </div>
        <div className="flex-1 min-w-0">
          {estado === 'disponible' && (
            <>
              <p className="text-sm font-semibold text-slate-800">Nueva versión disponible</p>
              <p className="text-xs text-slate-500 mt-0.5">v{version} — descargando en segundo plano...</p>
            </>
          )}
          {estado === 'descargando' && (
            <>
              <p className="text-sm font-semibold text-slate-800">Descargando actualización...</p>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progreso}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{progreso}%</p>
            </>
          )}
          {estado === 'lista' && (
            <>
              <p className="text-sm font-semibold text-slate-800">Actualización lista</p>
              <p className="text-xs text-slate-500 mt-0.5">v{version} descargada. Reiniciá para instalar.</p>
              <button onClick={() => window.api.updater.instalar()}
                className="mt-2 w-full bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium py-1.5 rounded-lg transition">
                Reiniciar e instalar
              </button>
            </>
          )}
        </div>
        {estado !== 'descargando' && (
          <button onClick={() => setCerrado(true)} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function AppInner() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!user) return <Login />

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onToggleSidebar={() => setSidebarOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/"           element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/barberos"   element={<Barberos />} />
            <Route path="/clientes"   element={<Clientes />} />
            <Route path="/servicios"  element={<Servicios />} />
            <Route path="/citas"      element={<Citas />} />
            <Route path="/reportes"   element={<Reportes />} />
            <Route path="/usuarios"       element={<Usuarios />} />
            <Route path="/configuracion"  element={<Configuracion />} />
            <Route path="*"               element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
      <UpdateBanner />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncProvider>
          <HashRouter>
            <AppInner />
          </HashRouter>
        </SyncProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
