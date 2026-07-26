function ImagePlaceholder({ id }) {
  const patternId = `gift-pattern-${id}`

  return (
    <svg className="gift-card__img gift-card__img--placeholder" viewBox="0 0 132 132" aria-hidden="true">
      <defs>
        <pattern id={patternId} width="26" height="26" patternUnits="userSpaceOnUse">
          <rect width="26" height="26" fill="var(--code-bg)" />
          <g opacity="0.4" transform="translate(4 4) scale(0.7)">
            <rect x="3" y="9" width="18" height="13" rx="3" fill="var(--accent)" />
            <rect x="3" y="13.3" width="18" height="3.4" fill="var(--text-h)" />
            <rect x="10.3" y="9" width="3.4" height="13" fill="var(--text-h)" />
            <path
              d="M12 9c-1.8-2.8-5.2-4.4-6.8-2.7-1.2 1.3.1 3.4 2.3 3.4.9 0 3-.2 4.5-.7z"
              fill="var(--text-h)"
            />
            <path
              d="M12 9c1.8-2.8 5.2-4.4 6.8-2.7 1.2 1.3-.1 3.4-2.3 3.4-.9 0-3-.2-4.5-.7z"
              fill="var(--text-h)"
            />
          </g>
        </pattern>
      </defs>
      <rect width="132" height="132" fill={`url(#${patternId})`} />
    </svg>
  )
}

export default ImagePlaceholder
