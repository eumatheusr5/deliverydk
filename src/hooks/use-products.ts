import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getAccessToken } from '@/lib/supabase'
import type { Product, ProductInsert, ProductUpdate } from '@/types/database'

const PRODUCTS_KEY = ['products']
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function useProducts(categoryId?: string) {
  return useQuery({
    queryKey: categoryId ? [...PRODUCTS_KEY, categoryId] : PRODUCTS_KEY,
    queryFn: async () => {
      const token = getAccessToken()
      let url = `${supabaseUrl}/rest/v1/products?select=*&order=sort_order.asc`
      
      if (categoryId) {
        url += `&category_id=eq.${categoryId}`
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
        throw new Error(error.message || 'Erro ao buscar produtos')
      }

      return response.json() as Promise<Product[]>
    },
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Product
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      // Pegar o maior sort_order da categoria
      const { data: existing } = await supabase
        .from('products')
        .select('sort_order')
        .eq('category_id', product.category_id)
        .order('sort_order', { ascending: false })
        .limit(1)

      const maxOrder = (existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1
      const newSortOrder = maxOrder + 1

      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, sort_order: newSortOrder } as never)
        .select()
        .single()

      if (error) throw error
      return data as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...product }: ProductUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(product as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

export function useReorderProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (products: { id: string; sort_order: number }[]) => {
      const promises = products.map(({ id, sort_order }) =>
        supabase
          .from('products')
          .update({ sort_order } as never)
          .eq('id', id)
      )

      const results = await Promise.all(promises)
      const errors = results.filter((r) => r.error)

      if (errors.length > 0) {
        throw errors[0]?.error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}

export function useToggleProductStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active } as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY })
    },
  })
}
