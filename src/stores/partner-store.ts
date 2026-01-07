import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Partner } from '@/types/database'

interface PartnerState {
  partner: Partner | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchPartner: (userId: string) => Promise<void>
  setPartner: (partner: Partner | null) => void
  clearPartner: () => void
  logout: () => void
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set) => ({
      partner: null,
      isLoading: false,
      error: null,

      fetchPartner: async (userId: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase
            .from('partners')
            .select('*')
            .eq('user_id', userId)
            .single()

          if (error) throw error

          set({ partner: data as Partner, isLoading: false })
        } catch (err) {
          console.error('Error fetching partner:', err)
          set({ 
            partner: null, 
            isLoading: false, 
            error: 'Parceiro não encontrado' 
          })
        }
      },

      setPartner: (partner) => set({ partner }),
      
      clearPartner: () => set({ partner: null, error: null }),
      
      logout: () => {
        supabase.auth.signOut()
        set({ partner: null, error: null })
      },
    }),
    {
      name: 'partner-storage',
      partialize: (state) => ({ partner: state.partner }),
    }
  )
)

