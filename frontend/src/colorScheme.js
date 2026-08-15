const STORAGE_KEY = 'wilik-color-scheme'
// caches the admin's instance-wide default so index.html's pre-paint script (and any
// browser that hasn't visited Settings yet) can use it instead of the hardcoded 'dark'
// fallback -- see cacheDefaultColorScheme below and the inline script in index.html
const DEFAULT_STORAGE_KEY = 'wilik-color-scheme-default'

// 'dark' is the default -- light is opt-in, 'auto' follows the OS preference
export function getColorScheme() {
  return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(DEFAULT_STORAGE_KEY) || 'dark'
}

export function setColorScheme(scheme) {
  localStorage.setItem(STORAGE_KEY, scheme)
  applyColorScheme(scheme)
}

export function applyColorScheme(scheme) {
  document.documentElement.dataset.theme = scheme
}

// called once on app load with the admin-configured default (see AppSettings.default_color_scheme).
// Only takes effect live if this browser hasn't made its own explicit choice yet -- otherwise it
// just updates the cache used by index.html's script on the *next* visit.
export function cacheDefaultColorScheme(scheme) {
  localStorage.setItem(DEFAULT_STORAGE_KEY, scheme)
  if (!localStorage.getItem(STORAGE_KEY)) {
    applyColorScheme(scheme)
  }
}
