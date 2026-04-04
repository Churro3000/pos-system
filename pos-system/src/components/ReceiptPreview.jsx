import { useState } from 'react'

function ReceiptPreview({ items, subtotal, discountAmount, appliedDiscount, total, onClose, onConfirm }) {
  const [editableItems, setEditableItems] = useState(items.map(i => ({ ...i })))
  const [storeName, setStoreName] = useState('MY SHOP')
  const [storeAddress, setStoreAddress] = useState('123 Main Street, City')
  const [editingField, setEditingField] = useState(null)

  function updateItem(index, field, value) {
    const updated = [...editableItems]
    updated[index] = { ...updated[index], [field]: value }
    setEditableItems(updated)
  }

  function removeItem(index) {
    setEditableItems(editableItems.filter((_, i) => i !== index))
  }

  function getEditableSubtotal() {
    return editableItems.reduce((sum, i) => sum + (parseFloat(i.selling_price) * parseInt(i.qty)), 0)
  }

  function getEditableDiscount() {
    if (!appliedDiscount) return discountAmount
    if (appliedDiscount.type === 'percent') {
      return (getEditableSubtotal() * appliedDiscount.value) / 100
    }
    return appliedDiscount.value
  }

  function getEditableTotal() {
    return getEditableSubtotal() - getEditableDiscount()
  }

  function handlePrint() {
    window.print()
  }

  const now = new Date()

  return (
    <div className="receipt-overlay">
      <div className="receipt-preview-container">

        <div className="receipt-actions no-print">
          <h2>🧾 Receipt Preview</h2>
          <p className="hint">Click the ✏️ pencil icon on any field to edit it before printing.</p>
          <div className="receipt-action-buttons">
            <button className="btn-primary" onClick={handlePrint}>🖨️ Print Receipt</button>
            <button className="btn-secondary" onClick={() => onConfirm(editableItems)}>✅ Confirm Sale</button>
            <button className="btn-danger" onClick={onClose}>✕ Cancel</button>
          </div>
        </div>

        <div className="receipt-paper" id="receipt">

          <div className="receipt-header">
            <img
              src="https://placehold.co/80x80?text=LOGO"
              alt="Store Logo"
              className="store-logo"
            />
            {editingField === 'storeName' ? (
              <input
                autoFocus
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                onBlur={() => setEditingField(null)}
                className="edit-input centered"
              />
            ) : (
              <h3 className="store-name">
                {storeName}
                <button className="pencil-btn no-print" onClick={() => setEditingField('storeName')}>✏️</button>
              </h3>
            )}

            {editingField === 'storeAddress' ? (
              <input
                autoFocus
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
                onBlur={() => setEditingField(null)}
                className="edit-input centered"
              />
            ) : (
              <p className="store-address">
                {storeAddress}
                <button className="pencil-btn no-print" onClick={() => setEditingField('storeAddress')}>✏️</button>
              </p>
            )}

            <p className="receipt-date">
              {now.toLocaleDateString()} | {now.toLocaleTimeString()}
            </p>
            <hr />
          </div>

          <table className="receipt-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Product</th>
                <th>Price</th>
                <th>Total</th>
                <th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {editableItems.map((item, index) => (
                <tr key={index}>
                  <td>
                    {editingField === `qty-${index}` ? (
                      <input
                        autoFocus
                        type="number"
                        value={item.qty}
                        onChange={e => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                        onBlur={() => setEditingField(null)}
                        className="edit-input small"
                      />
                    ) : (
                      <span>
                        {item.qty}
                        <button className="pencil-btn no-print" onClick={() => setEditingField(`qty-${index}`)}>✏️</button>
                      </span>
                    )}
                  </td>
                  <td>
                    {editingField === `name-${index}` ? (
                      <input
                        autoFocus
                        type="text"
                        value={item.name}
                        onChange={e => updateItem(index, 'name', e.target.value)}
                        onBlur={() => setEditingField(null)}
                        className="edit-input"
                      />
                    ) : (
                      <span>
                        {item.name}
                        <button className="pencil-btn no-print" onClick={() => setEditingField(`name-${index}`)}>✏️</button>
                      </span>
                    )}
                  </td>
                  <td>
                    {editingField === `price-${index}` ? (
                      <input
                        autoFocus
                        type="number"
                        value={item.selling_price}
                        onChange={e => updateItem(index, 'selling_price', parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingField(null)}
                        className="edit-input small"
                      />
                    ) : (
                      <span>
                        P{parseFloat(item.selling_price).toFixed(2)}
                        <button className="pencil-btn no-print" onClick={() => setEditingField(`price-${index}`)}>✏️</button>
                      </span>
                    )}
                  </td>
                  <td>P{(parseFloat(item.selling_price) * parseInt(item.qty)).toFixed(2)}</td>
                  <td className="no-print">
                    <button className="remove-btn" onClick={() => removeItem(index)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-totals">
            <div className="totals-row">
              <span>Subtotal:</span>
              <span>P{getEditableSubtotal().toFixed(2)}</span>
            </div>
            {getEditableDiscount() > 0 && (
              <div className="totals-row discount">
                <span>Discount{appliedDiscount ? ` (${appliedDiscount.code})` : ''}:</span>
                <span>- P{getEditableDiscount().toFixed(2)}</span>
              </div>
            )}
            <div className="totals-row total">
              <strong>TOTAL:</strong>
              <strong>P{getEditableTotal().toFixed(2)}</strong>
            </div>
          </div>

          <div className="receipt-footer">
            <hr />
            <p>Thank you for your purchase!</p>
            <p>Please come again 😊</p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default ReceiptPreview