import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { usePartnerStore } from '@/stores/partner-store'
import { Spinner } from '@/components/ui/spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuthStore()
  const { partner } = usePartnerStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <Spinner size={32} />
          <p className="mt-3 text-sm text-text-secondary">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Se é um parceiro logado, redireciona para o portal de parceiros
  if (partner && !profile) {
    return <Navigate to="/parceiro" replace />
  }

  // Se não tem perfil de admin, redireciona para login
  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    // Se for parceiro, vai para o portal de parceiros
    if (partner) {
      return <Navigate to="/parceiro" replace />
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

