import React, { createContext, useState, useContext, useEffect } from 'react'

export const TEMAS = [
  { id: 'naranja', label: 'Naranja', color: '#f97316' },
  { id: 'azul',    label: 'Azul',    color: '#3b82f6' },
  { id: 'verde',   label: 'Verde',   color: '#10b981' },
  { id: 'morado',  label: 'Morado',  color: '#8b5cf6' },
  { id: 'rosa',    label: 'Rosa',    color: '#f43f5e' },
  { id: 'rojo',    label: 'Rojo',    color: '#ef4444' },
]

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem('tema') || 'naranja' } catch { return 'naranja' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    try { localStorage.setItem('tema', tema) } catch {}
  }, [tema])

  return (
    <ThemeContext.Provider value={{ tema, setTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
