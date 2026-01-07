import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { LogIn, Eye, EyeOff, Store } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { usePartnerStore } from '@/stores/partner-store'
import { useAuthStore } from '@/stores/auth-store'
import type { Partner } from '@/types/database'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function PartnerLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { fetchPartner } = usePartnerStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
      
      // Limpar sessão anterior
      localStorage.removeItem(storageKey)
      
      // Login via fetch direto para evitar locks do SDK
      const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      })
      
      const loginResult = await loginResponse.json()
      
      if (!loginResponse.ok) {
        throw new Error(loginResult.error_description || loginResult.msg || 'Email ou senha inválidos')
      }
      
      if (!loginResult.user?.id) {
        throw new Error('Erro ao fazer login')
      }
      
      const userId = loginResult.user.id
      
      // Salvar a sessão no localStorage
      if (loginResult.access_token) {
        const sessionData = {
          access_token: loginResult.access_token,
          refresh_token: loginResult.refresh_token,
          expires_at: loginResult.expires_at,
          expires_in: loginResult.expires_in,
          token_type: loginResult.token_type,
          user: loginResult.user,
        }
        localStorage.setItem(storageKey, JSON.stringify(sessionData))
      }

      // Buscar dados do parceiro via fetch direto
      const partnerResponse = await fetch(
        `${supabaseUrl}/rest/v1/partners?user_id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${loginResult.access_token}`,
          },
        }
      )
      
      const partnerResult = await partnerResponse.json()
      
      if (!partnerResponse.ok || !partnerResult.length) {
        localStorage.removeItem(storageKey)
        throw new Error('Esta conta não é de um parceiro. Use o login de administrador.')
      }
      
      const partnerData = partnerResult[0] as Partner

      // Verificar status do parceiro
      if (partnerData.status === 'blocked') {
        localStorage.removeItem(storageKey)
        throw new Error('Sua conta foi bloqueada. Entre em contato com o suporte.')
      }

      if (partnerData.status === 'pending') {
        localStorage.removeItem(storageKey)
        throw new Error('Sua conta ainda está em análise. Aguarde a aprovação.')
      }

      if (partnerData.status === 'deleted') {
        localStorage.removeItem(storageKey)
        throw new Error('Esta conta foi excluída.')
      }

      // Setar parceiro no store
      const { setPartner } = usePartnerStore.getState()
      setPartner(partnerData)
      
      // Setar sessão no auth store
      const { setSession, setUser, setLoading } = useAuthStore.getState()
      const sessionForStore = {
        access_token: loginResult.access_token,
        refresh_token: loginResult.refresh_token,
        expires_at: loginResult.expires_at,
        expires_in: loginResult.expires_in,
        token_type: loginResult.token_type,
        user: loginResult.user,
      }
      setSession(sessionForStore as any)
      setUser(loginResult.user)
      setLoading(false)

      toast.success('Login realizado com sucesso!')
      navigate('/parceiro')
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string }

      // Caso legado de confirmação de email
      const msg = error.message?.toLowerCase() ?? ''
      if (error.code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
        toast.error('Seu e-mail estava marcado como não confirmado. Tente novamente.')
        return
      }

      toast.error(error.message || 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-2xl flex items-center justify-center">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Portal do Parceiro</h1>
          <p className="text-text-secondary mt-2">Acesse sua conta para gerenciar sua loja</p>
        </div>

        {/* Form */}
        <div className="bg-background border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                error={errors.email?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Spinner size={18} className="mr-2" />
              ) : (
                <LogIn size={18} className="mr-2" />
              )}
              Entrar
            </Button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-text-secondary">
            Não tem uma conta?{' '}
            <Link to="/parceiro/cadastro" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>
          <p className="text-sm text-text-secondary">
            <Link to="/" className="text-primary hover:underline">
              Voltar ao site
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

