import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PencilIcon, TrashIcon } from '../components/Icons'

const API_BASE = '/api'

function AdminPage({ currentUser, appName, onAppNameChange }) {
  const [users, setUsers] = useState([])
  const [appNameInput, setAppNameInput] = useState(appName)
  const [appNameError, setAppNameError] = useState(null)
  const [username, setUsername] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userError, setUserError] = useState(null)
  const [resetMessage, setResetMessage] = useState(null)
  const [createMessage, setCreateMessage] = useState(null)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editListName, setEditListName] = useState('')
  const [editError, setEditError] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/users`, { credentials: 'include' })
      .then((response) => response.json())
      .then(setUsers)
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

  function handleCreateUser(event) {
    event.preventDefault()
    setUserError(null)
    fetch(`${API_BASE}/users`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, is_admin: isAdmin }),
    }).then((response) => {
      if (!response.ok) {
        response.json().then((data) => setUserError(data.error))
        return
      }
      response.json().then((newUser) => {
        setUsers((current) => [...current, newUser])
        setCreateMessage(`${newUser.username} will be asked to set a password the first time they log in.`)
        setUsername('')
        setIsAdmin(false)
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
    setResetMessage(null)
    fetch(`${API_BASE}/users/${user.id}/reset-password`, { method: 'POST', credentials: 'include' }).then(
      (response) => {
        if (!response.ok) return
        response.json().then((updatedUser) => {
          setUsers((current) => current.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
          setResetMessage(`${user.username} will be asked to set a new password next time they log in.`)
        })
      }
    )
  }

  function startEditUser(user) {
    setEditingUserId(user.id)
    setEditUsername(user.username)
    setEditListName(user.list_name)
    setEditError(null)
  }

  function handleEditSubmit(event, user) {
    event.preventDefault()
    setEditError(null)
    fetch(`${API_BASE}/users/${user.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: editUsername, list_name: editListName }),
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

      <h3>Users</h3>
      <div className="card">
        {resetMessage && <p className="form-success">{resetMessage}</p>}
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
                      <div className="gift-form__actions">
                        <button type="button" className="btn-primary" onClick={() => handleResetPassword(user)}>
                          Reset password
                        </button>
                      </div>
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
          Admin
        </label>
        {userError && <p className="form-error">{userError}</p>}
        {createMessage && <p className="form-success">{createMessage}</p>}
        <div className="gift-form__actions">
          <button type="submit">Add user</button>
        </div>
      </form>
    </div>
  )
}

export default AdminPage
