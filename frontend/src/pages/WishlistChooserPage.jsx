import { Link } from 'react-router-dom'
import { UserIcon, GiftIcon } from '../components/Icons'

function WishlistChooserPage() {
  return (
    <div className="page">
      <h2>Wishlists</h2>

      <div className="card">
        <h3 className="card__heading">
          <UserIcon /> My wishlist
        </h3>
        <p className="page__hint" style={{ margin: '0 0 10px' }}>
          See and manage the items on your own wishlist
        </p>
        <Link to="/" className="btn-primary">
          Go to my wishlist
        </Link>
      </div>

      <div className="card">
        <h3 className="card__heading">
          <GiftIcon /> All wishlists
        </h3>
        <p className="page__hint" style={{ margin: '0 0 10px' }}>
          Browse everyone's wishlists, so you can claim something to give them
        </p>
        <Link to="/wishlist/browse" className="btn-primary">
          Browse wishlists
        </Link>
      </div>
    </div>
  )
}

export default WishlistChooserPage
