function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="3" y="9" width="18" height="13" rx="3" fill="var(--accent)" />
      <rect x="3" y="13.3" width="18" height="3.4" fill="#fff" />
      <rect x="10.3" y="9" width="3.4" height="13" fill="#fff" />
      <path d="M12 9c-1.8-2.8-5.2-4.4-6.8-2.7-1.2 1.3.1 3.4 2.3 3.4.9 0 3-.2 4.5-.7z" fill="#fff" />
      <path d="M12 9c1.8-2.8 5.2-4.4 6.8-2.7 1.2 1.3-.1 3.4-2.3 3.4-.9 0-3-.2-4.5-.7z" fill="#fff" />
      <path d="M12 6.6l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="var(--accent)" />
    </svg>
  )
}

export default Logo
