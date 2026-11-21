import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { initRipple } from './lib/ripple'
import { initCheckboxPop } from './lib/motion'
import { initSettings } from './lib/settings'

// antes del primer render: las animaciones reducidas (ajuste del dispositivo) valen desde el primer fotograma
initSettings()
initRipple()
initCheckboxPop()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
