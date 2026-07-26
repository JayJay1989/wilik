import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './components/Login'
import FirstLoginSetup from './components/FirstLoginSetup'
import Logo from './components/Logo'
import { SettingsIcon, KeyIcon, LogoutIcon, UserIcon, ArchiveIcon, MenuIcon, CloseIcon, GiftIcon } from './components/Icons'
import WishlistPage from './pages/WishlistPage'
import ReceivedPage from './pages/ReceivedPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import PublicWishlistPage from './pages/PublicWishlistPage'
import GiftDirectoryPage from './pages/GiftDirectoryPage'
import WishlistChooserPage from './pages/WishlistChooserPage'
import WishlistBrowsePage from './pages/WishlistBrowsePage'
import { themeStyle } from './themePresets'
import './App.css'

const API_BASE = '/api'

function AuthenticatedApp({ appName, onAppNameChange }) {
  const [currentUser, setCurrentUser] = useState(undefined) // undefined = still checking, null = logged out
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/me`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then(setCurrentUser)
  }, [])

  function handleLogout() {
    fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' }).then(() => {
      setCurrentUser(null)
    })
  }

  if (currentUser === undefined) return null
  if (currentUser === null) return <Login appName={appName} onLogin={setCurrentUser} />
  if (currentUser.must_change_password) {
    return <FirstLoginSetup appName={appName} currentUser={currentUser} onUpdate={setCurrentUser} />
  }

  return (
    <div className="app" style={themeStyle(currentUser.theme_color)}>
      <nav className="topbar">
        <div className="topbar__left">
          <Link to="/" className="topbar__brand">
            <Logo size={64} />
            <span>{appName}</span>
          </Link>
          <span className="topbar__user">
            <UserIcon />
            <span className="topbar__user-name">{currentUser.username}</span>
          </span>
        </div>
        <button
          type="button"
          className="topbar__menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <div className={menuOpen ? 'topbar__actions topbar__actions--open' : 'topbar__actions'}>
          <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
            <GiftIcon /> Wishlists
          </Link>
          <Link to="/received" onClick={() => setMenuOpen(false)}>
            <ArchiveIcon /> Received
          </Link>
          <Link to="/settings" onClick={() => setMenuOpen(false)}>
            <SettingsIcon /> Settings
          </Link>
          {currentUser.is_admin && (
            <Link to="/admin" onClick={() => setMenuOpen(false)}>
              <KeyIcon /> Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              handleLogout()
            }}
          >
            <LogoutIcon /> Log out
          </button>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<WishlistPage currentUser={currentUser} />} />
        <Route path="/wishlist" element={<WishlistChooserPage />} />
        <Route path="/wishlist/browse" element={<WishlistBrowsePage />} />
        <Route path="/received" element={<ReceivedPage currentUser={currentUser} />} />
        <Route path="/settings" element={<SettingsPage currentUser={currentUser} onUpdate={setCurrentUser} />} />
        <Route
          path="/admin"
          element={
            currentUser.is_admin ? (
              <AdminPage currentUser={currentUser} appName={appName} onAppNameChange={onAppNameChange} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </div>
  )
}

function App() {
  const [appName, setAppName] = useState('Wilik')

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((response) => response.json())
      .then((data) => setAppName(data.app_name))
  }, [])

  useEffect(() => {
    document.title = appName
  }, [appName])

  return (
    <Routes>
      <Route path="/list/:token" element={<PublicWishlistPage appName={appName} />} />
      <Route path="/directory" element={<GiftDirectoryPage appName={appName} />} />
      <Route path="/*" element={<AuthenticatedApp appName={appName} onAppNameChange={setAppName} />} />
    </Routes>
  )
}

export default App
