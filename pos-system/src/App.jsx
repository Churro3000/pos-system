import { useState } from 'react'
import Inventory from './components/Inventory'
import Checkout from './components/Checkout'
import Dashboard from './components/Dashboard'
import Sales from './components/Sales'
import Purchase from './components/Purchase'
import Quotation from './components/Quotation'
import './App.css'

function App() {
  const [mode, setMode] = useState('checkout')

  const tabs = [
    { id: 'checkout', label: '🛒 Checkout' },
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'purchase', label: '🧾 Purchase' },
    { id: 'quotation', label: '📋 Quotation' },
    { id: 'sales', label: '📈 Sales' },
    { id: 'dashboard', label: '📊 Dashboard' },
  ]

  return (
    <div className="app">
      <header>
        <h1>🏪 POS System</h1>
        <nav className="mode-toggle">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={mode === tab.id ? 'active' : ''}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {mode === 'inventory' && <Inventory />}
        {mode === 'checkout' && <Checkout />}
        {mode === 'purchase' && <Purchase />}
        {mode === 'quotation' && <Quotation />}
        {mode === 'sales' && <Sales />}
        {mode === 'dashboard' && <Dashboard />}
      </main>
    </div>
  )
}

export default App