const STORAGE_KEY = 'wishdrop-color-scheme'

// 'dark' is the default -- light is opt-in, 'auto' follows the OS preference
export function getColorScheme() {
  return localStorage.getItem(STORAGE_KEY) || 'dark'
}

export function setColorScheme(scheme) {
  localStorage.setItem(STORAGE_KEY, scheme)
  applyColorScheme(scheme)
}

export function applyColorScheme(scheme) {
  document.documentElement.dataset.theme = scheme
}
