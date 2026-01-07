import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

// Função auxiliar para obter sessão do localStorage (fallback quando SDK trava)
function getSessionFromStorage(): { session: any; user: any } | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
    const storedSession = localStorage.getItem(storageKey)
    
    if (storedSession) {
      const parsed = JSON.parse(storedSession)
      if (parsed.access_token && parsed.user) {
        return { session: parsed, user: parsed.user }
      }
    }
  } catch {
    // Ignorar erros de parse
  }
  return null
}

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    let mounted = true
    let timeoutId: ReturnType<typeof setTimeout>

    async function initAuth() {
      // Primeiro, tentar obter sessão do localStorage (rápido, não trava)
      const storedData = getSessionFromStorage()
      
      if (storedData) {
        if (!mounted) return
        setSession(storedData.session)
        setUser(storedData.user)
        
        // Buscar profile via fetch direto
        if (storedData.user?.id && storedData.session?.access_token) {
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
            
            const profileResponse = await fetch(
              `${supabaseUrl}/rest/v1/profiles?id=eq.${storedData.user.id}&select=*`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': supabaseAnonKey,
                  'Authorization': `Bearer ${storedData.session.access_token}`,
                },
              }
            )

            if (profileResponse.ok && mounted) {
              const profileData = await profileResponse.json()
              if (profileData && profileData.length > 0) {
                setProfile(profileData[0])
              }
            }
          } catch {
            // Ignorar erros ao buscar profile
          }
        }
        
        if (!mounted) return
        setLoading(false)
        return
      }
      
      // Se não houver sessão no storage, tentar via SDK com timeout
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), 3000) // 3 segundos de timeout
      })
      
      const result = await Promise.race([sessionPromise, timeoutPromise])
      
      if (!mounted) return
      
      if (result && 'data' in result) {
        clearTimeout(timeoutId)
        const { data: { session } } = result
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!mounted) return

            if (!error && data) {
              setProfile(data)
            }
          } catch (err) {
            console.error('Error fetching profile:', err)
          }
        }
      }
      
      if (!mounted) return
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (event === 'SIGNED_IN' && session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!mounted) return

        if (!error && data) {
          setProfile(data)
        }
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        reset()
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [setSession, setUser, setProfile, setLoading, reset])
}

