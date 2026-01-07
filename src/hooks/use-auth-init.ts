import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'

export function useAuthInit() {
  const { setUser, setSession, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!mounted) return
      
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
      subscription.unsubscribe()
    }
  }, [setSession, setUser, setProfile, setLoading, reset])
}

