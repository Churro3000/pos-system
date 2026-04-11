import { useState, useEffect } from 'react'
import { savePurchase, saveProduct, saveSupplier, getProducts, getSuppliers } from '../lib/supabase'

const VAT_RATE = 0.14

function emptyProduct() {
  return {
    barcode: '',
    name: '',
    cost_price: '',
    selling_price: '',
    quantity: '',
    vat_included: true,
    has_serial: false,
    serial_number: '',
  }
}

function Purchase() {
  const [supplierName, setSupplierName] = useState('')
  const [supplierContact, setSupplierContact] = useState('')
  const [supplierEmail, setSupplierEmail] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [products, setProducts] = useState([emptyProduct()])
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuppliers, setFilteredSuppliers] = useState([])

  useEffect(() => {
    fetchSuppliers()
  }, [])

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

  function updateProduct(index, field, value) {
    const updated = [...products]
    updated[index] = { ...updated[index], [field]: value }
    setProducts(updated)
  }

  function addProduct() {
    setProducts([...products, emptyProduct()])
  }

  function removeProduct(index) {
    if (products.length === 1) return
    setProducts(products.filter((_, i) => i !== index))
  }

  function getProductCost(p) {
    const cost = parseFloat(p.cost_price) || 0
    const qty = parseInt(p.quantity) || 1
    if (p.vat_included) {
      return cost * qty
    } else {
      return cost * qty * (1 + VAT_RATE)
    }
  }

  function getProductVAT(p) {
    const cost = parseFloat(p.cost_price) || 0
    const qty = parseInt(p.quantity) || 1
    if (p.vat_included) {
      return (cost * qty * VAT_RATE) / (1 + VAT_RATE)
    } else {
      return cost * qty * VAT_RATE
    }
  }

  function getTotals() {
    let totalExVat = 0
    let totalVat = 0
    let totalIncVat = 0

    products.forEach(p => {
      const cost = parseFloat(p.cost_price) || 0
      const qty = parseInt(p.quantity) || 1
      if (p.vat_included) {
        const excl = (cost * qty) / (1 + VAT_RATE)
        const vat = cost * qty - excl
        totalExVat += excl
        totalVat += vat
        totalIncVat += cost * qty
      } else {
        const vat = cost * qty * VAT_RATE
        totalExVat += cost * qty
        totalVat += vat
        totalIncVat += cost * qty + vat
      }
    })

    return { totalExVat, totalVat, totalIncVat }
  }

  async function handleSave() {
    if (!supplierName) {
      setMessage('❌ Please enter supplier name!')
      setMessageType('error')
      return
    }

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!p.name || !p.cost_price || !p.quantity) {
        setMessage(`❌ Please fill in all fields for product ${i + 1}!`)
        setMessageType('error')
        return
      }
    }

    setSaving(true)
    const { totalExVat, totalVat, totalIncVat } = getTotals()

    // Save or update supplier
    await saveSupplier({
      name: supplierName,
      contact: supplierContact,
      email: supplierEmail,
    })

    const purchase = {
      supplier_name: supplierName,
      supplier_contact: supplierContact,
      supplier_email: supplierEmail,
      invoice_number: invoiceNumber,
      notes,
      items: products,
      total_excluding_vat: totalExVat,
      total_vat: totalVat,
      total_including_vat: totalIncVat,
    }

    const error = await savePurchase(purchase)
    if (error) {
      setMessage('❌ Error saving purchase: ' + error.message)
      setMessageType('error')
      setSaving(false)
      return
    }

    // Add products to inventory
    const existingProducts = await getProducts()
    for (const p of products) {
      const existing = existingProducts.find(e => e.barcode === p.barcode)
      const newStock = existing
        ? existing.stock + parseInt(p.quantity)
        : parseInt(p.quantity)
      await saveProduct({
        barcode: p.barcode || `GEN-${Date.now()}-${Math.random()}`,
        name: p.name,
        cost_price: parseFloat(p.cost_price),
        selling_price: parseFloat(p.selling_price) || parseFloat(p.cost_price) * 1.3,
        stock: newStock,
        serial_number: p.has_serial ? p.serial_number : null,
        low_stock_alert: 5,
      })
    }

    setMessage('✅ Purchase saved and products added to inventory!')
    setMessageType('success')
    setSupplierName('')
    setSupplierContact('')
    setSupplierEmail('')
    setInvoiceNumber('')
    setNotes('')
    setProducts([emptyProduct()])
    fetchSuppliers()
    setSaving(false)
  }

  const { totalExVat, totalVat, totalIncVat } = getTotals()

  return (
    <div className="panel">
      <h2>🧾 Purchase / Invoice</h2>
      <p className="hint">Enter supplier details and products from the invoice.</p>

      {/* Supplier Details */}
      <div className="supplier-section">
        <h3>Supplier Details</h3>
        <div className="form-grid">
          <div className="form-group full" style={{ position: 'relative' }}>
            <label>Supplier Name *</label>
            <input
              type="text"
              placeholder="Type or select supplier..."
              value={supplierName}
              onChange={e => handleSupplierInput(e.target.value)}
              onFocus={() => {
                if (supplierName.length > 0) setShowSuggestions(true)
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoComplete="off"
            />
            {showSuggestions && filteredSuppliers.length > 0 && (
              <div className="autocomplete-dropdown">
                {filteredSuppliers.map(s => (
                  <div
                    key={s.id}
                    className="autocomplete-item"
                    onMouseDown={() => selectSupplier(s)}
                  >
                    <span className="autocomplete-name">{s.name}</span>
                    {s.contact && (
                      <span className="autocomplete-sub">{s.contact}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {showSuggestions && filteredSuppliers.length === 0 && supplierName && (
              <div className="autocomplete-dropdown">
                <div className="autocomplete-item new">
                  ✨ New supplier: <strong>{supplierName}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input
              type="text"
              placeholder="e.g. +267 71234567"
              value={supplierContact}
              onChange={e => setSupplierContact(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="supplier@email.com"
              value={supplierEmail}
              onChange={e => setSupplierEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Invoice Number</label>
            <input
              type="text"
              placeholder="e.g. INV-001"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Any notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="products-section">
        <div className="section-header">
          <h3>Products ({products.length})</h3>
          <button className="btn-primary" onClick={addProduct}>+ Add Product</button>
        </div>

        {products.map((p, index) => (
          <div key={index} className="purchase-product-card">
            <div className="purchase-product-header">
              <span className="product-number">Product {index + 1}</span>
              {products.length > 1 && (
                <button className="remove-btn" onClick={() => removeProduct(index)}>🗑️ Remove</button>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Barcode</label>
                <input
                  type="text"
                  placeholder="Scan or type"
                  value={p.barcode}
                  onChange={e => updateProduct(index, 'barcode', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Coca Cola 500ml"
                  value={p.name}
                  onChange={e => updateProduct(index, 'name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Cost Price (P) *</label>
                <input
                  type="number"
                  placeholder="Purchase price"
                  value={p.cost_price}
                  onChange={e => updateProduct(index, 'cost_price', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Selling Price (P)</label>
                <input
                  type="number"
                  placeholder="Your selling price"
                  value={p.selling_price}
                  onChange={e => updateProduct(index, 'selling_price', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={p.quantity}
                  onChange={e => updateProduct(index, 'quantity', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Line Total</label>
                <div className="line-total">
                  P{getProductCost(p).toFixed(2)}
                  <span className="vat-note">
                    (VAT: P{getProductVAT(p).toFixed(2)})
                  </span>
                </div>
              </div>
            </div>

            <div className="product-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={p.vat_included}
                  onChange={e => updateProduct(index, 'vat_included', e.target.checked)}
                />
                <span>VAT Included in price (14%)</span>
                <span className="checkbox-hint">
                  {p.vat_included ? 'Price already includes VAT' : 'VAT will be added on top (+14%)'}
                </span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={p.has_serial}
                  onChange={e => updateProduct(index, 'has_serial', e.target.checked)}
                />
                <span>Has Serial Number</span>
              </label>

              {p.has_serial && (
                <input
                  type="text"
                  placeholder="Enter serial number"
                  value={p.serial_number}
                  onChange={e => updateProduct(index, 'serial_number', e.target.value)}
                  className="serial-input"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="invoice-totals">
        <h3>Invoice Summary</h3>
        <div className="totals-row">
          <span>Total Excluding VAT:</span>
          <span>P{totalExVat.toFixed(2)}</span>
        </div>
        <div className="totals-row" style={{ color: '#e67e00' }}>
          <span>Total VAT (14%):</span>
          <span>P{totalVat.toFixed(2)}</span>
        </div>
        <div className="totals-row total">
          <strong>Total Including VAT:</strong>
          <strong>P{totalIncVat.toFixed(2)}</strong>
        </div>
      </div>

      {message && <p className={`message ${messageType}`}>{message}</p>}

      <button
        className="btn-primary full-width"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : '✅ Save Invoice & Add Products to Inventory'}
      </button>
    </div>
  )
}

export default Purchase