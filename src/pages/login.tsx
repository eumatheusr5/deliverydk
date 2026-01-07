import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Package } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const { session, profile, isLoading: authLoading } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  if (authLoading) {
    return null
  }

  // Só redireciona se tiver sessão E perfil de admin/manager
  if (session && profile && (profile.role === 'admin' || profile.role === 'manager')) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    try {
      await signIn(data.email, data.password)
      toast.success('Login realizado com sucesso!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl mb-4">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">DeliveryDK</h1>
          <p className="text-text-secondary mt-1">Faça login para continuar</p>
        </div>

        {/* Form */}
        <div className="bg-background border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-text-secondary">Não tem uma conta? </span>
            <Link to="/register" className="text-accent hover:text-accent-hover font-medium">
              Cadastre-se
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
