import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n';
import ErrorBoundary from './components/ErrorBoundary.tsx';

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback="loading...">
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster richColors position="top-center" />
        </QueryClientProvider>
      </ErrorBoundary>
    </Suspense>
  </React.StrictMode>,
)