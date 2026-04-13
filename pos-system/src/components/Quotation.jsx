import { useState, useEffect } from 'react'
import { saveQuotation, getQuotations } from '../lib/supabase'
import { Plus, Trash2, Printer, Save, FileText } from 'lucide-react'

const VAT_RATE = 0.14

function emptyItem() {
  return { name: '', quantity: '', unit_price: '', vat_included: true }
}

function Quotation() {
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [quotations, setQuotations] = useState([])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('new')

  useEffect(() => { fetchQuotations() }, [])

  async function fetchQuotations() {
    const data = await getQuotations()
    setQuotations(data)
  }

  function updateItem(index, field, value) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  function addItem() { setItems([...items, emptyItem()]) }

  function removeItem(index) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function getItemTotal(item) {
    const price = parseFloat(item.unit_price) || 0
    const qty = parseInt(item.quantity) || 1
    return item.vat_included ? price * qty : price * qty * (1 + VAT_RATE)
  }

  function getItemVAT(item) {
    const price = parseFloat(item.unit_price) || 0
    const qty = parseInt(item.quantity) || 1
    return item.vat_included
      ? (price * qty * VAT_RATE) / (1 + VAT_RATE)
      : price * qty * VAT_RATE
  }

  function getTotals() {
    let subtotal = 0, vatAmount = 0, total = 0
    items.forEach(item => {
      const price = parseFloat(item.unit_price) || 0
      const qty = parseInt(item.quantity) || 1
      if (item.vat_included) {
        const excl = (price * qty) / (1 + VAT_RATE)
        vatAmount += price * qty - excl
        subtotal += excl
        total += price * qty
      } else {
        const vat = price * qty * VAT_RATE
        subtotal += price * qty
        vatAmount += vat
        total += price * qty + vat
      }
    })
    return { subtotal, vatAmount, total }
  }

  async function handleSave() {
    if (!customerName) {
      setMessage('Please enter customer name!')
      setMessageType('error')
      return
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].name || !items[i].unit_price || !items[i].quantity) {
        setMessage(`Please fill in all fields for item ${i + 1}!`)
        setMessageType('error')
        return
      }
    }

    setSaving(true)
    const { subtotal, vatAmount, total } = getTotals()
    const error = await saveQuotation({
      customer_name: customerName,
      customer_contact: customerContact,
      valid_until: validUntil || null,
      items,
      subtotal,
      vat_amount: vatAmount,
      total,
      status: 'pending',
    })

    if (error) {
      setMessage('Error saving quotation: ' + error.message)
      setMessageType('error')
    } else {
      setMessage('Quotation saved successfully!')
      setMessageType('success')
      setCustomerName('')
      setCustomerContact('')
      setValidUntil('')
      setItems([emptyItem()])
      fetchQuotations()
    }
    setSaving(false)
  }

  const { subtotal, vatAmount, total } = getTotals()

  return (
    <div className="panel">
      <h2>Quotations</h2>

      <div className="filter-tabs">
        <button className={view === 'new' ? 'active' : ''} onClick={() => setView('new')}>
          <Plus size={15} /> New Quotation
        </button>
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
          <FileText size={15} /> All Quotations ({quotations.length})
        </button>
      </div>

      {view === 'new' && (
        <>
          <div className="supplier-section">
            <h3>Customer Details</h3>
            <div className="form-grid">
              <div className="form-group full">
                <label>Customer Name *</label>
                <input type="text" placeholder="e.g. John Doe" value={customerName}
                  onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input type="text" placeholder="+267 71234567" value={customerContact}
                  onChange={e => setCustomerContact(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Valid Until</label>
                <input type="date" value={validUntil}
                  onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="products-section">
            <div className="section-header">
              <h3>Items ({items.length})</h3>
              <button className="btn-primary" onClick={addItem}>
                <Plus size={15} /> Add Item
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="purchase-product-card">
                <div className="purchase-product-header">
                  <span className="product-number">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button className="remove-btn" onClick={() => removeItem(index)}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Item Name *</label>
                    <input type="text" placeholder="e.g. Office Chair" value={item.name}
                      onChange={e => updateItem(index, 'name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Unit Price (P) *</label>
                    <input type="number" placeholder="Price per unit" value={item.unit_price}
                      onChange={e => updateItem(index, 'unit_price', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" placeholder="e.g. 2" value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Line Total</label>
                    <div className="line-total">
                      P{getItemTotal(item).toFixed(2)}
                      <span className="vat-note">(VAT: P{getItemVAT(item).toFixed(2)})</span>
                    </div>
                  </div>
                </div>
                <div className="product-checkboxes">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={item.vat_included}
                      onChange={e => updateItem(index, 'vat_included', e.target.checked)} />
                    <span>VAT Included in price (14%)</span>
                    <span className="checkbox-hint">
                      {item.vat_included ? 'Price already includes VAT' : 'VAT will be added on top (+14%)'}
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="invoice-totals">
            <h3>Quotation Summary</h3>
            <div className="totals-row">
              <span>Subtotal (excl. VAT):</span>
              <span>P{subtotal.toFixed(2)}</span>
            </div>
            <div className="totals-row" style={{ color: '#e67e00' }}>
              <span>VAT (14%):</span>
              <span>P{vatAmount.toFixed(2)}</span>
            </div>
            <div className="totals-row total">
              <strong>Total (incl. VAT):</strong>
              <strong>P{total.toFixed(2)}</strong>
            </div>
          </div>

          {message && <p className={`message ${messageType}`}>{message}</p>}

          <div className="actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Quotation'}
            </button>
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print Quotation
            </button>
          </div>
        </>
      )}

      {view === 'list' && (
        <>
          {quotations.length === 0 ? (
            <p className="empty">No quotations yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Valid Until</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quotations.map(q => (
                  <>
                    <tr key={q.id}>
                      <td>{new Date(q.created_at).toLocaleDateString()}</td>
                      <td>{q.customer_name}</td>
                      <td>{q.customer_contact || '—'}</td>
                      <td>{q.valid_until || '—'}</td>
                      <td><strong>P{parseFloat(q.total).toFixed(2)}</strong></td>
                      <td>
                        <span className={`status-badge ${q.status}`}>{q.status}</span>
                      </td>
                      <td>
                        <button className="btn-small"
                          onClick={() => setSelected(selected === q.id ? null : q.id)}>
                          {selected === q.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {selected === q.id && (
                      <tr key={q.id + '-detail'}>
                        <td colSpan="7" className="sale-detail">
                          <table className="inner-table">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>VAT</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {q.items.map((item, i) => (
                                <tr key={i}>
                                  <td>{item.name}</td>
                                  <td>{item.quantity}</td>
                                  <td>P{parseFloat(item.unit_price).toFixed(2)}</td>
                                  <td>{item.vat_included ? 'Included' : '+14%'}</td>
                                  <td>P{(parseFloat(item.unit_price) * parseInt(item.quantity) * (item.vat_included ? 1 : 1.14)).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="detail-totals">
                            <span>VAT: P{parseFloat(q.vat_amount).toFixed(2)}</span>
                            <span>Total: <strong>P{parseFloat(q.total).toFixed(2)}</strong></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

export default Quotation