import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// NOWOŚĆ: Import rejestratora Service Workera z wtyczki Vite PWA
import { registerSW } from 'virtual:pwa-register'

// Uruchamiamy Service Workera, który natychmiast zapisze pliki w pamięci telefonu/przeglądarki
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)