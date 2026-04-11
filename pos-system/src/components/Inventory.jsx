import { useState, useEffect, useRef } from 'react'
import { getProducts, saveProduct, supabase } from '../lib/supabase'

function Inventory() {
  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stock, setStock] = useState('')
  const [lowStockAlert, setLowStockAlert] = useState('5')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editData, setEditData] = useState({})
  const barcodeRef = useRef(null)

  useEffect(() => {
    barcodeRef.current.focus()
    fetchProducts()
  }, [])

  async function fetchProducts() {
    const data = await getProducts()
    setProducts(data)
  }

  function getMargin() {
    const cost = parseFloat(costPrice)
    const sell = parseFloat(sellingPrice)
    if (!cost || !sell || cost === 0) return null
    return (((sell - cost) / sell) * 100).toFixed(1)
  }

  async function handleSubmit() {
    if (!barcode || !name || !costPrice || !sellingPrice || !stock) {
      setMessage('Please fill in all required fields')
      setMessageType('error')
      return
    }

    const product = {
      barcode,
      name,
      cost_price: parseFloat(costPrice),
      selling_price: parseFloat(sellingPrice),
      stock: parseInt(stock),
      low_stock_alert: parseInt(lowStockAlert),
    }

    const error = await saveProduct(product)

    if (error) {
      setMessage('Error saving product: ' + error.message)
      setMessageType('error')
    } else {
      setMessage(`✅ "${name}" saved successfully!`)
      setMessageType('success')
      setBarcode('')
      setName('')
      setCostPrice('')
      setSellingPrice('')
      setStock('')
      setLowStockAlert('5')
      fetchProducts()
      barcodeRef.current.focus()
    }
  }

  function startEdit(product) {
    setEditingId(product.id)
    setEditData({
      name: product.name,
      barcode: product.barcode,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      stock: product.stock,
      low_stock_alert: product.low_stock_alert,
    })
  }

  async function saveEdit(id) {
    const { error } = await supabase
      .from('products')
      .update({
        name: editData.name,
        barcode: editData.barcode,
        cost_price: parseFloat(editData.cost_price),
        selling_price: parseFloat(editData.selling_price),
        stock: parseInt(editData.stock),
        low_stock_alert: parseInt(editData.low_stock_alert),
      })
      .eq('id', id)

    if (error) {
      setMessage('Error updating product: ' + error.message)
      setMessageType('error')
    } else {
      setMessage('✅ Product updated!')
      setMessageType('success')
      setEditingId(null)
      fetchProducts()
    }
  }

  async function deleteProduct(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      setMessage('Error deleting product: ' + error.message)
      setMessageType('error')
    } else {
      setMessage(`✅ "${name}" deleted!`)
      setMessageType('success')
      fetchProducts()
    }
  }

  const margin = getMargin()
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  )

  return (
    <div className="panel">
      <h2>📦 Inventory</h2>
      <p className="hint">Scan a barcode to begin adding or updating a product.</p>

      <div className="form-grid">
        <div className="form-group full">
          <label>Barcode *</label>
          <input
            ref={barcodeRef}
            type="text"
            placeholder="Scan or type barcode"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
          />
        </div>
        <div className="form-group full">
          <label>Product Name *</label>
          <input
            type="text"
            placeholder="e.g. Coca Cola 500ml"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Cost Price (P) *</label>
          <input
            type="number"
            placeholder="What you paid"
            value={costPrice}
            onChange={e => setCostPrice(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Selling Price (P) *</label>
          <input
            type="number"
            placeholder="What you charge"
            value={sellingPrice}
            onChange={e => setSellingPrice(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Stock Quantity *</label>
          <input
            type="number"
            placeholder="e.g. 50"
            value={stock}
            onChange={e => setStock(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Low Stock Alert</label>
          <input
            type="number"
            placeholder="e.g. 5"
            value={lowStockAlert}
            onChange={e => setLowStockAlert(e.target.value)}
          />
        </div>
        <div className="form-group margin-display">
          <label>Profit Margin</label>
          <div className={`margin-badge ${margin >= 30 ? 'good' : margin >= 10 ? 'ok' : 'low'}`}>
            {margin !== null ? `${margin}%` : '—'}
          </div>
        </div>
      </div>

      <button className="btn-primary full-width" onClick={handleSubmit}>
        Save Product
      </button>

      {message && <p className={`message ${messageType}`}>{message}</p>}

      <div className="section-header">
        <h3>Products ({filtered.length})</h3>
        <div className="filters">
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Name</th>
            <th>Cost</th>
            <th>Price</th>
            <th>Margin</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => {
            const m = (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(1)
            const lowStock = p.stock <= p.low_stock_alert
            const isEditing = editingId === p.id

            return (
              <tr key={p.id} className={lowStock && !isEditing ? 'low-stock-row' : ''}>
                <td>
                  {isEditing ? (
                    <input
                      className="edit-input"
                      value={editData.barcode}
                      onChange={e => setEditData({ ...editData, barcode: e.target.value })}
                    />
                  ) : p.barcode}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="edit-input"
                      value={editData.name}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                    />
                  ) : p.name}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="edit-input small"
                      type="number"
                      value={editData.cost_price}
                      onChange={e => setEditData({ ...editData, cost_price: e.target.value })}
                    />
                  ) : `P${parseFloat(p.cost_price).toFixed(2)}`}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="edit-input small"
                      type="number"
                      value={editData.selling_price}
                      onChange={e => setEditData({ ...editData, selling_price: e.target.value })}
                    />
                  ) : `P${parseFloat(p.selling_price).toFixed(2)}`}
                </td>
                <td>
                  <span className={`margin-badge small ${m >= 30 ? 'good' : m >= 10 ? 'ok' : 'low'}`}>
                    {m}%
                  </span>
                </td>
                <td>
                  {isEditing ? (
                    <input
                      className="edit-input small"
                      type="number"
                      value={editData.stock}
                      onChange={e => setEditData({ ...editData, stock: e.target.value })}
                    />
                  ) : (
                    <span className={lowStock ? 'low-stock-text' : ''}>
                      {p.stock} {lowStock ? '⚠️' : ''}
                    </span>
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn-primary btn-small" onClick={() => saveEdit(p.id)}>💾</button>
                      <button className="btn-secondary btn-small" onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn-small" onClick={() => startEdit(p)}>✏️</button>
                      <button className="remove-btn" onClick={() => deleteProduct(p.id, p.name)}>🗑️</button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Inventory