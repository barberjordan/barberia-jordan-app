import React, { useRef } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { useTheme, ACENTOS, PRESETS, DEFAULT_COLORS } from '../context/ThemeContext'

// ── Labels legibles para cada clave de color ──
const COLOR_KEY_LABELS = {
  sidebarBg:      'Fondo del menú',
  sidebarText:    'Texto del menú',
  sidebarHoverBg: 'Hover del menú',
  contentBg:      'Fondo del contenido',
  cardBg:         'Fondo de tarjetas',
  cardBorder:     'Bordes de tarjetas',
  navbarBg:       'Fondo de la barra superior',
  navbarBorder:   'Borde de la barra',
  textPrimary:    'Texto principal',
  textSecondary:  'Texto secundario',
  textMuted:      'Texto tenue',
  inputBg:        'Fondo de inputs',
  inputBorder:    'Borde de inputs',
  tableHeaderBg:  'Cabecera de tablas',
}

const GRUPOS = [
  {
    label: 'Menú lateral',
    keys: ['sidebarBg', 'sidebarText', 'sidebarHoverBg'],
  },
  {
    label: 'Área de contenido',
    keys: ['contentBg', 'cardBg', 'cardBorder'],
  },
  {
    label: 'Barra superior',
    keys: ['navbarBg', 'navbarBorder'],
  },
  {
    label: 'Textos',
    keys: ['textPrimary', 'textSecondary', 'textMuted'],
  },
  {
    label: 'Formularios',
    keys: ['inputBg', 'inputBorder', 'tableHeaderBg'],
  },
]

export default function Temas() {
  const { acento, setAcento, presetId, colors, applyPreset, updateColor } = useTheme()

  function resetToDefault() {
    applyPreset('clasico')
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Temas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Personalizá la apariencia a tu gusto
          </p>
        </div>
        <button
          onClick={resetToDefault}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition hover:opacity-80"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)', backgroundColor: 'var(--card-bg)' }}
        >
          <RotateCcw size={13} /> Restaurar clásico
        </button>
      </div>

      {/* ── Presets ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Temas predefinidos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRESETS.map(preset => {
            const active = presetId === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className="relative rounded-xl overflow-hidden transition-all hover:scale-[1.02] focus:outline-none"
                style={{
                  border: `2px solid ${active ? `rgb(var(--p-500))` : 'transparent'}`,
                  boxShadow: active
                    ? `0 0 0 3px rgb(var(--p-500) / 0.25)`
                    : '0 1px 4px rgba(0,0,0,0.12)',
                }}
              >
                {/* Mini preview */}
                <div className="h-16 flex">
                  {/* Sidebar strip */}
                  <div className="w-7 p-1 flex flex-col gap-0.5 shrink-0" style={{ backgroundColor: preset.colors.sidebarBg }}>
                    <div className="w-4 h-4 rounded-sm mx-auto mb-0.5 opacity-60"
                      style={{ backgroundColor: preset.colors.sidebarText }} />
                    {[1,0.4,0.3,0.3].map((op, i) => (
                      <div key={i} className="w-full h-1.5 rounded-sm"
                        style={{ backgroundColor: preset.colors.sidebarText, opacity: op }} />
                    ))}
                  </div>
                  {/* Content area */}
                  <div className="flex-1 p-1.5 flex flex-col gap-1" style={{ backgroundColor: preset.colors.contentBg }}>
                    {/* Navbar strip */}
                    <div className="w-full h-3 rounded-sm" style={{ backgroundColor: preset.colors.navbarBg, border: `1px solid ${preset.colors.navbarBorder}` }} />
                    {/* Cards */}
                    <div className="flex gap-1 flex-1">
                      {[1, 0.6].map((w, i) => (
                        <div key={i} className="h-full rounded-sm flex-1"
                          style={{ backgroundColor: preset.colors.cardBg, border: `1px solid ${preset.colors.cardBorder}`, flex: w }} />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Label */}
                <div className="px-2 py-1.5 flex items-center justify-between"
                  style={{ backgroundColor: preset.colors.cardBg, borderTop: `1px solid ${preset.colors.cardBorder}` }}>
                  <span className="text-xs font-medium" style={{ color: preset.colors.textSecondary }}>
                    {preset.emoji} {preset.label}
                  </span>
                  {active && <Check size={11} style={{ color: `rgb(var(--p-500))`, flexShrink: 0 }} />}
                </div>
              </button>
            )
          })}
        </div>

        {presetId === 'personalizado' && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            ✏️ Usando colores personalizados
          </p>
        )}
      </section>

      {/* ── Acento de color ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Color de acento
        </h2>
        <div className="rounded-xl p-4 flex flex-wrap gap-2"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          {ACENTOS.map(a => (
            <button
              key={a.id}
              onClick={() => setAcento(a.id)}
              title={a.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: acento === a.id ? `${a.color}20` : 'transparent',
                border: `2px solid ${acento === a.id ? a.color : 'transparent'}`,
                color: 'var(--text-secondary)',
              }}
            >
              <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
              {a.label}
              {acento === a.id && <Check size={12} style={{ color: a.color }} />}
            </button>
          ))}
        </div>
      </section>

      {/* ── Personalización avanzada ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Personalización avanzada
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
          {GRUPOS.map((grupo, gi) => (
            <div key={grupo.label}>
              {gi > 0 && <div style={{ height: 1, backgroundColor: 'var(--card-border)' }} />}
              <div className="p-4" style={{ backgroundColor: 'var(--card-bg)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                  {grupo.label}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {grupo.keys.map(key => (
                    <ColorPicker
                      key={key}
                      colorKey={key}
                      value={colors[key] || DEFAULT_COLORS[key] || '#ffffff'}
                      onChange={updateColor}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vista previa rápida ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Vista previa
        </h2>
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--card-border)', height: 140 }}>
          <div className="flex h-full">
            {/* Sidebar preview */}
            <div className="flex flex-col shrink-0 p-3 gap-1.5" style={{ width: 120, backgroundColor: 'var(--sidebar-bg)' }}>
              <div className="w-full h-7 rounded-lg" style={{ backgroundColor: `rgb(var(--p-500))` }} />
              {['Dashboard', 'Citas', 'Caja', 'Gastos'].map((item, i) => (
                <div key={item} className="w-full h-6 rounded-md flex items-center px-2"
                  style={{ backgroundColor: i === 0 ? 'var(--sidebar-hover-bg)' : 'transparent' }}>
                  <span className="text-xs" style={{ color: i === 0 ? '#ffffff' : 'var(--sidebar-text)' }}>{item}</span>
                </div>
              ))}
            </div>
            {/* Content preview */}
            <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--content-bg)' }}>
              {/* Navbar */}
              <div className="flex items-center justify-between px-4 shrink-0" style={{ height: 36, backgroundColor: 'var(--navbar-bg)', borderBottom: '1px solid var(--navbar-border)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard</span>
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: `rgb(var(--p-500))` }} />
              </div>
              {/* Cards */}
              <div className="flex-1 p-3 grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="rounded-lg p-2" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Dato {n}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ejemplo</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Componente de color picker ──
function ColorPicker({ colorKey, value, onChange }) {
  const inputRef = useRef(null)

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
      style={{ backgroundColor: 'var(--table-header-bg)' }}
      onClick={() => inputRef.current?.click()}
    >
      <div className="relative shrink-0">
        <div
          className="w-9 h-9 rounded-lg shadow-sm"
          style={{
            backgroundColor: value,
            border: '2px solid rgba(255,255,255,0.3)',
            outline: '1px solid rgba(0,0,0,0.1)',
          }}
        />
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={e => onChange(colorKey, e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
          {COLOR_KEY_LABELS[colorKey] || colorKey}
        </p>
        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{value}</p>
      </div>
    </div>
  )
}
