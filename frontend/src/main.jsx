import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fontes locais carregadas por CSS, sem biblioteca de fontes.
import './assets/fonts/fontes.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
