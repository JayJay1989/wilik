import './StarRating.css'

function Star({ filled, onClick }) {
  return (
    <svg
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      className={filled ? 'filled' : ''}
    >
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8L6 21l1.6-7L2.2 9.2l7.1-.6z" />
    </svg>
  )
}

function StarRating({ value, onChange }) {
  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          filled={value != null && star <= value}
          onClick={() => onChange(value === star ? null : star)}
        />
      ))}
    </span>
  )
}

export default StarRating
