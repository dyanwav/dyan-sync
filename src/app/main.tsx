import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import App from './App'

import { TooltipProvider } from '@/shared/ui/tooltip'
import { I18nProvider } from '@/features/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </I18nProvider>
  </StrictMode>,
)
