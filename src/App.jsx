import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SyncProvider, useSync } from './context/SyncContext'
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
import Caja from './components/Caja'
import Gastos from './components/Gastos'
import Temas from './components/Temas'
import NotificacionCita from './components/NotificacionCita'

function AppInner() {
  const { user } = useAuth()
  const { notificaciones, dismissNotificacion } = useSync()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!user) return <Login />

  return (
    <>
      {/* Banner de notificación de cita nueva — flota sobre toda la app */}
      <NotificacionCita notificaciones={notificaciones} onDismiss={dismissNotificacion} />

      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--content-bg)' }}>
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
              <Route path="/caja"       element={<Caja />} />
              <Route path="/gastos"     element={<Gastos />} />
              <Route path="/reportes"   element={<Reportes />} />
              <Route path="/usuarios"       element={<Usuarios />} />
              <Route path="/temas"          element={<Temas />} />
              <Route path="/configuracion"  element={<Configuracion />} />
              <Route path="*"               element={<Navigate to="/dashboard" />} />
            </Routes>
          </main>
        </div>
      </div>
    </>
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
