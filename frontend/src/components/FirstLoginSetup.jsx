import { useState } from 'react'
import Logo from './Logo'
import { SpinnerIcon } from './Icons'

const API_BASE = '/api'

function FirstLoginSetup({ appName, currentUser, onUpdate }) {
  const [newUsername, setNewUsername] = useState(currentUser.username)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match")
      return
    }
    setBusy(true)
    fetch(`${API_BASE}/account/first-login`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_username: newUsername,
        new_password: newPassword,
      }),
    }).then((response) => {
      if (!response.ok) {
        setBusy(false)
        response.json().then((data) => setError(data.error))
        return
      }
      response.json().then(onUpdate)
    })
  }

  function handleLogout() {
    setBusy(true)
    fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' }).then(() => onUpdate(null))
  }

  return (
    <div className="login-page">
      <form className="gift-form login-form" onSubmit={handleSubmit}>
        <div className="login-form__brand">
          <Logo size={40} />
          <h1>{appName}</h1>
        </div>
        <p className="login-form__hint">Choose your username and set a password to finish setting up your account</p>
        <label>
          Username
          <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} required autoFocus />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? (
            <>
              <SpinnerIcon /> Saving…
            </>
          ) : (
            'Save and continue'
          )}
        </button>
        <button type="button" className="login-form__back" onClick={handleLogout} disabled={busy}>
          Not you? Log out
        </button>
      </form>
    </div>
  )
}

export default FirstLoginSetup
