import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import { handleDomainMove } from './lib/domainMove.js'

// The old address forwards to the new one (with saved plans); see domainMove.js.
if (!handleDomainMove()) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
      <Analytics />
    </StrictMode>,
  )
}
