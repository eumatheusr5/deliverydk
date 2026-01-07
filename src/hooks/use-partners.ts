import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getAccessToken } from '@/lib/supabase'
import type { 
  Partner, 
  PartnerInsert, 
  PartnerUpdate, 
  PartnerStatus,
  PartnerProduct,
  PartnerProductInsert,
  PartnerProductUpdate,
  PartnerProductWithDetails,
  Product
} from '@/types/database'

const PARTNERS_KEY = ['partners']
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// =============================================
// PARTNERS HOOKS
// =============================================

export function usePartners(status?: PartnerStatus | 'all') {
  return useQuery({
    queryKey: status ? [...PARTNERS_KEY, status] : PARTNERS_KEY,
    queryFn: async () => {
      const token = getAccessToken()
      let url = `${supabaseUrl}/rest/v1/partners?select=*&order=created_at.desc`

      if (status && status !== 'all') {
        url += `&status=eq.${status}`
      } else {
        url += `&status=neq.deleted`
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao buscar parceiros')
      }

      return response.json() as Promise<Partner[]>
    },
  })
}

export function usePartner(id: string | undefined) {
  return useQuery({
    queryKey: [...PARTNERS_KEY, id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Partner
    },
    enabled: !!id,
  })
}

export function usePartnerBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: [...PARTNERS_KEY, 'slug', slug],
    queryFn: async () => {
      if (!slug) return null

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('store_slug', slug)
        .eq('status', 'active')
        .single()

      if (error) throw error
      return data as Partner
    },
    enabled: !!slug,
  })
}

export function useCreatePartner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (partner: PartnerInsert) => {
      const { data, error } = await supabase
        .from('partners')
        .insert(partner as never)
        .select()
        .single()

      if (error) throw error
      return data as Partner
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_KEY })
    },
  })
}

export function useUpdatePartner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...partner }: PartnerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('partners')
        .update(partner as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Partner
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_KEY })
    },
  })
}

export function useUpdatePartnerStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PartnerStatus }) => {
      const { data, error } = await supabase
        .from('partners')
        .update({ status } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Partner
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_KEY })
    },
  })
}

export function useDeletePartner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - apenas marca como deleted
      const { error } = await supabase
        .from('partners')
        .update({ status: 'deleted' } as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_KEY })
    },
  })
}

// =============================================
// PARTNER PRODUCTS HOOKS (MARGENS)
// =============================================

const PARTNER_PRODUCTS_KEY = ['partner-products']

export function usePartnerProducts(partnerId: string | undefined) {
  return useQuery({
    queryKey: [...PARTNER_PRODUCTS_KEY, partnerId],
    queryFn: async () => {
      if (!partnerId) return []

      // Buscar produtos do parceiro
      const { data: partnerProducts, error: ppError } = await supabase
        .from('partner_products')
        .select('*')
        .eq('partner_id', partnerId)

      if (ppError) throw ppError

      // Buscar detalhes dos produtos
      const { data: products, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)

      if (pError) throw pError

      const productsList = (products as Product[]) ?? []
      const partnerProductsList = (partnerProducts as PartnerProduct[]) ?? []

      // Combinar dados
      const result: PartnerProductWithDetails[] = partnerProductsList.map(pp => {
        const product = productsList.find(p => p.id === pp.product_id)
        if (!product) return null

        const margin = pp.selling_price - product.price
        const marginPercent = (margin / product.price) * 100

        return {
          ...pp,
          product,
          margin,
          margin_percent: marginPercent,
        }
      }).filter(Boolean) as PartnerProductWithDetails[]

      return result
    },
    enabled: !!partnerId,
  })
}

// Produtos disponíveis para o parceiro configurar (que ainda não foram configurados)
export function useAvailableProducts(partnerId: string | undefined) {
  return useQuery({
    queryKey: [...PARTNER_PRODUCTS_KEY, partnerId, 'available'],
    queryFn: async () => {
      if (!partnerId) return []

      // Buscar todos os produtos ativos
      const { data: products, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)

      if (pError) throw pError

      // Buscar produtos já configurados pelo parceiro
      const { data: partnerProducts, error: ppError } = await supabase
        .from('partner_products')
        .select('product_id')
        .eq('partner_id', partnerId)

      if (ppError) throw ppError

      const configuredIds = new Set((partnerProducts ?? []).map(pp => (pp as { product_id: string }).product_id))
      
      // Retornar apenas os não configurados
      return ((products as Product[]) ?? []).filter(p => !configuredIds.has(p.id))
    },
    enabled: !!partnerId,
  })
}

export function useCreatePartnerProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (partnerProduct: PartnerProductInsert) => {
      const { data, error } = await supabase
        .from('partner_products')
        .insert(partnerProduct as never)
        .select()
        .single()

      if (error) throw error
      return data as PartnerProduct
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...PARTNER_PRODUCTS_KEY, variables.partner_id] })
    },
  })
}

export function useUpdatePartnerProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, partnerId, ...data }: PartnerProductUpdate & { id: string; partnerId: string }) => {
      const { data: result, error } = await supabase
        .from('partner_products')
        .update(data as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...(result as PartnerProduct), partnerId } as PartnerProduct & { partnerId: string }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PARTNER_PRODUCTS_KEY, data.partnerId] })
    },
  })
}

export function useDeletePartnerProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, partnerId }: { id: string; partnerId: string }) => {
      const { error } = await supabase
        .from('partner_products')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { partnerId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PARTNER_PRODUCTS_KEY, data.partnerId] })
    },
  })
}

// =============================================
// ESTATÍSTICAS DO PARCEIRO
// =============================================

export function usePartnerStats(partnerId: string | undefined) {
  return useQuery({
    queryKey: [...PARTNERS_KEY, partnerId, 'stats'],
    queryFn: async () => {
      if (!partnerId) return null

      // Buscar pedidos do parceiro
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('partner_id', partnerId)

      if (error) throw error

      const ordersList = (orders as { id: string; total: number; status: string; created_at: string }[]) ?? []

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const stats = {
        totalOrders: ordersList.length,
        totalRevenue: ordersList.reduce((acc, o) => acc + (o.total || 0), 0),
        ordersToday: ordersList.filter(o => new Date(o.created_at) >= today).length,
        revenueToday: ordersList
          .filter(o => new Date(o.created_at) >= today)
          .reduce((acc, o) => acc + (o.total || 0), 0),
        pendingOrders: ordersList.filter(o => 
          ['pending', 'confirmed', 'preparing'].includes(o.status)
        ).length,
      }

      return stats
    },
    enabled: !!partnerId,
  })
}

