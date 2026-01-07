import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthInit } from '@/hooks/use-auth-init'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LoginPage } from '@/pages/login'
import { RegisterPage } from '@/pages/register'
import { DashboardPage } from '@/pages/dashboard'
import { ProductsPage } from '@/pages/products'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function AppRoutes() {
  useAuthInit()

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/produtos" element={<ProductsPage />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster 
        position="top-right" 
        richColors 
        toastOptions={{
          style: {
            borderRadius: '0.5rem',
          },
        }}
      />
    </QueryClientProvider>
  )
}
