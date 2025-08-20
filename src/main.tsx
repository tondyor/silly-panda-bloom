import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
// import { Toaster } from "@/components/ui/sonner" // Удаляем импорт Toaster
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n';

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback="loading...">
      <QueryClientProvider client={queryClient}>
        <App />
        {/* <Toaster richColors position="top-center" /> */} {/* Удаляем компонент Toaster */}
      </QueryClientProvider>
    </Suspense>
  </React.StrictMode>,
)