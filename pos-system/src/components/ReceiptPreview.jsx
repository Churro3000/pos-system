import { useState } from 'react'

const VAT_RATE = 0.14

function ReceiptPreview({ items, subtotal, vatAmount, discountAmount, appliedDiscount, total, onClose, onConfirm }) {
  const [editableItems, setEditableItems] = useState(items.map(i => ({ ...i })))
  const [storeName, setStoreName] = useState('MY SHOP')
  const [storeAddress, setStoreAddress] = useState('123 Main Street, City')
  const [editingField, setEditingField] = useState(null)
  const [printed, setPrinted] = useState(false)

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

  function getEditableVAT() {
    return getEditableSubtotal() * VAT_RATE
  }

  function getEditableDiscount() {
    if (!appliedDiscount) return discountAmount
    const subtotalWithVAT = getEditableSubtotal() + getEditableVAT()
    if (appliedDiscount.type === 'percent') {
      return (subtotalWithVAT * appliedDiscount.value) / 100
    }
    return appliedDiscount.value
  }

  function getEditableTotal() {
    return getEditableSubtotal() + getEditableVAT() - getEditableDiscount()
  }

  function handlePrint() {
    window.print()
    setPrinted(true)
  }

  const now = new Date()
  const editableSubtotal = getEditableSubtotal()
  const editableVAT = getEditableVAT()
  const editableDiscount = getEditableDiscount()
  const editableTotal = getEditableTotal()

  return (
    <div className="receipt-overlay">
      <div className="receipt-preview-container">

        <div className="receipt-actions no-print">
          <h2>🧾 Receipt Preview</h2>
          <p className="hint">
            {!printed
              ? 'Review and edit the receipt, then print it. Complete Sale only appears after printing.'
              : '✅ Receipt printed! Click Complete Sale to finalize and update stock.'}
          </p>
          <div className="receipt-action-buttons">
            <button className="btn-primary" onClick={handlePrint}>
              🖨️ {printed ? 'Print Again' : 'Print Receipt'}
            </button>
            {printed && (
              <button
                className="btn-secondary"
                style={{ background: '#f0fff4', color: '#2d8a4e', border: '2px solid #2d8a4e' }}
                onClick={() => onConfirm(editableItems)}
              >
                ✅ Complete Sale
              </button>
            )}
            <button className="btn-danger" onClick={onClose}>✕ Cancel</button>
          </div>
          {!printed && (
            <p style={{ fontSize: '0.8rem', color: '#e67e00', marginTop: '8px' }}>
              ⚠️ You must print the receipt before completing the sale.
            </p>
          )}
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
                        {item.serial_number && (
                          <div style={{ fontSize: '0.7rem', color: '#888' }}>
                            S/N: {item.serial_number}
                          </div>
                        )}
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
              <span>Subtotal (excl. VAT):</span>
              <span>P{editableSubtotal.toFixed(2)}</span>
            </div>
            <div className="totals-row" style={{ color: '#e67e00' }}>
              <span>VAT (14%):</span>
              <span>P{editableVAT.toFixed(2)}</span>
            </div>
            {editableDiscount > 0 && (
              <div className="totals-row discount">
                <span>Discount{appliedDiscount ? ` (${appliedDiscount.code})` : ''}:</span>
                <span>- P{editableDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="totals-row total">
              <strong>TOTAL (incl. VAT):</strong>
              <strong>P{editableTotal.toFixed(2)}</strong>
            </div>
          </div>

          <div className="receipt-footer">
            <hr />
            <p>VAT Reg No: 00000000</p>
            <p>Thank you for your purchase!</p>
            <p>Please come again 😊</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptPreview