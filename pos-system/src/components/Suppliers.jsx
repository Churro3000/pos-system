import { useState, useEffect } from 'react'
import { getSuppliers, getPurchases } from '../lib/supabase'
import { Factory, ChevronDown, ChevronUp, Clock, CheckCircle, Plus } from 'lucide-react'

function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [expandedInvoice, setExpandedInvoice] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [s, p] = await Promise.all([getSuppliers(), getPurchases()])
    setSuppliers(s)
    setPurchases(p)
    setLoading(false)
  }

  function getSupplierPurchases(supplierName) {
    return purchases.filter(p => p.supplier_name === supplierName)
  }

  if (loading) return <div className="panel"><p className="empty">Loading suppliers...</p></div>

  if (!selectedSupplier) {
    return (
      <div className="panel">
        <h2>Suppliers</h2>
        <p className="hint">Click a supplier to view their invoices.</p>

        {suppliers.length === 0 ? (
          <p className="empty">No suppliers yet — add products via the Purchase section!</p>
        ) : (
          <div className="suppliers-grid">
            {suppliers.map(s => {
              const supplierPurchases = getSupplierPurchases(s.name)
              const totalSpent = supplierPurchases.reduce((sum, p) => sum + p.total_including_vat, 0)
              const pendingCount = supplierPurchases.filter(p => p.pending_payment).length
              return (
                <div key={s.id} className="supplier-card" onClick={() => setSelectedSupplier(s)}>
                  <div className="supplier-card-header">
                    <Factory size={22} />
                    <h4>{s.name}</h4>
                  </div>
                  <div className="supplier-card-info">
                    {s.contact && <p>{s.contact}</p>}
                    {s.email && <p>{s.email}</p>}
                  </div>
                  <div className="supplier-card-stats">
                    <span>{supplierPurchases.length} invoice{supplierPurchases.length !== 1 ? 's' : ''}</span>
                    <span>P{totalSpent.toFixed(2)} total</span>
                    {pendingCount > 0 && (
                      <span className="pending-stat">{pendingCount} pending</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const supplierPurchases = getSupplierPurchases(selectedSupplier.name)
  const totalSpent = supplierPurchases.reduce((sum, p) => sum + p.total_including_vat, 0)
  const pendingTotal = supplierPurchases
    .filter(p => p.pending_payment)
    .reduce((sum, p) => sum + p.total_including_vat, 0)

  return (
    <div className="panel">
      <div className="supplier-detail-header">
        <button className="btn-secondary btn-small" onClick={() => {
          setSelectedSupplier(null)
          setExpandedInvoice(null)
        }}>
          ← Back
        </button>
        <div className="supplier-detail-title">
          <h3>{selectedSupplier.name}</h3>
          {selectedSupplier.contact && <span>{selectedSupplier.contact}</span>}
          {selectedSupplier.email && <span>{selectedSupplier.email}</span>}
        </div>
      </div>

      <div className="stats-row" style={{ marginTop: '16px' }}>
        <div className="stat-card blue">
          <span className="stat-label">Total Invoices</span>
          <span className="stat-value">{supplierPurchases.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Spent</span>
          <span className="stat-value">P{totalSpent.toFixed(2)}</span>
        </div>
        {pendingTotal > 0 && (
          <div className="stat-card orange">
            <span className="stat-label">Pending Payment</span>
            <span className="stat-value">P{pendingTotal.toFixed(2)}</span>
          </div>
        )}
      </div>

      <h3 style={{ margin: '20px 0 12px' }}>Invoices</h3>

      {supplierPurchases.length === 0 ? (
        <p className="empty">No invoices yet for this supplier.</p>
      ) : (
        <div className="invoice-list">
          {supplierPurchases.map((purchase, i) => (
            <div key={purchase.id} className="invoice-bar">
              <div
                className="invoice-bar-header"
                onClick={() => setExpandedInvoice(
                  expandedInvoice === purchase.id ? null : purchase.id
                )}
              >
                <div className="invoice-bar-left">
                  <span className="invoice-bar-number">
                    {purchase.invoice_number || `Invoice ${i + 1}`}
                  </span>
                  <span className="invoice-bar-date">
                    {new Date(purchase.created_at).toLocaleDateString()}
                  </span>
                  <span className="invoice-bar-items">
                    {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="invoice-bar-right">
                  <span className="invoice-bar-total">
                    P{parseFloat(purchase.total_including_vat).toFixed(2)}
                  </span>
                  {purchase.pending_payment ? (
                    <span className="invoice-status pending">
                      <Clock size={12} /> Pending Payment
                    </span>
                  ) : (
                    <span className="invoice-status paid">
                      <CheckCircle size={12} /> Paid
                    </span>
                  )}
                  {expandedInvoice === purchase.id
                    ? <ChevronUp size={16} />
                    : <ChevronDown size={16} />}
                </div>
              </div>

              {expandedInvoice === purchase.id && (
                <div className="invoice-bar-detail">
                  <table className="inner-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Discount</th>
                        <th>VAT</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.items.map((item, j) => (
                        <tr key={j}>
                          <td>{item.barcode || '—'}</td>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>P{parseFloat(item.cost_price).toFixed(2)}</td>
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
                  <div className="invoice-bar-summary">
                    <div className="summary-row">
                      <span>Line Discount Total:</span>
                      <span>P{parseFloat(purchase.discount_total || 0).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Total Exclusive:</span>
                      <span>P{parseFloat(purchase.total_excluding_vat).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>VAT (14%):</span>
                      <span>P{parseFloat(purchase.total_vat).toFixed(2)}</span>
                    </div>
                    <div className="summary-row total-row">
                      <span>TOTAL:</span>
                      <span>P{parseFloat(purchase.total_including_vat).toFixed(2)}</span>
                    </div>
                  </div>
                  {purchase.notes && (
                    <p className="invoice-notes">Notes: {purchase.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Suppliers