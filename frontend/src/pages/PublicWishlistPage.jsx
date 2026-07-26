import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Logo from '../components/Logo'
import PublicGiftCard from '../components/PublicGiftCard'
import { GiftIcon, SparkleIcon } from '../components/Icons'
import { sortGifts } from '../sortGifts'
import { themeStyle } from '../themePresets'

const API_BASE = '/api'

function PublicWishlistPage({ appName }) {
  const { token } = useParams()
  const [owner, setOwner] = useState(undefined) // undefined = loading, null = invalid link
  const [items, setItems] = useState([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/public/${token}`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setOwner)
    fetch(`${API_BASE}/public/${token}/items`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setItems)
  }, [token])

  useEffect(() => {
    fetch(`${API_BASE}/me`, { credentials: 'include' }).then((response) => setIsLoggedIn(response.ok))
  }, [])

  useEffect(() => {
    document.title = owner ? owner.list_name : appName
  }, [owner, appName])

  function updateItem(updated) {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  function postAction(itemId, action, body) {
    return fetch(`${API_BASE}/public/${token}/items/${itemId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }).then((response) =>
      response.json().then((data) => {
        if (!response.ok) throw new Error(data.error || 'Something went wrong')
        return data
      })
    )
  }

  function claimTokenKey(giftId) {
    return `wishdrop-claim-${giftId}`
  }

  function handleClaim(gift) {
    const name = prompt("Your name, so others know it's taken:")
    if (!name || !name.trim()) return
    postAction(gift.id, 'claim', { name: name.trim() })
      .then((updated) => {
        if (updated.claim_token) {
          localStorage.setItem(claimTokenKey(gift.id), updated.claim_token)
        }
        updateItem(updated)
      })
      .catch((error) => alert(error.message))
  }

  function handleUnclaim(gift) {
    const claimToken = localStorage.getItem(claimTokenKey(gift.id))
    if (claimToken) {
      postAction(gift.id, 'unclaim', { claim_token: claimToken })
        .then((updated) => {
          localStorage.removeItem(claimTokenKey(gift.id))
          updateItem(updated)
        })
        .catch((error) => alert(error.message))
      return
    }

    // no token on this device: confirm the name first, but only recognize this
    // browser as the claimant -- an actual release still needs a second, explicit click
    const name = prompt('Confirm your name to manage this claim:')
    if (!name || !name.trim()) return
    postAction(gift.id, 'verify-claim', { name: name.trim() })
      .then((data) => {
        if (data.claim_token) {
          localStorage.setItem(claimTokenKey(gift.id), data.claim_token)
        }
        updateItem({ ...gift, claimed: true })
      })
      .catch((error) => alert(error.message))
  }

  if (owner === undefined) return null

  if (owner === null) {
    return (
      <div className="app">
        <nav className="topbar">
          <div className="topbar__left">
            <Link to="/" className="topbar__brand">
              <Logo size={64} />
              <span>{appName}</span>
            </Link>
          </div>
          <div className="topbar__actions">
            <Link to={isLoggedIn ? '/wishlist/browse' : '/directory'}>
              <GiftIcon /> All wishlists
            </Link>
          </div>
        </nav>
        <main>
          <div className="empty-state">
            <GiftIcon width={56} height={56} strokeWidth={1.4} />
            <h3>Link not found</h3>
            <p>This wishlist link doesn't exist (anymore)</p>
          </div>
        </main>
      </div>
    )
  }

  const sorted = sortGifts(items)

  return (
    <div className="app" style={themeStyle(owner.theme_color)}>
      <nav className="topbar">
        <div className="topbar__left">
          <Link to="/" className="topbar__brand">
            <Logo size={64} />
            <span>{appName}</span>
          </Link>
        </div>
        <div className="topbar__actions">
          <Link to={isLoggedIn ? '/wishlist/browse' : '/directory'}>
            <GiftIcon /> All wishlists
          </Link>
        </div>
      </nav>
      <p className="page__hint" style={{ maxWidth: 700, margin: '0 auto 16px' }}>
        Claim an item by clicking <span className="page__hint-highlight">Get this gift</span> so others know it's
        taken. The recipient won't be notified.
      </p>
      <div className="wishlist-toolbar">
        <h2>{owner.list_name}</h2>
      </div>
      <main>
        <div className="gift-grid">
          {sorted.length === 0 && (
            <div className="empty-state">
              <SparkleIcon />
              <h3>This wishlist is empty</h3>
              <p>Nothing has been added yet — check back later</p>
            </div>
          )}
          {sorted.map((item) => (
            <PublicGiftCard
              key={item.id}
              gift={item}
              currency={owner.currency}
              decimalSeparator={owner.decimal_separator}
              onClaim={handleClaim}
              onUnclaim={handleUnclaim}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default PublicWishlistPage
