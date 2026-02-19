import React from 'react'
import ReactDOM from 'react-dom/client'
import './storage' // Initialize window.storage polyfill before app loads
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
