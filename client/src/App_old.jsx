import React, { useEffect, useState } from 'react'
import AdminLayout from './components/admin/AdminLayout'

export default function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(setHealth)
      .catch(err => setError(err.message))
  }, [])

  // Simple admin access for demonstration
  if (showAdmin) {
    return <AdminLayout />
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>SmartDockAI</h1>
      <p>Welcome to the React frontend.</p>
      
      <button 
        onClick={() => setShowAdmin(true)}
        style={{ 
          marginBottom: 24, 
          padding: '8px 16px', 
          background: '#2563eb', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🔧 Open Admin Dashboard
      </button>
      
      <section>
        <h2>Backend Health</h2>
        {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
        <pre style={{ background: '#f6f8fa', padding: 12 }}>
          {health ? JSON.stringify(health, null, 2) : 'Loading...'}
        </pre>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>SmartDockAI Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3>📄 Document Management</h3>
            <p>Upload, process, and manage documents with AI-powered analysis</p>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3>🔍 OCR Processing</h3>
            <p>Extract text from images and PDFs with high accuracy OCR</p>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3>✍️ Handwriting Recognition</h3>
            <p>Intelligent character recognition for handwritten documents</p>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3>🧠 Document Intelligence</h3>
            <p>ML-powered document classification, extraction, and routing</p>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3>📊 NLP Analysis</h3>
            <p>Natural language processing for sentiment analysis and entity extraction</p>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
            <h3>🗄️ Model Registry</h3>
            <p>Centralized machine learning model management and versioning</p>
          </div>
        </div>
      </section>
    </div>
  )
}
