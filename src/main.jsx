// Monta a aplicação no elemento root com as verificações do StrictMode.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './assets/fonts/fontes.css'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
