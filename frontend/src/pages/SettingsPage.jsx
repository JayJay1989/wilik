import { useState } from 'react'
import { Link } from 'react-router-dom'
import { THEME_PRESETS } from '../themePresets'

const API_BASE = 'http://localhost:5000/api'

function SettingsPage({ currentUser, onUpdate }) {
  const [username, setUsername] = useState(currentUser.username)
  const [usernameError, setUsernameError] = useState(null)
  const [usernameSaved, setUsernameSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [email, setEmail] = useState(currentUser.email ?? '')
  const [emailError, setEmailError] = useState(null)
  const [emailSaved, setEmailSaved] = useState(false)

  const [listName, setListName] = useState(currentUser.list_name)
  const [currency, setCurrency] = useState(currentUser.currency)
  const [decimalSeparator, setDecimalSeparator] = useState(currentUser.decimal_separator)
  const [themeColor, setThemeColor] = useState(currentUser.theme_color)
  const [wishlistError, setWishlistError] = useState(null)
  const [wishlistSaved, setWishlistSaved] = useState(false)

  function handleUsernameSubmit(event) {
    event.preventDefault()
    setUsernameError(null)
    setUsernameSaved(false)
    fetch(`${API_BASE}/account`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setUsernameError(data.error))
        return
      }
      response.json().then((updatedUser) => {
        onUpdate(updatedUser)
        setUsernameSaved(true)
      })
    })
  }

  function handleEmailSubmit(event) {
    event.preventDefault()
    setEmailError(null)
    setEmailSaved(false)
    fetch(`${API_BASE}/account`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email === '' ? null : email }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setEmailError(data.error))
        return
      }
      response.json().then((updatedUser) => {
        onUpdate(updatedUser)
        setEmailSaved(true)
      })
    })
  }

  function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match")
      return
    }
    fetch(`${API_BASE}/account/password`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setPasswordError(data.error))
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
    })
  }

  function handleWishlistSubmit(event) {
    event.preventDefault()
    setWishlistError(null)
    setWishlistSaved(false)
    fetch(`${API_BASE}/account`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        list_name: listName,
        currency,
        decimal_separator: decimalSeparator,
        theme_color: themeColor,
      }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setWishlistError(data.error))
        return
      }
      response.json().then((updatedUser) => {
        onUpdate(updatedUser)
        setWishlistSaved(true)
      })
    })
  }

  return (
    <div className="page">
      <Link className="page__back" to="/">
        ← Back to wishlist
      </Link>

      <h2>Wishlist settings</h2>
      <form className="gift-form" onSubmit={handleWishlistSubmit}>
        <label>
          List name
          <input value={listName} onChange={(event) => setListName(event.target.value)} required />
        </label>
        <div className="gift-form__row">
          <label>
            Currency
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="€">€ Euro</option>
              <option value="$">$ Dollar</option>
              <option value="£">£ Pound</option>
              <option value="">No currency</option>
            </select>
          </label>
          <label>
            Decimals
            <select value={decimalSeparator} onChange={(event) => setDecimalSeparator(event.target.value)}>
              <option value=",">, (comma)</option>
              <option value=".">. (period)</option>
              <option value="round">Round to whole number</option>
            </select>
          </label>
        </div>
        <label>
          Theme color
          <span className="theme-swatches">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className={preset.value === themeColor ? 'theme-swatch theme-swatch--selected' : 'theme-swatch'}
                style={{ backgroundColor: preset.swatchColor }}
                title={preset.name}
                aria-label={preset.name}
                onClick={() => setThemeColor(preset.value)}
              />
            ))}
          </span>
        </label>
        {wishlistError && <p className="form-error">{wishlistError}</p>}
        {wishlistSaved && <p className="form-success">Saved</p>}
        <div className="gift-form__actions">
          <button type="submit">Save wishlist settings</button>
        </div>
      </form>

      <h2>Account settings</h2>

      <form className="gift-form" onSubmit={handleUsernameSubmit}>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        {usernameError && <p className="form-error">{usernameError}</p>}
        {usernameSaved && <p className="form-success">Saved</p>}
        <div className="gift-form__actions">
          <button type="submit">Save</button>
        </div>
      </form>

      <form className="gift-form" onSubmit={handlePasswordSubmit}>
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
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
        {passwordError && <p className="form-error">{passwordError}</p>}
        {passwordSaved && <p className="form-success">Password changed</p>}
        <div className="gift-form__actions">
          <button type="submit">Change password</button>
        </div>
      </form>

      <form className="gift-form" onSubmit={handleEmailSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {emailError && <p className="form-error">{emailError}</p>}
        {emailSaved && <p className="form-success">Saved</p>}
        <div className="gift-form__actions">
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  )
}

export default SettingsPage
