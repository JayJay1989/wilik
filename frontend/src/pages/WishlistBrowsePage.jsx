import { Link } from 'react-router-dom'
import GiftDirectoryList from '../components/GiftDirectoryList'

function WishlistBrowsePage() {
  return (
    <div className="page">
      <Link className="page__back" to="/wishlist">
        ← Back
      </Link>
      <h2>All wishlists</h2>
      <GiftDirectoryList />
    </div>
  )
}

export default WishlistBrowsePage
