import { useState } from 'react'
import { Link } from 'react-router-dom'
import { THEME_PRESETS } from '../themePresets'
import { getColorScheme, setColorScheme } from '../colorScheme'

const API_BASE = '/api'

function SettingsPage({ currentUser, onUpdate }) {
  const [shareCopied, setShareCopied] = useState(false)
  const [shareRegenerating, setShareRegenerating] = useState(false)
  const [showInDirectory, setShowInDirectory] = useState(currentUser.show_in_directory)
  const [colorScheme, setColorSchemeState] = useState(getColorScheme)
  const shareUrl = `${window.location.origin}/list/${currentUser.share_token}`

  function handleColorSchemeChange(event) {
    const value = event.target.value
    setColorSchemeState(value)
    setColorScheme(value)
  }

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

  function handleShowInDirectoryChange(event) {
    const checked = event.target.checked
    setShowInDirectory(checked)
    fetch(`${API_BASE}/account`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_in_directory: checked }),
    })
      .then((response) => response.json())
      .then(onUpdate)
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
  const [showBackgroundPattern, setShowBackgroundPattern] = useState(currentUser.show_background_pattern)
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
        show_background_pattern: showBackgroundPattern,
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
        <label className="user-admin__checkbox" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={showInDirectory} onChange={handleShowInDirectoryChange} />
          List my wishlist in the browsable directory
        </label>
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
        <label className="user-admin__checkbox">
          <input
            type="checkbox"
            checked={showBackgroundPattern}
            onChange={(event) => setShowBackgroundPattern(event.target.checked)}
          />
          Show a subtle background pattern on gift cards
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

      <h2>Appearance</h2>
      <div className="gift-form">
        <label>
          Color scheme
          <select value={colorScheme} onChange={handleColorSchemeChange}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Match system</option>
          </select>
        </label>
      </div>
    </div>
  )
}

export default SettingsPage
