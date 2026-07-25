import { useState } from 'react'
import Logo from './Logo'

function Login({ appName, onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then((response) => {
      if (!response.ok) {
        setError('Invalid username or password')
        return
      }
      response.json().then(onLogin)
    })
  }

  return (
    <div className="login-page">
      <form className="gift-form login-form" onSubmit={handleSubmit}>
        <div className="login-form__brand">
          <Logo size={40} />
          <h1>{appName}</h1>
        </div>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary">
          Log in
        </button>
      </form>
    </div>
  )
}

export default Login
