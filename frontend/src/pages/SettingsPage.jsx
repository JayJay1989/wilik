import { useState } from 'react'
import { Link } from 'react-router-dom'
import { THEME_PRESETS } from '../themePresets'

const API_BASE = '/api'

function SettingsPage({ currentUser, onUpdate }) {
  const [shareCopied, setShareCopied] = useState(false)
  const [shareRegenerating, setShareRegenerating] = useState(false)
  const shareUrl = `${window.location.origin}/list/${currentUser.share_token}`

  function handleCopyShareUrl() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    })
  }

  function handleRegenerateShareUrl() {
    if (!confirm("Generate a new link? Your old share link will stop working.")) return
    setShareRegenerating(true)
    fetch(`${API_BASE}/account/share-token`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((updatedUser) => {
        onUpdate(updatedUser)
        setShareRegenerating(false)
      })
  }

  const [username, setUsername] = useState(currentUser.username)
  const [usernameError, setUsernameError] = useState(null)
  const [usernameSaved, setUsernameSaved] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [listName, setListName] = useState(currentUser.list_name)
  const [currency, setCurrency] = useState(currentUser.currency)
  const [decimalSeparator, setDecimalSeparator] = useState(currentUser.decimal_separator)
  const [themeColor, setThemeColor] = useState(currentUser.theme_color)
  const [showImagePlaceholder, setShowImagePlaceholder] = useState(currentUser.show_image_placeholder)
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
      body: JSON.stringify({ new_password: newPassword }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setPasswordError(data.error))
        return
      }
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
        show_image_placeholder: showImagePlaceholder,
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

      <h2>Share your wishlist</h2>
      <div className="card">
        <p className="page__hint" style={{ margin: '0 0 10px' }}>
          Anyone with this link can view your list and claim items — you'll never see who claimed what
        </p>
        <div className="inline-field">
          <input className="share-link__input" value={shareUrl} readOnly onFocus={(event) => event.target.select()} />
          <button type="button" className="btn-primary" onClick={handleCopyShareUrl}>
            {shareCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="gift-form__actions">
          <button type="button" className="btn-primary" onClick={handleRegenerateShareUrl} disabled={shareRegenerating}>
            Generate new link
          </button>
        </div>
      </div>

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
        <label className="user-admin__checkbox">
          <input
            type="checkbox"
            checked={showImagePlaceholder}
            onChange={(event) => setShowImagePlaceholder(event.target.checked)}
          />
          Show a placeholder image for items without a photo
        </label>
        {wishlistError && <p className="form-error">{wishlistError}</p>}
        {wishlistSaved && <p className="form-success">Saved</p>}
        <div className="gift-form__actions">
          <button type="submit">Save</button>
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
          <button type="submit">Change username</button>
        </div>
      </form>

      <form className="gift-form" onSubmit={handlePasswordSubmit}>
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
    </div>
  )
}

export default SettingsPage
