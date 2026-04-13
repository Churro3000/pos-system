import { useState, useEffect } from 'react'
import { getSuppliers, getPurchases } from '../lib/supabase'
import { Factory, ChevronDown, ChevronUp, Clock, CheckCircle } from 'lucide-react'

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

  function printInvoice(purchase) {
    const printWindow = window.open('', '_blank')
    const rows = purchase.items.map(item => `
      <tr>
        <td>${item.barcode || '—'}</td>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>P${parseFloat(item.cost_price).toFixed(2)}</td>
        <td>${item.discount ? item.discount + '%' : '0%'}</td>
        <td>${item.vat_included ? 'Included' : 'Excluded'}</td>
        <td>P${parseFloat(item.line_total || 0).toFixed(2)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Invoice</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; margin: 20mm; color: #333; }
          h1 { font-size: 1.6rem; letter-spacing: 2px; color: #1a1a2e; margin-bottom: 8px; }
          .top { display: flex; justify-content: space-between; margin-bottom: 32px; }
          .supplier-name { font-size: 1.1rem; font-weight: 700; }
          .meta-label { font-size: 0.75rem; color: #888; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-size: 0.78rem; text-transform: uppercase; }
          td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 0.88rem; }
          .summary { display: flex; justify-content: flex-end; }
          .summary-box { min-width: 280px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 16px; font-size: 0.9rem; border-bottom: 1px solid #f0f0f0; }
          .total-row { background: #1a1a2e; color: white; font-weight: 700; font-size: 1rem; }
          .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; color: #888; font-size: 0.9rem; }
          .pending-badge { display: inline-block; background: #fff8f0; color: #e67e00; border: 1px solid #f0c080; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>PURCHASE INVOICE</h1>
        <div class="top">
          <div>
            <div class="supplier-name">${purchase.supplier_name}</div>
            ${purchase.supplier_contact ? `<div>${purchase.supplier_contact}</div>` : ''}
            ${purchase.supplier_email ? `<div>${purchase.supplier_email}</div>` : ''}
          </div>
          <div>
            <div><span class="meta-label">Invoice No: </span>${purchase.invoice_number || '—'}</div>
            <div><span class="meta-label">Date: </span>${new Date(purchase.created_at).toLocaleDateString()}</div>
            ${purchase.notes ? `<div><span class="meta-label">Notes: </span>${purchase.notes}</div>` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Discount %</th>
              <th>VAT</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="summary">
          <div class="summary-box">
            <div class="summary-row"><span>Line Discount Total</span><span>P${parseFloat(purchase.discount_total || 0).toFixed(2)}</span></div>
            <div class="summary-row"><span>Total Exclusive</span><span>P${parseFloat(purchase.total_excluding_vat).toFixed(2)}</span></div>
            <div class="summary-row"><span>VAT (14%)</span><span>P${parseFloat(purchase.total_vat).toFixed(2)}</span></div>
            <div class="summary-row total-row"><span>TOTAL</span><span>P ${parseFloat(purchase.total_including_vat).toFixed(2)}</span></div>
          </div>
        </div>
        <div class="footer">
          <p>Date: ___________________________</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
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
                    {pendingCount > 0 && <span className="pending-stat">{pendingCount} pending</span>}
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
        }}>← Back</button>
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
                  {/* A4 INVOICE PREVIEW */}
                  <div className="a4-invoice-preview">
                    <div className="invoice-top">
                      <div className="invoice-supplier">
                        <h1 className="invoice-title">PURCHASE INVOICE</h1>
                        <div className="invoice-value bold">{purchase.supplier_name}</div>
                        {purchase.supplier_contact && <div className="invoice-value">{purchase.supplier_contact}</div>}
                        {purchase.supplier_email && <div className="invoice-value">{purchase.supplier_email}</div>}
                      </div>
                      <div className="invoice-meta">
                        <div className="invoice-meta-row">
                          <span className="invoice-meta-label">Invoice No:</span>
                          <span className="invoice-value">{purchase.invoice_number || '—'}</span>
                        </div>
                        <div className="invoice-meta-row">
                          <span className="invoice-meta-label">Date:</span>
                          <span className="invoice-value">{new Date(purchase.created_at).toLocaleDateString()}</span>
                        </div>
                        {purchase.notes && (
                          <div className="invoice-meta-row">
                            <span className="invoice-meta-label">Notes:</span>
                            <span className="invoice-value">{purchase.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Discount %</th>
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

                    <div className="invoice-summary">
                      <div className="invoice-summary-box">
                        <div className="summary-row">
                          <span>Line Discount Total</span>
                          <span>P{parseFloat(purchase.discount_total || 0).toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                          <span>Total Exclusive</span>
                          <span>P{parseFloat(purchase.total_excluding_vat).toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                          <span>VAT (14%)</span>
                          <span>P{parseFloat(purchase.total_vat).toFixed(2)}</span>
                        </div>
                        <div className="summary-row total-row">
                          <span>TOTAL</span>
                          <span>P{parseFloat(purchase.total_including_vat).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="invoice-footer">
                      <p>Date: ___________________________</p>
                    </div>

                    <div className="invoice-bar-print no-print">
                      <button className="btn-primary" onClick={() => printInvoice(purchase)}>
                        Print Invoice
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
  )
}

export default Suppliers