import { useState } from 'react'
import Logo from './Logo'

const API_BASE = '/api'

function FirstLoginSetup({ appName, currentUser, onUpdate }) {
  const [newUsername, setNewUsername] = useState(currentUser.username)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match")
      return
    }
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
        response.json().then((data) => setError(data.error))
        return
      }
      response.json().then(onUpdate)
    })
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
        <button type="submit" className="btn-primary">
          Save and continue
        </button>
      </form>
    </div>
  )
}

export default FirstLoginSetup
