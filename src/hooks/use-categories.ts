import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category, CategoryInsert, CategoryUpdate } from '@/types/database'

const CATEGORIES_KEY = ['categories']

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Category[]
    },
  })
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, id],
    queryFn: async () => {
      if (!id) return null
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Category
    },
    enabled: !!id,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (category: CategoryInsert) => {
      // Pegar o maior sort_order atual
      const { data: existing } = await supabase
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)

      const maxOrder = (existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1
      const newSortOrder = maxOrder + 1

      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, sort_order: newSortOrder } as never)
        .select()
        .single()

      if (error) throw error
      return data as Category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...category }: CategoryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(category as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categories: { id: string; sort_order: number }[]) => {
      const promises = categories.map(({ id, sort_order }) =>
        supabase
          .from('categories')
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
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}

export function useToggleCategoryStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('categories')
        .update({ is_active } as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}
