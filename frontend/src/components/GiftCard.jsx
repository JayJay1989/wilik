import { useState } from 'react'
import StarRating from './StarRating'
import GiftForm from './GiftForm'
import ImagePlaceholder from './ImagePlaceholder'
import { PencilIcon, TrashIcon, ExternalLinkIcon, GripIcon } from './Icons'
import { formatPrice } from '../formatPrice'

function GiftCard({
  gift,
  currency,
  decimalSeparator,
  showImagePlaceholder,
  onRatingChange,
  onUpdate,
  onDelete,
  onReorder,
  dragState,
  onDragStart,
  onDragEnter,
  onDragEnd,
}) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <GiftForm
        initialValues={gift}
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

  return (
    <div
      className={classNames.join(' ')}
      onClick={gift.url ? () => window.open(gift.url, '_blank', 'noopener,noreferrer') : undefined}
      onDragEnter={() => onDragEnter(gift.id)}
      onDragOver={(event) => {
        if (isValidTarget) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        const draggedId = Number(event.dataTransfer.getData('text/plain'))
        if (draggedId !== gift.id) onReorder(draggedId, gift.id)
      }}
    >
      <span
        className="gift-card__drag-handle"
        draggable
        title="Drag to reorder within this star rating"
        onClick={(event) => event.stopPropagation()}
        onDragStart={(event) => {
          event.stopPropagation()
          event.dataTransfer.setData('text/plain', String(gift.id))
          const card = event.currentTarget.closest('.gift-card')
          if (card) {
            const rect = card.getBoundingClientRect()
            event.dataTransfer.setDragImage(card, 20, rect.height / 2)
          }
          onDragStart(gift.id, gift.rating)
        }}
        onDragEnd={(event) => {
          event.stopPropagation()
          onDragEnd()
        }}
      >
        <GripIcon />
      </span>
      <div className="gift-card__actions">
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
            if (confirm(`Delete "${gift.title}"?`)) onDelete(gift.id)
          }}
        >
          <TrashIcon />
        </button>
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
              <span className="gift-price">{formatPrice(gift.price, currency, decimalSeparator)}</span>
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
