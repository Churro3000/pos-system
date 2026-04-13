import { useState, useEffect } from 'react'
import { saveQuotation, getQuotations } from '../lib/supabase'
import { Printer, Save, Plus, Trash2, FileText } from 'lucide-react'

const VAT_RATE = 0.14

function emptyRow() {
  return { description: '', quantity: '', unit_price: '', discount: '', vat_included: true }
}

function Quotation() {
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [quoteDate] = useState(new Date().toISOString().split('T')[0])
  const [quoteNumber, setQuoteNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('new')
  const [quotations, setQuotations] = useState([])
  const [expandedQuote, setExpandedQuote] = useState(null)
  const [editingCell, setEditingCell] = useState(null)

  useEffect(() => { fetchQuotations() }, [])

  async function fetchQuotations() {
    const data = await getQuotations()
    setQuotations(data)
  }

  function updateRow(index, field, value) {
    const updated = [...rows]
    updated[index] = { ...updated[index], [field]: value }
    setRows(updated)
  }

  function addRow() { setRows([...rows, emptyRow()]) }

  function removeRow(index) {
    if (rows.length === 1) return
    setRows(rows.filter((_, i) => i !== index))
  }

  function getLineTotal(row) {
    const price = parseFloat(row.unit_price) || 0
    const qty = parseFloat(row.quantity) || 0
    const discount = parseFloat(row.discount) || 0
    const gross = price * qty
    return gross - (gross * discount / 100)
  }

  function getLineVAT(row) {
    const total = getLineTotal(row)
    return row.vat_included
      ? (total * VAT_RATE) / (1 + VAT_RATE)
      : total * VAT_RATE
  }

  function getLineTotalWithVAT(row) {
    const total = getLineTotal(row)
    return row.vat_included ? total : total * (1 + VAT_RATE)
  }

  function getSummary() {
    const activeRows = rows.filter(r => r.description && r.unit_price && r.quantity)
    const lineDiscountTotal = activeRows.reduce((sum, r) => {
      const gross = (parseFloat(r.unit_price) || 0) * (parseFloat(r.quantity) || 0)
      return sum + (gross * (parseFloat(r.discount) || 0) / 100)
    }, 0)
    const totalExclusive = activeRows.reduce((sum, r) => {
      const total = getLineTotal(r)
      return sum + (r.vat_included ? total / (1 + VAT_RATE) : total)
    }, 0)
    const totalVAT = activeRows.reduce((sum, r) => sum + getLineVAT(r), 0)
    const total = totalExclusive + totalVAT
    return { lineDiscountTotal, totalExclusive, totalVAT, total }
  }

  async function handleSave() {
    if (!customerName) {
      setMessage('Please enter customer name!')
      setMessageType('error')
      return
    }
    const activeRows = rows.filter(r => r.description && r.unit_price && r.quantity)
    if (activeRows.length === 0) {
      setMessage('Please add at least one item!')
      setMessageType('error')
      return
    }

    setSaving(true)
    const { lineDiscountTotal, totalExclusive, totalVAT, total } = getSummary()

    const error = await saveQuotation({
      customer_name: customerName,
      customer_contact: customerContact,
      valid_until: validUntil || null,
      items: activeRows.map(r => ({
        name: r.description,
        quantity: parseFloat(r.quantity) || 0,
        unit_price: parseFloat(r.unit_price) || 0,
        discount: parseFloat(r.discount) || 0,
        vat_included: r.vat_included,
        line_total: getLineTotalWithVAT(r),
      })),
      subtotal: totalExclusive,
      vat_amount: totalVAT,
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
      setQuoteNumber('')
      setNotes('')
      setRows([emptyRow(), emptyRow(), emptyRow()])
      fetchQuotations()
    }
    setSaving(false)
  }

  function printQuote(q) {
    const printWindow = window.open('', '_blank')
    const rows = q.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>P${parseFloat(item.unit_price).toFixed(2)}</td>
        <td>${item.discount ? item.discount + '%' : '0%'}</td>
        <td>${item.vat_included ? 'Included' : 'Excluded'}</td>
        <td>P${parseFloat(item.line_total || 0).toFixed(2)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; margin: 20mm; color: #333; }
          h1 { font-size: 1.6rem; letter-spacing: 2px; color: #1a1a2e; margin-bottom: 8px; }
          .top { display: flex; justify-content: space-between; margin-bottom: 32px; }
          .customer-name { font-size: 1.1rem; font-weight: 700; }
          .meta-label { font-size: 0.75rem; color: #888; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-size: 0.78rem; text-transform: uppercase; }
          td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 0.88rem; }
          .summary { display: flex; justify-content: flex-end; }
          .summary-box { min-width: 280px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 16px; font-size: 0.9rem; border-bottom: 1px solid #f0f0f0; }
          .total-row { background: #1a1a2e; color: white; font-weight: 700; font-size: 1rem; }
          .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; color: #888; font-size: 0.9rem; }
          .valid { background: #f0fff4; color: #2d8a4e; border: 1px solid #b7ebc8; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; display: inline-block; margin-top: 8px; }
        </style>
      </head>
      <body>
        <h1>QUOTATION</h1>
        <div class="top">
          <div>
            <div class="customer-name">${q.customer_name}</div>
            ${q.customer_contact ? `<div>${q.customer_contact}</div>` : ''}
            ${q.valid_until ? `<div class="valid">Valid Until: ${q.valid_until}</div>` : ''}
          </div>
          <div>
            <div><span class="meta-label">Date: </span>${new Date(q.created_at).toLocaleDateString()}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Discount %</th>
              <th>VAT</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="summary">
          <div class="summary-box">
            <div class="summary-row"><span>Line Discount Total</span><span>P${parseFloat(q.subtotal || 0).toFixed(2)}</span></div>
            <div class="summary-row"><span>Total Exclusive</span><span>P${parseFloat(q.subtotal).toFixed(2)}</span></div>
            <div class="summary-row"><span>VAT (14%)</span><span>P${parseFloat(q.vat_amount).toFixed(2)}</span></div>
            <div class="summary-row total-row"><span>TOTAL</span><span>P${parseFloat(q.total).toFixed(2)}</span></div>
          </div>
        </div>
        <div class="footer">
          <p>This quotation is valid until ${q.valid_until || 'further notice'}.</p>
          <p>Date: ___________________________</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const { lineDiscountTotal, totalExclusive, totalVAT, total } = getSummary()

  return (
    <div className="purchase-page">

      <div className="purchase-actions no-print">
        <h2>Quotation</h2>
        <div className="purchase-actions-right">
          <button
            className={`btn-secondary ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView(view === 'list' ? 'new' : 'list')}
          >
            <FileText size={15} />
            {view === 'list' ? 'New Quotation' : `All Quotations (${quotations.length})`}
          </button>
          {view === 'new' && (
            <>
              <button className="btn-secondary" onClick={() => window.print()}>
                <Printer size={15} /> Print / PDF
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={15} /> {saving ? 'Saving...' : 'Save Quotation'}
              </button>
            </>
          )}
        </div>
      </div>

      {message && <p className={`message ${messageType} no-print`}>{message}</p>}

      {view === 'new' && (
        <div className="a4-invoice" id="quotation">

          <div className="invoice-top">
            <div className="invoice-supplier">
              <h1 className="invoice-title">QUOTATION</h1>

              <div className="invoice-field" onDoubleClick={() => setEditingCell('customerName')}>
                {editingCell === 'customerName' ? (
                  <input autoFocus className="invoice-input" placeholder="Customer Name *"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    onBlur={() => setEditingCell(null)} />
                ) : (
                  <span className={`invoice-value bold ${!customerName ? 'placeholder' : ''}`}>
                    {customerName || 'Double-click to enter customer name'}
                  </span>
                )}
              </div>

              <div className="invoice-field" onDoubleClick={() => setEditingCell('customerContact')}>
                {editingCell === 'customerContact' ? (
                  <input autoFocus className="invoice-input" placeholder="Contact number"
                    value={customerContact}
                    onChange={e => setCustomerContact(e.target.value)}
                    onBlur={() => setEditingCell(null)} />
                ) : (
                  <span className={`invoice-value ${!customerContact ? 'placeholder' : ''}`}>
                    {customerContact || 'Double-click to enter contact'}
                  </span>
                )}
              </div>
            </div>

            <div className="invoice-meta">
              <div className="invoice-meta-row">
                <span className="invoice-meta-label">Quote No:</span>
                <div className="invoice-field" onDoubleClick={() => setEditingCell('quoteNumber')}>
                  {editingCell === 'quoteNumber' ? (
                    <input autoFocus className="invoice-input" placeholder="QUO-001"
                      value={quoteNumber}
                      onChange={e => setQuoteNumber(e.target.value)}
                      onBlur={() => setEditingCell(null)} />
                  ) : (
                    <span className={`invoice-value ${!quoteNumber ? 'placeholder' : ''}`}>
                      {quoteNumber || 'QUO-001'}
                    </span>
                  )}
                </div>
              </div>
              <div className="invoice-meta-row">
                <span className="invoice-meta-label">Date:</span>
                <span className="invoice-value">{quoteDate}</span>
              </div>
              <div className="invoice-meta-row">
                <span className="invoice-meta-label">Valid Until:</span>
                <div className="invoice-field" onDoubleClick={() => setEditingCell('validUntil')}>
                  {editingCell === 'validUntil' ? (
                    <input autoFocus className="invoice-input" type="date"
                      value={validUntil}
                      onChange={e => setValidUntil(e.target.value)}
                      onBlur={() => setEditingCell(null)} />
                  ) : (
                    <span className={`invoice-value ${!validUntil ? 'placeholder' : ''}`}>
                      {validUntil || 'Double-click to set date'}
                    </span>
                  )}
                </div>
              </div>
              <div className="invoice-meta-row">
                <span className="invoice-meta-label">Notes:</span>
                <div className="invoice-field" onDoubleClick={() => setEditingCell('notes')}>
                  {editingCell === 'notes' ? (
                    <input autoFocus className="invoice-input" placeholder="Any notes..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      onBlur={() => setEditingCell(null)} />
                  ) : (
                    <span className={`invoice-value ${!notes ? 'placeholder' : ''}`}>
                      {notes || 'Double-click to add notes'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount %</th>
                <th>VAT Incl.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="invoice-row">
                  <td onDoubleClick={() => setEditingCell(`${index}-description`)}>
                    {editingCell === `${index}-description` ? (
                      <input autoFocus className="invoice-cell-input wide"
                        value={row.description}
                        onChange={e => updateRow(index, 'description', e.target.value)}
                        onBlur={() => setEditingCell(null)} />
                    ) : (
                      <span className={!row.description ? 'cell-placeholder' : ''}>
                        {row.description || 'Double-click to edit'}
                      </span>
                    )}
                  </td>
                  <td onDoubleClick={() => setEditingCell(`${index}-quantity`)}>
                    {editingCell === `${index}-quantity` ? (
                      <input autoFocus className="invoice-cell-input narrow" type="number"
                        value={row.quantity}
                        onChange={e => updateRow(index, 'quantity', e.target.value)}
                        onBlur={() => setEditingCell(null)} />
                    ) : (
                      <span className={!row.quantity ? 'cell-placeholder' : ''}>
                        {row.quantity || '0'}
                      </span>
                    )}
                  </td>
                  <td onDoubleClick={() => setEditingCell(`${index}-unit_price`)}>
                    {editingCell === `${index}-unit_price` ? (
                      <input autoFocus className="invoice-cell-input narrow" type="number"
                        value={row.unit_price}
                        onChange={e => updateRow(index, 'unit_price', e.target.value)}
                        onBlur={() => setEditingCell(null)} />
                    ) : (
                      <span className={!row.unit_price ? 'cell-placeholder' : ''}>
                        {row.unit_price ? `P${parseFloat(row.unit_price).toFixed(2)}` : '0.00'}
                      </span>
                    )}
                  </td>
                  <td onDoubleClick={() => setEditingCell(`${index}-discount`)}>
                    {editingCell === `${index}-discount` ? (
                      <input autoFocus className="invoice-cell-input narrow" type="number"
                        value={row.discount}
                        onChange={e => updateRow(index, 'discount', e.target.value)}
                        onBlur={() => setEditingCell(null)} />
                    ) : (
                      <span>{row.discount ? `${row.discount}%` : '0%'}</span>
                    )}
                  </td>
                  <td className="vat-cell">
                    <input
                      type="checkbox"
                      checked={row.vat_included}
                      onChange={e => updateRow(index, 'vat_included', e.target.checked)}
                    />
                  </td>
                  <td className="total-cell">
                    {row.description && row.unit_price && row.quantity
                      ? `P${getLineTotalWithVAT(row).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="row-action no-print">
                    <button className="remove-btn" onClick={() => removeRow(index)}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="add-row-wrap no-print">
            <button className="add-row-btn" onClick={addRow}>
              <Plus size={14} /> Add Row
            </button>
          </div>

          <div className="invoice-summary">
            <div className="invoice-summary-box">
              <div className="summary-row">
                <span>Line Discount Total</span>
                <span>P{lineDiscountTotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Total Exclusive</span>
                <span>P{totalExclusive.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>VAT (14%)</span>
                <span>P{totalVAT.toFixed(2)}</span>
              </div>
              <div className="summary-row total-row">
                <span>TOTAL</span>
                <span>P{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="invoice-footer">
            <p>This quotation is valid until {validUntil || 'further notice'}.</p>
            <p>Date: ___________________________</p>
          </div>

        </div>
      )}

      {view === 'list' && (
        <div className="panel" style={{ marginTop: '16px' }}>
          {quotations.length === 0 ? (
            <p className="empty">No quotations yet.</p>
          ) : (
            <div className="invoice-list">
              {quotations.map((q, i) => (
                <div key={q.id} className="invoice-bar">
                  <div
                    className="invoice-bar-header"
                    onClick={() => setExpandedQuote(expandedQuote === q.id ? null : q.id)}
                  >
                    <div className="invoice-bar-left">
                      <span className="invoice-bar-number">
                        {q.customer_name}
                      </span>
                      <span className="invoice-bar-date">
                        {new Date(q.created_at).toLocaleDateString()}
                      </span>
                      <span className="invoice-bar-items">
                        {q.items.length} item{q.items.length !== 1 ? 's' : ''}
                      </span>
                      {q.valid_until && (
                        <span className="invoice-bar-items">
                          Valid until: {q.valid_until}
                        </span>
                      )}
                    </div>
                    <div className="invoice-bar-right">
                      <span className="invoice-bar-total">
                        P{parseFloat(q.total).toFixed(2)}
                      </span>
                      <span className={`status-badge ${q.status}`}>{q.status}</span>
                      {expandedQuote === q.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {expandedQuote === q.id && (
                    <div className="invoice-bar-detail">
                      <div className="a4-invoice-preview">
                        <div className="invoice-top">
                          <div className="invoice-supplier">
                            <h1 className="invoice-title">QUOTATION</h1>
                            <div className="invoice-value bold">{q.customer_name}</div>
                            {q.customer_contact && <div className="invoice-value">{q.customer_contact}</div>}
                            {q.valid_until && (
                              <div className="invoice-value" style={{ color: '#2d8a4e' }}>
                                Valid Until: {q.valid_until}
                              </div>
                            )}
                          </div>
                          <div className="invoice-meta">
                            <div className="invoice-meta-row">
                              <span className="invoice-meta-label">Date:</span>
                              <span className="invoice-value">
                                {new Date(q.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <table className="invoice-table">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Qty</th>
                              <th>Unit Price</th>
                              <th>Discount %</th>
                              <th>VAT</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {q.items.map((item, j) => (
                              <tr key={j}>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td>P{parseFloat(item.unit_price).toFixed(2)}</td>
                                <td>{item.discount ? `${item.discount}%` : '0%'}</td>
                                <td>
                                  <span className={`status-badge ${item.vat_included ? 'accepted' : 'pending'}`}>
                                    {item.vat_included ? 'Incl.' : 'Excl.'}
                                  </span>
                                </td>
                                <td>P{parseFloat(item.line_total || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="invoice-summary">
                          <div className="invoice-summary-box">
                            <div className="summary-row">
                              <span>Total Exclusive</span>
                              <span>P{parseFloat(q.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="summary-row">
                              <span>VAT (14%)</span>
                              <span>P{parseFloat(q.vat_amount).toFixed(2)}</span>
                            </div>
                            <div className="summary-row total-row">
                              <span>TOTAL</span>
                              <span>P{parseFloat(q.total).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="invoice-footer">
                          <p>Valid until {q.valid_until || 'further notice'}.</p>
                        </div>

                        <div className="invoice-bar-print no-print">
                          <button className="btn-primary" onClick={() => printQuote(q)}>
                            Print Quotation
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Quotation