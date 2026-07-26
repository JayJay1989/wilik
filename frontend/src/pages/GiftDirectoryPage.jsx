import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import GiftDirectoryList from '../components/GiftDirectoryList'

function GiftDirectoryPage({ appName }) {
  return (
    <div className="app">
      <nav className="topbar">
        <div className="topbar__left">
          <Link to="/" className="topbar__brand">
            <Logo size={64} />
            <span>{appName}</span>
          </Link>
        </div>
      </nav>
      <main>
        <div className="page">
          <h2>Wishlists</h2>
          <GiftDirectoryList />
        </div>
      </main>
    </div>
  )
}

export default GiftDirectoryPage
