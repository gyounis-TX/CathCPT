import React from 'react'
import ReactDOM from 'react-dom/client'
import './storage' // Initialize window.storage polyfill before app loads
import './index.css'
import { initializeSentry } from './services/sentryConfig'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'

// Initialize Sentry before rendering
initializeSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
