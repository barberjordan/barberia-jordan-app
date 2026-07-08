import React, { createContext, useState, useContext, useEffect } from 'react'

// ── Acentos de color (botones, activos, badges) ──
export const ACENTOS = [
  { id: 'naranja', label: 'Naranja', color: '#f97316' },
  { id: 'azul',    label: 'Azul',    color: '#3b82f6' },
  { id: 'verde',   label: 'Verde',   color: '#10b981' },
  { id: 'morado',  label: 'Morado',  color: '#8b5cf6' },
  { id: 'rosa',    label: 'Rosa',    color: '#f43f5e' },
  { id: 'rojo',    label: 'Rojo',    color: '#ef4444' },
  { id: 'cian',    label: 'Cian',    color: '#06b6d4' },
  { id: 'ambar',   label: 'Ámbar',   color: '#f59e0b' },
]

// ── Colores base (clásico) ──
export const DEFAULT_COLORS = {
  sidebarBg:      '#0f172a',
  sidebarText:    '#94a3b8',
  sidebarHoverBg: '#1e293b',
  contentBg:      '#f8fafc',
  cardBg:         '#ffffff',
  cardBorder:     '#f1f5f9',
  navbarBg:       '#ffffff',
  navbarBorder:   '#e2e8f0',
  textPrimary:    '#1e293b',
  textSecondary:  '#64748b',
  textMuted:      '#94a3b8',
  inputBg:        '#ffffff',
  inputBorder:    '#e2e8f0',
  tableHeaderBg:  '#f8fafc',
  dark:           false,
}

// ── Presets ──
export const PRESETS = [
  {
    id: 'clasico',
    label: 'Clásico',
    emoji: '☀️',
    colors: { ...DEFAULT_COLORS },
  },
  {
    id: 'noche',
    label: 'Noche',
    emoji: '🌙',
    colors: {
      sidebarBg:      '#0d1117',
      sidebarText:    '#6b7280',
      sidebarHoverBg: '#1c2433',
      contentBg:      '#0d1117',
      cardBg:         '#161b22',
      cardBorder:     '#30363d',
      navbarBg:       '#161b22',
      navbarBorder:   '#30363d',
      textPrimary:    '#e6edf3',
      textSecondary:  '#8b949e',
      textMuted:      '#6e7681',
      inputBg:        '#21262d',
      inputBorder:    '#30363d',
      tableHeaderBg:  '#0d1117',
      dark:           true,
    },
  },
  {
    id: 'carbon',
    label: 'Carbón',
    emoji: '🪨',
    colors: {
      sidebarBg:      '#1c1c1e',
      sidebarText:    '#8e8e93',
      sidebarHoverBg: '#2c2c2e',
      contentBg:      '#1c1c1e',
      cardBg:         '#2c2c2e',
      cardBorder:     '#3a3a3c',
      navbarBg:       '#2c2c2e',
      navbarBorder:   '#3a3a3c',
      textPrimary:    '#ffffff',
      textSecondary:  '#aeaeb2',
      textMuted:      '#8e8e93',
      inputBg:        '#3a3a3c',
      inputBorder:    '#48484a',
      tableHeaderBg:  '#242426',
      dark:           true,
    },
  },
  {
    id: 'marino',
    label: 'Marino',
    emoji: '⚓',
    colors: {
      ...DEFAULT_COLORS,
      sidebarBg:      '#0c2461',
      sidebarText:    '#a0b0d4',
      sidebarHoverBg: '#1a3c8f',
    },
  },
  {
    id: 'bosque',
    label: 'Bosque',
    emoji: '🌿',
    colors: {
      ...DEFAULT_COLORS,
      sidebarBg:      '#1a2e1a',
      sidebarText:    '#8aad8a',
      sidebarHoverBg: '#243d24',
      contentBg:      '#f0faf0',
      cardBorder:     '#e0f0e0',
      tableHeaderBg:  '#f0faf0',
    },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    emoji: '🌌',
    colors: {
      ...DEFAULT_COLORS,
      sidebarBg:      '#1a1a2e',
      sidebarText:    '#a0a0cc',
      sidebarHoverBg: '#16213e',
      contentBg:      '#f5f0ff',
      cardBorder:     '#e8e0f8',
      tableHeaderBg:  '#f5f0ff',
    },
  },
  {
    id: 'arena',
    label: 'Arena',
    emoji: '🏜️',
    colors: {
      ...DEFAULT_COLORS,
      sidebarBg:      '#3d2b1f',
      sidebarText:    '#c4a882',
      sidebarHoverBg: '#54392a',
      contentBg:      '#faf8f5',
      cardBorder:     '#f0ebe3',
      tableHeaderBg:  '#faf8f5',
    },
  },
  {
    id: 'acero',
    label: 'Acero',
    emoji: '⚙️',
    colors: {
      ...DEFAULT_COLORS,
      sidebarBg:      '#1e2a3a',
      sidebarText:    '#7890a8',
      sidebarHoverBg: '#283548',
      contentBg:      '#f0f4f8',
      cardBorder:     '#dde5ef',
      tableHeaderBg:  '#f0f4f8',
    },
  },
]

// ── Aplicar vars al DOM ──
function applyColors(colors) {
  const r = document.documentElement
  r.style.setProperty('--sidebar-bg',       colors.sidebarBg)
  r.style.setProperty('--sidebar-text',     colors.sidebarText)
  r.style.setProperty('--sidebar-hover-bg', colors.sidebarHoverBg)
  r.style.setProperty('--content-bg',       colors.contentBg)
  r.style.setProperty('--card-bg',          colors.cardBg)
  r.style.setProperty('--card-border',      colors.cardBorder)
  r.style.setProperty('--navbar-bg',        colors.navbarBg)
  r.style.setProperty('--navbar-border',    colors.navbarBorder)
  r.style.setProperty('--text-primary',     colors.textPrimary)
  r.style.setProperty('--text-secondary',   colors.textSecondary)
  r.style.setProperty('--text-muted',       colors.textMuted)
  r.style.setProperty('--input-bg',         colors.inputBg)
  r.style.setProperty('--input-border',     colors.inputBorder)
  r.style.setProperty('--table-header-bg',  colors.tableHeaderBg)
  r.setAttribute('data-dark', colors.dark ? 'true' : 'false')
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [acento, setAcentoState] = useState(() => {
    try { return localStorage.getItem('tema') || 'naranja' } catch { return 'naranja' }
  })

  const [presetId, setPresetId] = useState(() => {
    try { return localStorage.getItem('tema-preset') || 'clasico' } catch { return 'clasico' }
  })

  const [colors, setColors] = useState(() => {
    try {
      const saved = localStorage.getItem('tema-colors')
      if (saved) return { ...DEFAULT_COLORS, ...JSON.parse(saved) }
    } catch {}
    return { ...DEFAULT_COLORS }
  })

  // Aplicar acento
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', acento)
    try { localStorage.setItem('tema', acento) } catch {}
  }, [acento])

  // Aplicar colores estructurales
  useEffect(() => {
    applyColors(colors)
    try { localStorage.setItem('tema-colors', JSON.stringify(colors)) } catch {}
  }, [colors])

  function setAcento(id) {
    setAcentoState(id)
  }

  function applyPreset(id) {
    const preset = PRESETS.find(p => p.id === id)
    if (!preset) return
    setPresetId(id)
    setColors({ ...DEFAULT_COLORS, ...preset.colors })
    try { localStorage.setItem('tema-preset', id) } catch {}
  }

  function updateColor(key, value) {
    setPresetId('personalizado')
    setColors(prev => ({ ...prev, [key]: value }))
    try { localStorage.setItem('tema-preset', 'personalizado') } catch {}
  }

  return (
    <ThemeContext.Provider value={{ acento, setAcento, presetId, colors, applyPreset, updateColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Mantener export de TEMAS por compatibilidad con Navbar (lo eliminamos pronto)
export const TEMAS = ACENTOS

export function useTheme() {
  return useContext(ThemeContext)
}
