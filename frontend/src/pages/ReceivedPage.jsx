import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GiftCard from '../components/GiftCard'
import { ArchiveIcon } from '../components/Icons'

const API_BASE = '/api'
const API_URL = `${API_BASE}/items`

const NOOP_DRAG_STATE = { draggedId: null, draggedRating: undefined, overId: null }

function ReceivedPage({ currentUser }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    fetch(API_URL, { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => setItems(data))
  }, [])

  function handleUpdate(id, values) {
    fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
      .then((response) => response.json())
      .then((updatedGift) => {
        setItems((current) => current.map((item) => (item.id === updatedGift.id ? updatedGift : item)))
      })
  }

  function handleDelete(id) {
    fetch(`${API_URL}/${id}`, { method: 'DELETE', credentials: 'include' }).then(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    })
  }

  function handleReceivedChange(id, received) {
    fetch(`${API_URL}/${id}/received`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received }),
    })
      .then((response) => response.json())
      .then((updatedGift) => {
        if (!updatedGift.received) {
          setItems((current) => current.filter((item) => item.id !== updatedGift.id))
        } else {
          setItems((current) => current.map((item) => (item.id === updatedGift.id ? updatedGift : item)))
        }
      })
  }

  const receivedItems = items.filter((item) => item.received)

  return (
    <div className="page">
      <Link className="page__back" to="/">
        ← Back to wishlist
      </Link>
      <h2>Received</h2>
      <p className="page__hint">Items you've already got, kept off your active wishlist</p>
      <main>
        <div className="gift-grid">
          {receivedItems.length === 0 && (
            <div className="empty-state">
              <ArchiveIcon width={56} height={56} strokeWidth={1.4} />
              <h3>Nothing here yet</h3>
              <p>Mark a wishlist item as received to archive it</p>
            </div>
          )}
          {receivedItems.map((item) => (
            <GiftCard
              key={item.id}
              gift={item}
              currency={currentUser.currency}
              decimalSeparator={currentUser.decimal_separator}
              showImagePlaceholder={currentUser.show_image_placeholder}
              onRatingChange={() => {}}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onReorder={() => {}}
              onReceivedChange={handleReceivedChange}
              dragState={NOOP_DRAG_STATE}
              onDragStart={() => {}}
              onDragEnter={() => {}}
              onDragEnd={() => {}}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

export default ReceivedPage
