import StarRating from './StarRating'
import ImagePlaceholder from './ImagePlaceholder'
import { GiftIcon, LockIcon, UndoIcon, ExternalLinkIcon } from './Icons'
import { formatPrice } from '../formatPrice'

function PublicGiftCard({ gift, currency, decimalSeparator, onClaim, onUnclaim }) {
  const lastSpace = gift.title.lastIndexOf(' ')
  const titleHead = lastSpace === -1 ? '' : gift.title.slice(0, lastSpace + 1)
  const titleTail = lastSpace === -1 ? gift.title : gift.title.slice(lastSpace + 1)

  const classNames = ['gift-card']
  if (gift.url) classNames.push('gift-card--clickable')
  if (gift.claimed) classNames.push('gift-card--claimed')

  const isOwnClaim = Boolean(gift.claimed) && Boolean(localStorage.getItem(`wilik-claim-${gift.id}`))
  const claimLabel = isOwnClaim ? 'Release this gift' : gift.claimed ? 'Gift claimed — click to unclaim' : 'Get this gift'

  return (
    <div
      className={classNames.join(' ')}
      onClick={gift.url ? () => window.open(gift.url, '_blank', 'noopener,noreferrer') : undefined}
    >
      {gift.image_url ? (
        <img className="gift-card__img" src={gift.image_url} alt={gift.title} />
      ) : (
        <ImagePlaceholder id={gift.id} />
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
            {gift.rating != null && <StarRating value={gift.rating} onChange={() => {}} readOnly />}
          </div>
        )}
      </div>
      <button
        type="button"
        className={gift.claimed ? 'gift-card__claim-rail gift-card__claim-rail--claimed' : 'gift-card__claim-rail'}
        aria-label={claimLabel}
        title={claimLabel}
        onClick={(event) => {
          event.stopPropagation()
          if (gift.claimed) onUnclaim(gift)
          else onClaim(gift)
        }}
      >
        {isOwnClaim ? <UndoIcon /> : gift.claimed ? <LockIcon /> : <GiftIcon />}
        {isOwnClaim ? 'Release this gift' : gift.claimed ? 'Gift claimed' : 'Get this gift'}
      </button>
    </div>
  )
}

export default PublicGiftCard
