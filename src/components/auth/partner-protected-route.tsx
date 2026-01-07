import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { usePartnerStore } from '@/stores/partner-store'
import { Spinner } from '@/components/ui/spinner'

interface PartnerProtectedRouteProps {
  children: React.ReactNode
}

export function PartnerProtectedRoute({ children }: PartnerProtectedRouteProps) {
  const { session, isLoading: authLoading } = useAuthStore()
  const { partner, isLoading: partnerLoading, fetchPartner, error } = usePartnerStore()

  useEffect(() => {
    if (session?.user && !partner && !partnerLoading) {
      fetchPartner(session.user.id)
    }
  }, [session, partner, partnerLoading, fetchPartner])

  if (authLoading || partnerLoading) {
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
    return <Navigate to="/parceiro/login" replace />
  }

  // Se o parceiro não foi encontrado ou está bloqueado
  if (error || (partner && partner.status === 'blocked')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-text-secondary mb-4">
            {partner?.status === 'blocked' 
              ? 'Sua conta foi bloqueada. Entre em contato com o suporte.'
              : 'Você não tem acesso ao portal de parceiros.'}
          </p>
          <a href="/parceiro/login" className="text-primary hover:underline">
            Voltar ao login
          </a>
        </div>
      </div>
    )
  }

  // Se o parceiro está pendente
  if (partner?.status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-warning/10 rounded-full flex items-center justify-center">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Aguardando Aprovação</h2>
          <p className="text-text-secondary mb-4">
            Seu cadastro está sendo analisado. Você receberá uma notificação quando for aprovado.
          </p>
          <a href="/parceiro/login" className="text-primary hover:underline">
            Voltar
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

