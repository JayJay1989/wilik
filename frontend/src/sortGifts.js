function groupKey(gift) {
  return gift.rating == null ? 'unrated' : gift.rating
}

function sortGroup(group) {
  const hasManualOrder = group.some((gift) => gift.sort_order != null)

  if (hasManualOrder) {
    return [...group].sort((a, b) => {
      if (a.sort_order == null) return 1
      if (b.sort_order == null) return -1
      return a.sort_order - b.sort_order
    })
  }

  return [...group].sort((a, b) => {
    const titleCompare = a.title.localeCompare(b.title)
    if (titleCompare !== 0) return titleCompare
    return (a.price ?? 0) - (b.price ?? 0)
  })
}

export function sortGifts(items) {
  const groups = new Map()
  for (const gift of items) {
    const key = groupKey(gift)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(gift)
  }

  const ratingsHighToLow = [5, 4, 3, 2, 1]
  const result = []
  for (const rating of ratingsHighToLow) {
    if (groups.has(rating)) result.push(...sortGroup(groups.get(rating)))
  }
  if (groups.has('unrated')) result.push(...sortGroup(groups.get('unrated')))

  return result
}

export function sortGiftsByPrice(items) {
  return [...items].sort((a, b) => {
    if (a.price == null) return 1
    if (b.price == null) return -1
    return a.price - b.price
  })
}
