import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { UserPlus, Eye, EyeOff, Store } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'
import { usePartnerStore } from '@/stores/partner-store'
import { useAuthStore } from '@/stores/auth-store'
import type { Partner, PartnerInsert } from '@/types/database'

const registerSchema = z.object({
  // Dados da loja
  store_name: z.string().min(2, 'Nome da loja deve ter pelo menos 2 caracteres'),
  store_slug: z
    .string()
    .min(3, 'Slug deve ter pelo menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  
  // Dados do proprietário
  owner_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  owner_email: z.string().email('Email inválido'),
  owner_phone: z.string().min(10, 'Telefone inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Senhas não conferem',
  path: ['confirm_password'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export function PartnerRegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const storeSlug = watch('store_slug')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    
    try {
      // Limpar qualquer sessão existente do localStorage para evitar conflitos
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
      localStorage.removeItem(storageKey)
      
      // 1. Criar usuário no Supabase Auth usando fetch diretamente
      // (bypass do SDK para evitar problemas de locking)
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      const signUpResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: data.owner_email,
          password: data.password,
        }),
      })
      
      const signUpResult = await signUpResponse.json()
      
      if (!signUpResponse.ok) {
        throw new Error(signUpResult.error_description || signUpResult.msg || 'Erro ao criar usuário')
      }
      
      if (!signUpResult.user?.id) {
        throw new Error('Usuário não foi criado')
      }
      
      const userId = signUpResult.user.id
      
      // Salvar a sessão no localStorage para o Supabase SDK usar
      if (signUpResult.access_token) {
        const sessionData = {
          access_token: signUpResult.access_token,
          refresh_token: signUpResult.refresh_token,
          expires_at: signUpResult.expires_at,
          expires_in: signUpResult.expires_in,
          token_type: signUpResult.token_type,
          user: signUpResult.user,
        }
        localStorage.setItem(storageKey, JSON.stringify(sessionData))
      }
      
      // Dar um momento para o SDK processar a nova sessão
      await new Promise(resolve => setTimeout(resolve, 100))

      // 2. Criar registro do parceiro (aprovação automática)
      const partnerInsertData: PartnerInsert = {
        user_id: userId,
        store_name: data.store_name,
        store_slug: data.store_slug,
        owner_name: data.owner_name,
        owner_email: data.owner_email,
        owner_phone: data.owner_phone,
        status: 'active',
      }

      // Usar fetch diretamente para evitar locks do SDK
      const insertResponse = await fetch(`${supabaseUrl}/rest/v1/partners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${signUpResult.access_token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(partnerInsertData),
      })
      
      let insertedPartner = null
      if (!insertResponse.ok) {
        const errorBody = await insertResponse.json()
        throw new Error(errorBody.message || 'Erro ao criar parceiro')
      } else {
        const insertResult = await insertResponse.json()
        insertedPartner = Array.isArray(insertResult) ? insertResult[0] : insertResult
      }

      // Carregar dados do parceiro no store
      if (insertedPartner) {
        const { setPartner } = usePartnerStore.getState()
        setPartner(insertedPartner as Partner)
      }
      
      // Setar sessão no auth store para que PartnerProtectedRoute funcione
      const { setSession, setUser, setLoading } = useAuthStore.getState()
      const sessionForStore = {
        access_token: signUpResult.access_token,
        refresh_token: signUpResult.refresh_token,
        expires_at: signUpResult.expires_at,
        expires_in: signUpResult.expires_in,
        token_type: signUpResult.token_type,
        user: signUpResult.user,
      }
      setSession(sessionForStore as any)
      setUser(signUpResult.user)
      setLoading(false)

      toast.success('Cadastro realizado com sucesso! Redirecionando para o painel...')
      navigate('/parceiro')

    } catch (err: unknown) {
      const error = err as { message?: string; code?: string }
      
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Este slug já está em uso. Escolha outro.')
      } else if (error.message?.includes('user_id')) {
        toast.error('Erro de autenticação. Tente novamente.')
      } else {
        toast.error(error.message || 'Erro ao realizar cadastro')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-2xl flex items-center justify-center">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Seja um Parceiro</h1>
          <p className="text-text-secondary mt-2">
            Crie sua loja e comece a vender
          </p>
        </div>

        {/* Form */}
        <div className="bg-background border border-border rounded-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Dados da Loja */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
                Dados da Loja
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1.5">Nome da Loja</label>
                <Input
                  placeholder="Minha Loja"
                  {...register('store_name')}
                  error={errors.store_name?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">URL da Loja (slug)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                    /cardapio/
                  </span>
                  <Input
                    placeholder="minha-loja"
                    className="pl-20"
                    {...register('store_slug')}
                    error={errors.store_slug?.message}
                  />
                </div>
                {storeSlug && (
                  <p className="text-xs text-text-secondary mt-1">
                    Seu cardápio: deliverydk.netlify.app/cardapio/{storeSlug}
                  </p>
                )}
              </div>
            </div>

            {/* Dados do Proprietário */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-medium text-sm text-text-secondary uppercase tracking-wider">
                Seus Dados
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1.5">Seu Nome</label>
                <Input
                  placeholder="João Silva"
                  {...register('owner_name')}
                  error={errors.owner_name?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  {...register('owner_email')}
                  error={errors.owner_email?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
                <Input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  {...register('owner_phone')}
                  error={errors.owner_phone?.message}
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

              <div>
                <label className="block text-sm font-medium mb-1.5">Confirmar Senha</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register('confirm_password')}
                  error={errors.confirm_password?.message}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Spinner size={18} className="mr-2" />
              ) : (
                <UserPlus size={18} className="mr-2" />
              )}
              Cadastrar
            </Button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-text-secondary">
            Já tem uma conta?{' '}
            <Link to="/parceiro/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

