import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PopUp from './Popup.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopUp />
  </StrictMode>,
)
