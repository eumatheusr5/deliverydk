import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function useAuth() {
  const { user, session, profile, isLoading } = useAuthStore()

  async function signIn(email: string, password: string) {
    // Usar fetch direto para evitar problemas de locking do SDK
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error_description || errorData.msg || 'Erro ao fazer login')
    }

    const data = await response.json()

    // Salvar sessão manualmente no localStorage
    const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
    localStorage.setItem(storageKey, JSON.stringify(data))

    // Verificar se é um parceiro tentando logar no admin
    const partnerResponse = await fetch(
      `${supabaseUrl}/rest/v1/partners?user_id=eq.${data.user.id}&select=id`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${data.access_token}`,
        },
      }
    )

    if (partnerResponse.ok) {
      const partnerData = await partnerResponse.json()
      if (partnerData && partnerData.length > 0) {
        // É um parceiro, limpar sessão e informar
        localStorage.removeItem(storageKey)
        throw new Error('Esta conta é de um parceiro. Use o Portal do Parceiro para fazer login.')
      }
    }

    // Buscar profile
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${data.user.id}&select=*`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${data.access_token}`,
        },
      }
    )

    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      if (profileData && profileData.length > 0) {
        useAuthStore.getState().setProfile(profileData[0])
      }
    }

    // Atualizar stores
    useAuthStore.getState().setSession(data)
    useAuthStore.getState().setUser(data.user)
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    user,
    session,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
  }
}
