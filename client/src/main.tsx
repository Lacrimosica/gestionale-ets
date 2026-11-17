import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import './index.css'
import './i18n'
import { IS_DEMO } from './config'
import DemoBanner from './components/DemoBanner'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        {IS_DEMO && <DemoBanner />}
        <App />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>,
)
