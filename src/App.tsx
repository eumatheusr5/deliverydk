import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthInit } from '@/hooks/use-auth-init'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PartnerLayout } from '@/components/layout/partner-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { PartnerProtectedRoute } from '@/components/auth/partner-protected-route'

// Admin Pages
import { LoginPage } from '@/pages/login'
import { RegisterPage } from '@/pages/register'
import { DashboardPage } from '@/pages/dashboard'
import { ProductsPage } from '@/pages/products'
import { OrdersPage } from '@/pages/orders'
import { CustomersPage } from '@/pages/customers'
import { PartnersPage } from '@/pages/partners'
import { SettingsPage } from '@/pages/settings'

// Partner Pages
import { PartnerLoginPage } from '@/pages/partner/login'
import { PartnerRegisterPage } from '@/pages/partner/register'
import { PartnerDashboardPage } from '@/pages/partner/dashboard'
import { PartnerOrdersPage } from '@/pages/partner/orders'
import { PartnerProductsPage } from '@/pages/partner/products'
import { PartnerPersonalizationPage } from '@/pages/partner/personalization'

// Public Pages
import { PublicMenuPage } from '@/pages/menu'

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
      {/* Public Menu Route */}
      <Route path="/cardapio/:slug" element={<PublicMenuPage />} />

      {/* Admin Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Partner Auth Routes */}
      <Route path="/parceiro/login" element={<PartnerLoginPage />} />
      <Route path="/parceiro/cadastro" element={<PartnerRegisterPage />} />

      {/* Partner Protected Routes */}
      <Route
        element={
          <PartnerProtectedRoute>
            <PartnerLayout />
          </PartnerProtectedRoute>
        }
      >
        <Route path="/parceiro" element={<PartnerDashboardPage />} />
        <Route path="/parceiro/pedidos" element={<PartnerOrdersPage />} />
        <Route path="/parceiro/produtos" element={<PartnerProductsPage />} />
        <Route path="/parceiro/personalizacao" element={<PartnerPersonalizationPage />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/produtos" element={<ProductsPage />} />
        <Route path="/clientes" element={<CustomersPage />} />
        <Route path="/parceiros" element={<PartnersPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
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
