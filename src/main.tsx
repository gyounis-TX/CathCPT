import React from 'react'
import ReactDOM from 'react-dom/client'
import './storage' // Initialize window.storage polyfill before app loads
import './index.css'
import CardiologyCPTApp from './CardiologyCPTApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CardiologyCPTApp />
  </React.StrictMode>,
)
