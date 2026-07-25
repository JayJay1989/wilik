import { useState } from 'react'
import StarRating from './StarRating'

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

  function handleChange(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
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
        <input name="url" value={values.url} onChange={handleChange} placeholder="https://..." />
      </label>
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
