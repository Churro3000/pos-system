import { useState, useEffect, useRef } from 'react'
import { getProducts, saveProduct } from '../lib/supabase'

const CATEGORIES = ['General', 'Food & Drink', 'Clothing', 'Electronics', 'Household', 'Other']

function Inventory() {
  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('General')
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stock, setStock] = useState('')
  const [lowStockAlert, setLowStockAlert] = useState('5')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
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
      category,
      cost_price: parseFloat(costPrice),
      selling_price: parseFloat(sellingPrice),
      stock: parseInt(stock),
      low_stock_alert: parseInt(lowStockAlert)
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
      setCategory('General')
      setCostPrice('')
      setSellingPrice('')
      setStock('')
      setLowStockAlert('5')
      fetchProducts()
      barcodeRef.current.focus()
    }
  }

  const margin = getMargin()

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search)
    const matchCategory = filterCategory === 'All' || p.category === filterCategory
    return matchSearch && matchCategory
  })

  return (
    <div className="panel">
      <h2>📦 Inventory Mode</h2>
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
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
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

      {message && (
        <p className={`message ${messageType}`}>{message}</p>
      )}

      <div className="section-header">
        <h3>Products ({filtered.length})</h3>
        <div className="filters">
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option>All</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Name</th>
            <th>Category</th>
            <th>Cost</th>
            <th>Price</th>
            <th>Margin</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => {
            const m = (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(1)
            const lowStock = p.stock <= p.low_stock_alert
            return (
              <tr key={p.id} className={lowStock ? 'low-stock-row' : ''}>
                <td>{p.barcode}</td>
                <td>{p.name}</td>
                <td><span className="badge">{p.category}</span></td>
                <td>P{parseFloat(p.cost_price).toFixed(2)}</td>
                <td>P{parseFloat(p.selling_price).toFixed(2)}</td>
                <td><span className={`margin-badge small ${m >= 30 ? 'good' : m >= 10 ? 'ok' : 'low'}`}>{m}%</span></td>
                <td className={lowStock ? 'low-stock-text' : ''}>{p.stock} {lowStock ? '⚠️' : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Inventory