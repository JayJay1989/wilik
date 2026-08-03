import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PencilIcon, TrashIcon, SpinnerIcon } from '../components/Icons'
import { THEME_PRESETS } from '../themePresets'

const API_BASE = '/api'

function AdminPage({ currentUser, appName, onAppNameChange }) {
  const [users, setUsers] = useState([])
  const [appNameInput, setAppNameInput] = useState(appName)
  const [appNameError, setAppNameError] = useState(null)
  const [username, setUsername] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [passwordless, setPasswordless] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [userError, setUserError] = useState(null)
  const [resetNotice, setResetNotice] = useState(null)
  const [resetSetupLink, setResetSetupLink] = useState(null)
  const [resetLinkCopied, setResetLinkCopied] = useState(false)
  const [createNotice, setCreateNotice] = useState(null)
  const [createSetupLink, setCreateSetupLink] = useState(null)
  const [createLinkCopied, setCreateLinkCopied] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editListName, setEditListName] = useState('')
  const [editShowInDirectory, setEditShowInDirectory] = useState(true)
  const [editThemeColor, setEditThemeColor] = useState(null)
  const [editResetPasswordless, setEditResetPasswordless] = useState(false)
  const [editError, setEditError] = useState(null)
  const [publicDirectoryEnabled, setPublicDirectoryEnabled] = useState(true)
  const [directoryError, setDirectoryError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/users`, { credentials: 'include' })
      .then((response) => response.json())
      .then(setUsers)
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((response) => response.json())
      .then((data) => setPublicDirectoryEnabled(data.public_directory_enabled))
  }, [])

  function handleAppNameSubmit(event) {
    event.preventDefault()
    setAppNameError(null)
    fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_name: appNameInput }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setAppNameError(data.error))
        return
      }
      response.json().then((data) => onAppNameChange(data.app_name))
    })
  }

  function handleDirectorySubmit(event) {
    event.preventDefault()
    setDirectoryError(null)
    fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_directory_enabled: publicDirectoryEnabled }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setDirectoryError(data.error))
      }
    })
  }

  function handleCopyLink(url, setCopied) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleCreateUser(event) {
    event.preventDefault()
    setUserError(null)
    setCreatingUser(true)
    fetch(`${API_BASE}/users`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, is_admin: isAdmin, passwordless }),
    }).then((response) => {
      if (!response.ok) {
        setCreatingUser(false)
        response.json().then((data) => setUserError(data.error))
        return
      }
      response.json().then((newUser) => {
        setCreatingUser(false)
        setUsers((current) => [...current, newUser])
        setCreateSetupLink(
          newUser.setup_token
            ? { username: newUser.username, url: `${window.location.origin}/setup/${newUser.setup_token}` }
            : null
        )
        setCreateNotice(
          newUser.setup_token
            ? null
            : `${newUser.username} can log in immediately with just their username. They'll be asked to set a password.`
        )
        setUsername('')
        setIsAdmin(false)
        setPasswordless(false)
      })
    })
  }

  function handleDeleteUser(user) {
    if (!confirm(`Delete ${user.username}? Their wishlist will be deleted too.`)) return
    fetch(`${API_BASE}/users/${user.id}`, { method: 'DELETE', credentials: 'include' }).then(() => {
      setUsers((current) => current.filter((u) => u.id !== user.id))
    })
  }

  function handleResetPassword(user) {
    if (!confirm(`Reset ${user.username}'s password? They'll set a new one next time they log in.`)) return
    setResetNotice(null)
    setResetSetupLink(null)
    fetch(`${API_BASE}/users/${user.id}/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passwordless: editResetPasswordless }),
    }).then((response) => {
      if (!response.ok) return
      response.json().then((updatedUser) => {
        setUsers((current) => current.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
        setResetSetupLink(
          updatedUser.setup_token
            ? { username: user.username, url: `${window.location.origin}/setup/${updatedUser.setup_token}` }
            : null
        )
        setResetNotice(
          updatedUser.setup_token
            ? null
            : `${user.username} can log in immediately with just their username. They'll be asked to set a new password.`
        )
      })
    })
  }

  function startEditUser(user) {
    setEditingUserId(user.id)
    setEditUsername(user.username)
    setEditListName(user.list_name)
    setEditShowInDirectory(user.show_in_directory)
    setEditThemeColor(user.theme_color)
    setEditResetPasswordless(false)
    setEditError(null)
    setResetNotice(null)
    setResetSetupLink(null)
  }

  function handleEditSubmit(event, user) {
    event.preventDefault()
    setEditError(null)
    fetch(`${API_BASE}/users/${user.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: editUsername,
        list_name: editListName,
        show_in_directory: editShowInDirectory,
        theme_color: editThemeColor,
      }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setEditError(data.error))
        return
      }
      response.json().then((updatedUser) => {
        setUsers((current) => current.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
        setEditingUserId(null)
      })
    })
  }

  return (
    <div className="page">
      <Link className="page__back" to="/">
        ← Back to wishlist
      </Link>
      <h2>Admin panel</h2>

      <h3>App name</h3>
      <form className="gift-form" onSubmit={handleAppNameSubmit}>
        <input value={appNameInput} onChange={(event) => setAppNameInput(event.target.value)} required />
        {appNameError && <p className="form-error">{appNameError}</p>}
        <div className="gift-form__actions">
          <button type="submit">Change app name</button>
        </div>
      </form>

      <h3>Gift directory</h3>
      <form className="gift-form" onSubmit={handleDirectorySubmit}>
        <label className="user-admin__checkbox">
          <input
            type="checkbox"
            checked={publicDirectoryEnabled}
            onChange={(event) => setPublicDirectoryEnabled(event.target.checked)}
          />
          Show a directory of public wishlists on the login page
        </label>
        {directoryError && <p className="form-error">{directoryError}</p>}
        <div className="gift-form__actions">
          <button type="submit">Save</button>
        </div>
      </form>

      <h3>Users</h3>
      <div className="card">
        <ul className="user-admin__list">
          {users.map((user) => (
            <li key={user.id}>
              <div className="user-admin__row">
                <span>
                  {user.username}
                  {user.is_admin ? ' (admin)' : ''}
                  {user.must_change_password ? ' (setup pending)' : ''}
                </span>
                <span className="user-admin__row-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Edit user"
                    title="Edit user"
                    onClick={() => (editingUserId === user.id ? setEditingUserId(null) : startEditUser(user))}
                  >
                    <PencilIcon />
                  </button>
                  {user.id !== currentUser.id && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Delete user"
                      title="Delete user"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <TrashIcon />
                    </button>
                  )}
                </span>
              </div>
              {editingUserId === user.id && (
                <form className="user-admin__edit-panel" onSubmit={(event) => handleEditSubmit(event, user)}>
                  {user.id !== currentUser.id && (
                    <label>
                      Password
                      <label className="user-admin__checkbox">
                        <input
                          type="checkbox"
                          checked={editResetPasswordless}
                          onChange={(event) => setEditResetPasswordless(event.target.checked)}
                        />
                        Allow first login with just a username, no setup link (not recommended)
                      </label>
                      <div className="gift-form__actions">
                        <button type="button" className="btn-primary" onClick={() => handleResetPassword(user)}>
                          Reset password
                        </button>
                      </div>
                      {resetSetupLink && (
                        <div className="form-success">
                          <p>{resetSetupLink.username} can't log in until they use this one-time setup link:</p>
                          <div className="inline-field">
                            <input
                              className="share-link__input"
                              value={resetSetupLink.url}
                              readOnly
                              onFocus={(event) => event.target.select()}
                            />
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handleCopyLink(resetSetupLink.url, setResetLinkCopied)}
                            >
                              {resetLinkCopied ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}
                      {resetNotice && <p className="form-success">{resetNotice}</p>}
                    </label>
                  )}
                  <label>
                    Username
                    <input
                      value={editUsername}
                      onChange={(event) => setEditUsername(event.target.value)}
                      required
                      autoFocus
                    />
                  </label>
                  <label>
                    Wishlist name
                    <input
                      value={editListName}
                      onChange={(event) => setEditListName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="user-admin__checkbox">
                    <input
                      type="checkbox"
                      checked={editShowInDirectory}
                      onChange={(event) => setEditShowInDirectory(event.target.checked)}
                    />
                    List this wishlist in the browsable directory
                  </label>
                  <label>
                    Theme color
                    <span className="theme-swatches">
                      {THEME_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          className={
                            preset.value === editThemeColor ? 'theme-swatch theme-swatch--selected' : 'theme-swatch'
                          }
                          style={{ backgroundColor: preset.swatchColor }}
                          title={preset.name}
                          aria-label={preset.name}
                          onClick={() => setEditThemeColor(preset.value)}
                        />
                      ))}
                    </span>
                  </label>
                  {editError && <p className="form-error">{editError}</p>}
                  <div className="gift-form__actions">
                    <button type="submit">Save</button>
                    <button type="button" onClick={() => setEditingUserId(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      </div>
      <h3>Add new user</h3>
      <form className="gift-form" onSubmit={handleCreateUser}>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label className="user-admin__checkbox">
          <input type="checkbox" checked={isAdmin} onChange={(event) => setIsAdmin(event.target.checked)} />
          Make this user an admin
        </label>
        <label className="user-admin__checkbox">
          <input
            type="checkbox"
            checked={passwordless}
            onChange={(event) => setPasswordless(event.target.checked)}
          />
          Allow first login with just a username, no setup link (not recommended)
        </label>
        {userError && <p className="form-error">{userError}</p>}
        {createSetupLink && (
          <div className="form-success">
            <p>{createSetupLink.username} can't log in yet. Send them this one-time setup link:</p>
            <div className="inline-field">
              <input
                className="share-link__input"
                value={createSetupLink.url}
                readOnly
                onFocus={(event) => event.target.select()}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleCopyLink(createSetupLink.url, setCreateLinkCopied)}
              >
                {createLinkCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
        {createNotice && <p className="form-success">{createNotice}</p>}
        <div className="gift-form__actions">
          <button type="submit" disabled={creatingUser}>
            {creatingUser ? (
              <>
                <SpinnerIcon /> Adding…
              </>
            ) : (
              'Add user'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminPage
