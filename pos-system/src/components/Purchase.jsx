import { useState, useEffect, useRef } from 'react'
import { savePurchase, saveProduct, saveSupplier, getProducts, getSuppliers } from '../lib/supabase'
import { Printer, Save, Plus, Trash2 } from 'lucide-react'

const VAT_RATE = 0.14

function emptyRow() {
  return {
    code: '',
    description: '',
    quantity: '',
    price: '',
    discount: '',
    vat_included: true,
  }
}

function Purchase() {
  const [supplierName, setSupplierName] = useState('')
  const [supplierContact, setSupplierContact] = useState('')
  const [supplierEmail, setSupplierEmail] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()])
  const [pendingPayment, setPendingPayment] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuppliers, setFilteredSuppliers] = useState([])
  const [editingCell, setEditingCell] = useState(null)

  useEffect(() => { fetchSuppliers() }, [])

  async function fetchSuppliers() {
    const data = await getSuppliers()
    setSuppliers(data)
  }

  function handleSupplierInput(value) {
    setSupplierName(value)
    if (value.length > 0) {
      const matches = suppliers.filter(s =>
        s.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSuppliers(matches)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
      setSupplierContact('')
      setSupplierEmail('')
    }
  }

  function selectSupplier(supplier) {
    setSupplierName(supplier.name)
    setSupplierContact(supplier.contact || '')
    setSupplierEmail(supplier.email || '')
    setShowSuggestions(false)
  }

  function updateRow(index, field, value) {
    const updated = [...rows]
    updated[index] = { ...updated[index], [field]: value }
    setRows(updated)
  }

  function addRow() {
    setRows([...rows, emptyRow()])
  }

  function removeRow(index) {
    if (rows.length === 1) return
    setRows(rows.filter((_, i) => i !== index))
  }

  function getLineTotal(row) {
    const price = parseFloat(row.price) || 0
    const qty = parseFloat(row.quantity) || 0
    const discount = parseFloat(row.discount) || 0
    const gross = price * qty
    const discounted = gross - (gross * discount / 100)
    return discounted
  }

  function getLineVAT(row) {
    const total = getLineTotal(row)
    if (row.vat_included) {
      return (total * VAT_RATE) / (1 + VAT_RATE)
    }
    return total * VAT_RATE
  }

  function getLineTotalWithVAT(row) {
    const total = getLineTotal(row)
    if (row.vat_included) return total
    return total * (1 + VAT_RATE)
  }

  function getSummary() {
    const activeRows = rows.filter(r => r.description && r.price && r.quantity)
    const lineDiscountTotal = activeRows.reduce((sum, r) => {
      const gross = (parseFloat(r.price) || 0) * (parseFloat(r.quantity) || 0)
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
    if (!supplierName) {
      setMessage('Please enter supplier name!')
      setMessageType('error')
      return
    }

    const activeRows = rows.filter(r => r.description && r.price && r.quantity)
    if (activeRows.length === 0) {
      setMessage('Please add at least one product!')
      setMessageType('error')
      return
    }

    setSaving(true)
    const { lineDiscountTotal, totalExclusive, totalVAT, total } = getSummary()

    await saveSupplier({ name: supplierName, contact: supplierContact, email: supplierEmail })

    const purchase = {
      supplier_name: supplierName,
      supplier_contact: supplierContact,
      supplier_email: supplierEmail,
      invoice_number: invoiceNumber,
      notes,
      pending_payment: pendingPayment,
      discount_total: lineDiscountTotal,
      items: activeRows.map(r => ({
        barcode: r.code,
        name: r.description,
        quantity: parseFloat(r.quantity) || 0,
        cost_price: parseFloat(r.price) || 0,
        selling_price: 0,
        vat_included: r.vat_included,
        discount: parseFloat(r.discount) || 0,
        line_total: getLineTotalWithVAT(r),
      })),
      total_excluding_vat: totalExclusive,
      total_vat: totalVAT,
      total_including_vat: total,
    }

    const error = await savePurchase(purchase)
    if (error) {
      setMessage('Error saving purchase: ' + error.message)
      setMessageType('error')
      setSaving(false)
      return
    }

    // Add to inventory
    const existingProducts = await getProducts()
    for (const r of activeRows) {
      if (!r.description) continue
      const existing = existingProducts.find(e => e.barcode === r.code)
      const newStock = existing
        ? existing.stock + (parseFloat(r.quantity) || 0)
        : parseFloat(r.quantity) || 0
      await saveProduct({
        barcode: r.code || `GEN-${Date.now()}-${Math.random()}`,
        name: r.description,
        cost_price: parseFloat(r.price) || 0,
        selling_price: existing ? existing.selling_price : parseFloat(r.price) * 1.3,
        stock: newStock,
        low_stock_alert: 5,
      })
    }

    setMessage('Purchase invoice saved!')
    setMessageType('success')
    setSupplierName('')
    setSupplierContact('')
    setSupplierEmail('')
    setInvoiceNumber('')
    setNotes('')
    setPendingPayment(false)
    setRows([emptyRow(), emptyRow(), emptyRow()])
    fetchSuppliers()
    setSaving(false)
  }

  function handlePrint() {
    window.print()
  }

  const { lineDiscountTotal, totalExclusive, totalVAT, total } = getSummary()
  const activeRows = rows.filter(r => r.description || r.price || r.quantity || r.code)

  return (
    <div className="purchase-page">

      {/* ACTION BUTTONS - hidden on print */}
      <div className="purchase-actions no-print">
        <div className="purchase-actions-left">
          <h2>Purchase Invoice</h2>
        </div>
        <div className="purchase-actions-right">
          <label className="checkbox-label pending-checkbox">
            <input
              type="checkbox"
              checked={pendingPayment}
              onChange={e => setPendingPayment(e.target.checked)}
            />
            <span>Pending Payment</span>
          </label>
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={15} /> Print / PDF
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      {message && <p className={`message ${messageType} no-print`}>{message}</p>}

      {/* A4 INVOICE */}
      <div className="a4-invoice" id="invoice">

        {/* Invoice Header */}
        <div className="invoice-top">
          <div className="invoice-supplier">
            <h1 className="invoice-title">PURCHASE INVOICE</h1>
            <div
              className="invoice-field"
              onDoubleClick={() => setEditingCell('supplierName')}
            >
              {editingCell === 'supplierName' ? (
                <div style={{ position: 'relative' }}>
                  <input
                    autoFocus
                    className="invoice-input"
                    placeholder="Supplier Name *"
                    value={supplierName}
                    onChange={e => handleSupplierInput(e.target.value)}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowSuggestions(false)
                        setEditingCell(null)
                      }, 150)
                    }}
                  />
                  {showSuggestions && filteredSuppliers.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {filteredSuppliers.map(s => (
                        <div key={s.id} className="autocomplete-item"
                          onMouseDown={() => selectSupplier(s)}>
                          <span className="autocomplete-name">{s.name}</span>
                          {s.contact && <span className="autocomplete-sub">{s.contact}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className={`invoice-value bold ${!supplierName ? 'placeholder' : ''}`}>
                  {supplierName || 'Double-click to enter supplier name'}
                </span>
              )}
            </div>

            <div className="invoice-field" onDoubleClick={() => setEditingCell('supplierContact')}>
              {editingCell === 'supplierContact' ? (
                <input autoFocus className="invoice-input" placeholder="Contact number"
                  value={supplierContact}
                  onChange={e => setSupplierContact(e.target.value)}
                  onBlur={() => setEditingCell(null)} />
              ) : (
                <span className={`invoice-value ${!supplierContact ? 'placeholder' : ''}`}>
                  {supplierContact || 'Double-click to enter contact'}
                </span>
              )}
            </div>

            <div className="invoice-field" onDoubleClick={() => setEditingCell('supplierEmail')}>
              {editingCell === 'supplierEmail' ? (
                <input autoFocus className="invoice-input" placeholder="Email address"
                  value={supplierEmail}
                  onChange={e => setSupplierEmail(e.target.value)}
                  onBlur={() => setEditingCell(null)} />
              ) : (
                <span className={`invoice-value ${!supplierEmail ? 'placeholder' : ''}`}>
                  {supplierEmail || 'Double-click to enter email'}
                </span>
              )}
            </div>
          </div>

          <div className="invoice-meta">
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">Invoice No:</span>
              <div className="invoice-field" onDoubleClick={() => setEditingCell('invoiceNumber')}>
                {editingCell === 'invoiceNumber' ? (
                  <input autoFocus className="invoice-input"
                    placeholder="INV-001"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    onBlur={() => setEditingCell(null)} />
                ) : (
                  <span className={`invoice-value ${!invoiceNumber ? 'placeholder' : ''}`}>
                    {invoiceNumber || 'INV-001'}
                  </span>
                )}
              </div>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">Date:</span>
              <div className="invoice-field" onDoubleClick={() => setEditingCell('invoiceDate')}>
                {editingCell === 'invoiceDate' ? (
                  <input autoFocus className="invoice-input" type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    onBlur={() => setEditingCell(null)} />
                ) : (
                  <span className="invoice-value">{invoiceDate}</span>
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

        {/* Invoice Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Discount %</th>
              <th>VAT Incl.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="invoice-row">
                <td onDoubleClick={() => setEditingCell(`${index}-code`)}>
                  {editingCell === `${index}-code` ? (
                    <input autoFocus className="invoice-cell-input"
                      value={row.code}
                      onChange={e => updateRow(index, 'code', e.target.value)}
                      onBlur={() => setEditingCell(null)} />
                  ) : (
                    <span className={!row.code ? 'cell-placeholder' : ''}>{row.code || '—'}</span>
                  )}
                </td>
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
                    <span className={!row.quantity ? 'cell-placeholder' : ''}>{row.quantity || '0'}</span>
                  )}
                </td>
                <td onDoubleClick={() => setEditingCell(`${index}-price`)}>
                  {editingCell === `${index}-price` ? (
                    <input autoFocus className="invoice-cell-input narrow" type="number"
                      value={row.price}
                      onChange={e => updateRow(index, 'price', e.target.value)}
                      onBlur={() => setEditingCell(null)} />
                  ) : (
                    <span className={!row.price ? 'cell-placeholder' : ''}>
                      {row.price ? `P${parseFloat(row.price).toFixed(2)}` : '0.00'}
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
                    title={row.vat_included ? 'VAT included in price' : 'VAT will be added'}
                  />
                </td>
                <td className="total-cell">
                  {row.description && row.price && row.quantity
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

        {/* Add Row Button */}
        <div className="add-row-wrap no-print">
          <button className="add-row-btn" onClick={addRow}>
            <Plus size={14} /> Add Row
          </button>
        </div>

        {/* Summary */}
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
              <span>P {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="invoice-footer">
          <div className="invoice-footer-left">
            <p>Date: ___________________________</p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Purchase