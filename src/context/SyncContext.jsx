import React, { createContext, useState, useEffect, useContext, useCallback } from 'react'

export const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const [online, setOnline]           = useState(false)
  const [progreso, setProgreso]       = useState('')
  const [refreshTick, setRefreshTick] = useState(0)
  const [notificaciones, setNotifs]   = useState([])   // citas nuevas pendientes de ver

  useEffect(() => {
    if (window.api?.sync) {
      window.api.sync.estado((data) => setOnline(data.online))
      window.api.sync.progreso((data) => {
        setProgreso(data.msg)
        setTimeout(() => setProgreso(''), 4000)
      })
      window.api.sync.refresh(() => {
        setRefreshTick(t => t + 1)
      })
      // Escuchar citas nuevas detectadas por el proceso de sync
      window.api.sync.onCitaNueva((cita) => {
        setNotifs(prev => [...prev, cita])
      })
    }
  }, [])

  async function forzarSync() {
    await window.api.sync.forzar()
  }

  function dismissNotificacion() {
    setNotifs(prev => prev.slice(1))
  }

  return (
    <SyncContext.Provider value={{ online, progreso, forzarSync, refreshTick, notificaciones, dismissNotificacion }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  return useContext(SyncContext)
}
