import { useState } from 'react'
import StarRating from './StarRating'
import GiftForm from './GiftForm'
import ImagePlaceholder from './ImagePlaceholder'
import { PencilIcon, TrashIcon, ExternalLinkIcon, GripIcon, CheckIcon, UndoIcon } from './Icons'
import { formatPrice } from '../formatPrice'

const API_BASE = '/api'

function GiftCard({
  gift,
  currency,
  decimalSeparator,
  showImagePlaceholder,
  onRatingChange,
  onUpdate,
  onDelete,
  onReorder,
  onReceivedChange,
  dragState,
  onDragStart,
  onDragMove,
  onDragEnter,
  onDragEnd,
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <GiftForm
        initialValues={gift}
        defaultCurrency={currency}
        onSubmit={(values) => {
          onUpdate(gift.id, values)
          setIsEditing(false)
        }}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  const lastSpace = gift.title.lastIndexOf(' ')
  const titleHead = lastSpace === -1 ? '' : gift.title.slice(0, lastSpace + 1)
  const titleTail = lastSpace === -1 ? gift.title : gift.title.slice(lastSpace + 1)

  const isDragActive = dragState.draggedId != null
  const isDragging = dragState.draggedId === gift.id
  const isValidTarget = dragState.draggedRating === gift.rating
  const isDragOver = dragState.overId === gift.id && isValidTarget

  const classNames = ['gift-card']
  if (gift.url) classNames.push('gift-card--clickable')
  if (isDragOver) classNames.push('gift-card--drag-over')
  if (isDragActive && !isDragging && !isValidTarget) classNames.push('gift-card--drag-invalid')

  function handlePointerDown(event) {
    if (event.target.closest('.gift-card__action-bar-buttons')) return
    event.preventDefault()
    onDragStart(gift.id, gift.rating)
    onDragMove(event.clientX, event.clientY)

    function handlePointerMove(moveEvent) {
      onDragMove(moveEvent.clientX, moveEvent.clientY)
      const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)
      const card = el && el.closest('.gift-card')
      onDragEnter(card ? Number(card.dataset.giftId) : null)
    }

    function finishDrag(upEvent) {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', finishDrag)
      const el = document.elementFromPoint(upEvent.clientX, upEvent.clientY)
      const card = el && el.closest('.gift-card')
      const targetId = card ? Number(card.dataset.giftId) : null
      onDragEnd()
      if (targetId != null && targetId !== gift.id) {
        onReorder(gift.id, targetId)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)
  }

  return (
    <div
      className={classNames.join(' ')}
      data-gift-id={gift.id}
      onClick={gift.url ? () => window.open(gift.url, '_blank', 'noopener,noreferrer') : undefined}
    >
      <div
        className="gift-card__action-bar"
        title="Drag to reorder within this star rating"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={handlePointerDown}
      >
        <span className="gift-card__drag-handle">
          <GripIcon />
        </span>
        <span className="gift-card__action-bar-buttons">
          {onReceivedChange && (
            <button
              type="button"
              className="icon-button"
              aria-label={gift.received ? 'Move back to wishlist' : 'Received'}
              title={gift.received ? 'Move back to wishlist' : 'Received'}
              onClick={(event) => {
                event.stopPropagation()
                if (gift.quantity == null && !gift.received) {
                  // unlimited items never "run out" -- marking one received shouldn't
                  // archive the whole item away, just clear whatever's been claimed so
                  // far; ask first (with a count) since this isn't the usual behavior
                  fetch(`${API_BASE}/items/${gift.id}/claim-info`, { credentials: 'include' })
                    .then((response) => response.json())
                    .then((data) => {
                      const count = data.claimed_by.length
                      const proceed = confirm(
                        count > 0
                          ? `This item has unlimited quantity, so marking it received won't remove it from your list. It'll just clear the ${count} existing claim${count === 1 ? '' : 's'} so people can keep gifting it. Continue?`
                          : `This item has unlimited quantity, so marking it received won't remove it from your list. Continue?`
                      )
                      if (proceed) onReceivedChange(gift.id, true)
                    })
                  return
                }
                onReceivedChange(gift.id, !gift.received)
              }}
            >
              {gift.received ? <UndoIcon /> : <CheckIcon />}
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label="Edit"
            title="Edit"
            onClick={(event) => {
              event.stopPropagation()
              setIsEditing(true)
            }}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Delete"
            title="Delete"
            onClick={(event) => {
              event.stopPropagation()
              fetch(`${API_BASE}/items/${gift.id}/claim-info`, { credentials: 'include' })
                .then((response) => response.json())
                .then((data) => {
                  if (data.claimed_by.length === 0) {
                    if (confirm(`Delete "${gift.title}"?`)) onDelete(gift.id)
                    return
                  }
                  const proceed = confirm(
                    `"${gift.title}" has already been claimed by ${data.claimed_by.length} ${data.claimed_by.length === 1 ? 'person' : 'people'}. (If you received this gift already, use the checkmark instead to archive it to your Received list.) Delete anyway?`
                  )
                  if (!proceed) return
                  onDelete(gift.id)
                  alert(`Deleted. It had been claimed by: ${data.claimed_by.join(', ')}.`)
                })
            }}
          >
            <TrashIcon />
          </button>
        </span>
      </div>
      {gift.image_url ? (
        <img className="gift-card__img" src={gift.image_url} alt={gift.title} />
      ) : (
        showImagePlaceholder && <ImagePlaceholder id={gift.id} />
      )}
      <div className="gift-card__body">
        {(gift.label || gift.brand) && (
          <p className="gift-card__eyebrow">
            {gift.label && <span className="gift-card__label">{gift.label}</span>}
            {gift.label && gift.brand && <span className="gift-card__eyebrow-sep">·</span>}
            {gift.brand && <span className="gift-card__brand">{gift.brand}</span>}
          </p>
        )}
        <h3>
          {titleHead}
          <span className="gift-card__title-tail">
            {titleTail}
            {gift.url && <ExternalLinkIcon className="gift-card__link-icon" />}
          </span>
        </h3>
        {gift.options && (
          <span className="gift-card__options">
            {gift.options
              .split(';')
              .map((option) => option.trim())
              .filter(Boolean)
              .map((option, index) => (
                <span key={index} className="gift-card__option-badge">
                  {option}
                </span>
              ))}
          </span>
        )}
        {gift.description && (
          <p className="gift-card__desc" title={gift.description}>
            {gift.description}
          </p>
        )}
        {(gift.price != null || gift.rating != null) && (
          <div className="gift-card__footer">
            {gift.price != null && (
              <span className="gift-price">{formatPrice(gift.price, gift.currency ?? currency, decimalSeparator)}</span>
            )}
            {gift.rating != null && (
              <StarRating value={gift.rating} onChange={(newRating) => onRatingChange(gift.id, newRating)} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default GiftCard
