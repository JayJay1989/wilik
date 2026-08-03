// Each preset's `ink` (dark or light) is pre-checked to keep button text readable
// against that color, so picking any preset can't produce a low-contrast combo.
//
// "Teal" has `value: null` — it means "no override", i.e. fall back to the
// theme-aware default in index.css (which is lighter in dark mode). Picking it
// explicitly must behave identically to never having picked a theme at all.
export const THEME_PRESETS = [
  { name: 'Teal', value: null, swatchColor: 'var(--teal-default)' },
  { name: 'Blurple', value: '#5b5fef', swatchColor: '#5b5fef', ink: 'light' },
  { name: 'Gold', value: '#d4a017', swatchColor: '#d4a017', ink: 'dark' },
  { name: 'Burnt orange', value: '#d2601a', swatchColor: '#d2601a', ink: 'dark' },
  { name: 'Magenta', value: '#e83b75', swatchColor: '#e83b75', ink: 'light' },
]

export function themeStyle(colorHex) {
  if (colorHex == null) return undefined
  const preset = THEME_PRESETS.find((p) => p.value === colorHex)
  if (!preset) return undefined
  return {
    '--accent': preset.value,
    '--accent-bg': `${preset.value}1a`,
    '--accent-border': `${preset.value}80`,
    '--accent-ink': preset.ink === 'light' ? '#ffffff' : '#08060d',
  }
}
