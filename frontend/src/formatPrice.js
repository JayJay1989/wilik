export function formatPrice(price, currency, decimalSeparator) {
  if (decimalSeparator === 'round') {
    return `${currency}${Math.round(price)}`
  }
  let formatted = price.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false,
  })
  if (decimalSeparator === ',') formatted = formatted.replace('.', ',')
  return `${currency}${formatted}`
}
