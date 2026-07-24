import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './components/Login'
import FirstLoginSetup from './components/FirstLoginSetup'
import Logo from './components/Logo'
import { SettingsIcon, KeyIcon, LogoutIcon, UserIcon } from './components/Icons'
import WishlistPage from './pages/WishlistPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import { themeStyle } from './themePresets'
import './App.css'

const API_BASE = 'http://localhost:5000/api'

function App() {
  const [appName, setAppName] = useState('Wishdrop')
  const [currentUser, setCurrentUser] = useState(undefined) // undefined = still checking, null = logged out

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((response) => response.json())
      .then((data) => setAppName(data.app_name))
  }, [])

  useEffect(() => {
    document.title = appName
  }, [appName])

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
            <UserIcon /> {currentUser.username}
          </span>
        </div>
        <div className="topbar__actions">
          <Link to="/settings">
            <SettingsIcon /> Settings
          </Link>
          {currentUser.is_admin && (
            <Link to="/admin">
              <KeyIcon /> Admin
            </Link>
          )}
          <button type="button" onClick={handleLogout}>
            <LogoutIcon /> Log out
          </button>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<WishlistPage currentUser={currentUser} />} />
        <Route path="/settings" element={<SettingsPage currentUser={currentUser} onUpdate={setCurrentUser} />} />
        <Route
          path="/admin"
          element={
            currentUser.is_admin ? (
              <AdminPage currentUser={currentUser} appName={appName} onAppNameChange={setAppName} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </div>
  )
}

export default App
