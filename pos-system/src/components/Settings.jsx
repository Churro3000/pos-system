import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, Trash2, Settings as SettingsIcon, Image } from 'lucide-react'

function Settings() {
  const [receiptLogo, setReceiptLogo] = useState(null)
  const [receiptLogoShape, setReceiptLogoShape] = useState('square')
  const [invoiceLogo, setInvoiceLogo] = useState(null)
  const [invoiceLogoShape, setInvoiceLogoShape] = useState('square')
  const [uploading, setUploading] = useState(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const receiptInputRef = useRef(null)
  const invoiceInputRef = useRef(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const { data } = await supabase.storage.from('logos').list('')
      if (!data) return

      const receiptFile = data.find(f => f.name.startsWith('receipt-logo'))
      const invoiceFile = data.find(f => f.name.startsWith('invoice-logo'))

      if (receiptFile) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(receiptFile.name)
        setReceiptLogo(urlData.publicUrl)
      }
      if (invoiceFile) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(invoiceFile.name)
        setInvoiceLogo(urlData.publicUrl)
      }
    } catch (e) {}

    const rShape = localStorage.getItem('receiptLogoShape')
    const iShape = localStorage.getItem('invoiceLogoShape')
    if (rShape) setReceiptLogoShape(rShape)
    if (iShape) setInvoiceLogoShape(iShape)
  }

  async function uploadLogo(file, type) {
    if (!file) return
    setUploading(type)

    const ext = file.name.split('.').pop()
    const filename = `${type}-logo.${ext}`

    // Delete old logo first
    const { data: existing } = await supabase.storage.from('logos').list('')
    if (existing) {
      const old = existing.find(f => f.name.startsWith(`${type}-logo`))
      if (old) await supabase.storage.from('logos').remove([old.name])
    }

    const { error } = await supabase.storage.from('logos').upload(filename, file, { upsert: true })

    if (error) {
      setMessage('Error uploading logo: ' + error.message)
      setMessageType('error')
    } else {
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filename)
      if (type === 'receipt') {
        setReceiptLogo(urlData.publicUrl)
        localStorage.setItem('receiptLogoUrl', urlData.publicUrl)
      } else {
        setInvoiceLogo(urlData.publicUrl)
        localStorage.setItem('invoiceLogoUrl', urlData.publicUrl)
      }
      setMessage(`${type === 'receipt' ? 'Receipt' : 'Invoice'} logo uploaded!`)
      setMessageType('success')

      // Broadcast to other components
      window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { type, url: urlData.publicUrl } }))
    }
    setUploading(null)
  }

  async function removeLogo(type) {
    if (!window.confirm('Remove this logo?')) return
    const { data: existing } = await supabase.storage.from('logos').list('')
    if (existing) {
      const old = existing.find(f => f.name.startsWith(`${type}-logo`))
      if (old) await supabase.storage.from('logos').remove([old.name])
    }
    if (type === 'receipt') {
      setReceiptLogo(null)
      localStorage.removeItem('receiptLogoUrl')
    } else {
      setInvoiceLogo(null)
      localStorage.removeItem('invoiceLogoUrl')
    }
    window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { type, url: null } }))
    setMessage(`${type === 'receipt' ? 'Receipt' : 'Invoice'} logo removed!`)
    setMessageType('success')
  }

  function handleShapeChange(type, shape) {
    if (type === 'receipt') {
      setReceiptLogoShape(shape)
      localStorage.setItem('receiptLogoShape', shape)
    } else {
      setInvoiceLogoShape(shape)
      localStorage.setItem('invoiceLogoShape', shape)
    }
    window.dispatchEvent(new CustomEvent('logoShapeUpdated', { detail: { type, shape } }))
  }

  return (
    <div className="panel">
      <h2>Settings</h2>
      <p className="hint">Configure your store logos and preferences.</p>

      {message && <p className={`message ${messageType}`}>{message}</p>}

      {/* RECEIPT LOGO */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Image size={18} />
          <h3>Receipt Logo</h3>
        </div>
        <p className="hint">This logo appears at the top of printed receipts.</p>

        <div className="logo-upload-area">
          {receiptLogo ? (
            <div className="logo-preview-wrap">
              <img
                src={receiptLogo}
                alt="Receipt Logo"
                className={`logo-preview ${receiptLogoShape === 'rectangle' ? 'logo-rect' : 'logo-square'}`}
              />
              <div className="logo-preview-actions">
                <button className="btn-secondary btn-small" onClick={() => receiptInputRef.current.click()}>
                  <Upload size={13} /> Replace
                </button>
                <button className="remove-btn" onClick={() => removeLogo('receipt')}>
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="logo-upload-placeholder" onClick={() => receiptInputRef.current.click()}>
              <Upload size={28} />
              <p>Click to upload receipt logo</p>
              <span>PNG, JPG, SVG recommended</span>
            </div>
          )}
          <input
            ref={receiptInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => uploadLogo(e.target.files[0], 'receipt')}
          />
          {uploading === 'receipt' && <p className="hint">Uploading...</p>}
        </div>

        <div className="settings-toggle-row">
          <span>Logo Shape:</span>
          <div className="shape-toggle">
            <button
              className={receiptLogoShape === 'square' ? 'active' : ''}
              onClick={() => handleShapeChange('receipt', 'square')}
            >
              Square
            </button>
            <button
              className={receiptLogoShape === 'rectangle' ? 'active' : ''}
              onClick={() => handleShapeChange('receipt', 'rectangle')}
            >
              Rectangle
            </button>
          </div>
        </div>
      </div>

      {/* INVOICE / QUOTATION LOGO */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Image size={18} />
          <h3>Invoice & Quotation Logo</h3>
        </div>
        <p className="hint">This logo appears on Purchase invoices and Quotations.</p>

        <div className="logo-upload-area">
          {invoiceLogo ? (
            <div className="logo-preview-wrap">
              <img
                src={invoiceLogo}
                alt="Invoice Logo"
                className={`logo-preview ${invoiceLogoShape === 'rectangle' ? 'logo-rect' : 'logo-square'}`}
              />
              <div className="logo-preview-actions">
                <button className="btn-secondary btn-small" onClick={() => invoiceInputRef.current.click()}>
                  <Upload size={13} /> Replace
                </button>
                <button className="remove-btn" onClick={() => removeLogo('invoice')}>
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="logo-upload-placeholder" onClick={() => invoiceInputRef.current.click()}>
              <Upload size={28} />
              <p>Click to upload invoice/quotation logo</p>
              <span>PNG, JPG, SVG recommended</span>
            </div>
          )}
          <input
            ref={invoiceInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => uploadLogo(e.target.files[0], 'invoice')}
          />
          {uploading === 'invoice' && <p className="hint">Uploading...</p>}
        </div>

        <div className="settings-toggle-row">
          <span>Logo Shape:</span>
          <div className="shape-toggle">
            <button
              className={invoiceLogoShape === 'square' ? 'active' : ''}
              onClick={() => handleShapeChange('invoice', 'square')}
            >
              Square
            </button>
            <button
              className={invoiceLogoShape === 'rectangle' ? 'active' : ''}
              onClick={() => handleShapeChange('invoice', 'rectangle')}
            >
              Rectangle
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings