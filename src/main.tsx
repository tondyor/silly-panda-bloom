import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { Toaster } from "@/components/ui/sonner"
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback="loading...">
      <App />
      <Toaster richColors position="top-center" />
    </Suspense>
  </React.StrictMode>,
)