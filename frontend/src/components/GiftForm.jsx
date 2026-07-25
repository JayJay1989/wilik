import { useState } from 'react'
import StarRating from './StarRating'

const API_BASE = 'http://localhost:5000/api'

function GiftForm({ initialValues, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    title: initialValues?.title ?? '',
    label: initialValues?.label ?? '',
    brand: initialValues?.brand ?? '',
    options: initialValues?.options ?? '',
    url: initialValues?.url ?? '',
    image_url: initialValues?.image_url ?? '',
    description: initialValues?.description ?? '',
    price: initialValues?.price ?? '',
    quantity: initialValues?.quantity ?? 1,
  })
  const [rating, setRating] = useState(initialValues?.rating ?? null)
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  function handleFetchDetails() {
    setScraping(true)
    setScrapeError(null)
    fetch(`${API_BASE}/scrape`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: values.url }),
    })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setScrapeError(data.error || 'Could not fetch details for that URL')
          return
        }
        setValues((current) => ({
          ...current,
          title: data.title || current.title,
          image_url: data.image_url || current.image_url,
          brand: data.brand || current.brand,
          price: data.price != null ? data.price : current.price,
        }))
      })
      .catch(() => setScrapeError('Could not fetch details for that URL'))
      .finally(() => setScraping(false))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      ...values,
      price: values.price === '' ? null : Number(values.price),
      quantity: Number(values.quantity) || 1,
      rating,
    })
  }

  return (
    <form className="gift-form" onSubmit={handleSubmit}>
      <label>
        URL
        <span className="inline-field">
          <input name="url" value={values.url} onChange={handleChange} placeholder="https://..." />
          <button
            type="button"
            className="btn-primary"
            onClick={handleFetchDetails}
            disabled={!values.url || scraping}
          >
            {scraping ? 'Fetching…' : 'Fetch details'}
          </button>
        </span>
      </label>
      {scrapeError && <p className="form-error">{scrapeError}</p>}
      <label>
        Image URL
        <input name="image_url" value={values.image_url} onChange={handleChange} placeholder="https://..." />
      </label>
      <div className="gift-form__row">
        <label>
          Label
          <input name="label" value={values.label} onChange={handleChange} placeholder="e.g. Board game, Perfume, Book ..." />
        </label>
        <label>
          Brand, creator or seller
          <input name="brand" value={values.brand} onChange={handleChange} placeholder="e.g. 999 Games, Chanel, George Orwell ..." />
        </label>
      </div>
      <label>
        <span>
          Title <span className="required">*</span>
        </span>
        <input
          name="title"
          value={values.title}
          onChange={handleChange}
          placeholder="e.g. Rummikub, Bleu de Chanel, Animal Farm ..."
          required
        />
      </label>
      <label>
        Product options (separate with semicolons)
        <input
          name="options"
          value={values.options}
          onChange={handleChange}
          placeholder="e.g. Medium; 50ml; Black, blue or yellow"
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          value={values.description}
          onChange={handleChange}
          placeholder="Any extra details worth mentioning"
        />
      </label>
      <div className="gift-form__row">
        <label>
          Price
          <input
            name="price"
            type="number"
            step="any"
            value={values.price}
            onChange={handleChange}
            placeholder="0.00"
          />
        </label>
        <label>
          Quantity
          <input name="quantity" type="number" min="1" value={values.quantity} onChange={handleChange} />
        </label>
      </div>
      <label>
        Rating
        <StarRating value={rating} onChange={setRating} />
      </label>
      <div className="gift-form__actions">
        <button type="submit">Save</button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default GiftForm
