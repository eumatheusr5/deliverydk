import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { 
  Setting, 
  BusinessHours, 
  PaymentMethods, 
  DeliverySettings, 
  StoreInfo 
} from '@/types/database'

const SETTINGS_KEY = ['settings']

// Buscar todas as configurações
export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')

      if (error) throw error
      
      // Converter para objeto com chaves
      const settings: Record<string, Setting> = {}
      for (const s of (data as Setting[]) ?? []) {
        settings[s.key] = s
      }
      
      return settings
    },
  })
}

// Buscar configuração específica
export function useSetting<T>(key: string) {
  return useQuery({
    queryKey: [...SETTINGS_KEY, key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('key', key)
        .single()

      if (error) throw error
      return data as Setting & { value: T }
    },
  })
}

// Hooks específicos para cada configuração
export function useBusinessHours() {
  return useSetting<BusinessHours>('business_hours')
}

export function usePaymentMethods() {
  return useSetting<PaymentMethods>('payment_methods')
}

export function useDeliverySettings() {
  return useSetting<DeliverySettings>('delivery_settings')
}

export function useStoreInfo() {
  return useSetting<StoreInfo>('store_info')
}

// Atualizar configuração
export function useUpdateSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('settings')
        .update({ value } as never)
        .eq('key', key)
        .select()
        .single()

      if (error) throw error
      return data as Setting
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
      queryClient.invalidateQueries({ queryKey: [...SETTINGS_KEY, variables.key] })
    },
  })
}

// Verificar se está aberto agora
export function useIsStoreOpen() {
  const { data: businessHours } = useBusinessHours()
  const { data: storeInfo } = useStoreInfo()

  if (!businessHours || !storeInfo) return { isOpen: false, isLoading: true }

  // Verificar se está manualmente fechado
  if (!storeInfo.value.is_open) {
    return { isOpen: false, isLoading: false, reason: 'Fechado manualmente' }
  }

  const now = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const dayIndex = now.getDay()
  const today = dayNames[dayIndex] as keyof BusinessHours
  const hours = businessHours.value[today]

  if (!hours.enabled) {
    return { isOpen: false, isLoading: false, reason: 'Fechado hoje' }
  }

  const currentTime = now.getHours() * 60 + now.getMinutes()
  const openParts = hours.open.split(':').map(Number)
  const closeParts = hours.close.split(':').map(Number)
  const openH = openParts[0] ?? 0
  const openM = openParts[1] ?? 0
  const closeH = closeParts[0] ?? 0
  const closeM = closeParts[1] ?? 0
  
  const openTime = openH * 60 + openM
  let closeTime = closeH * 60 + closeM
  
  // Se fecha depois da meia-noite
  if (closeTime < openTime) {
    closeTime += 24 * 60
    if (currentTime < openTime) {
      // Estamos na madrugada do dia seguinte
      const adjustedCurrent = currentTime + 24 * 60
      if (adjustedCurrent >= openTime && adjustedCurrent < closeTime) {
        return { isOpen: true, isLoading: false }
      }
    }
  }

  if (currentTime >= openTime && currentTime < closeTime) {
    return { isOpen: true, isLoading: false }
  }

  return { 
    isOpen: false, 
    isLoading: false, 
    reason: `Abre às ${hours.open}` 
  }
}

