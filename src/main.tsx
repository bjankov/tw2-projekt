import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Element #root nije pronađen u index.html.')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
