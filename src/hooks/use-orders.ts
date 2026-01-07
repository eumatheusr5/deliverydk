import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Order, OrderInsert, OrderUpdate, OrderItem, OrderStatus, OrderWithItems } from '@/types/database'

const ORDERS_KEY = ['orders']

type OrderRow = {
  id: string
  order_number: number
  customer_name: string
  customer_phone: string
  customer_address: string | null
  delivery_type: 'delivery' | 'pickup'
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix'
  status: OrderStatus
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
}

export function useOrders(status?: OrderStatus | 'active') {
  return useQuery({
    queryKey: status ? [...ORDERS_KEY, status] : ORDERS_KEY,
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (status === 'active') {
        query = query.in('status', ['pending', 'confirmed', 'preparing', 'ready', 'delivering'])
      } else if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Order[]
    },
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...ORDERS_KEY, id],
    queryFn: async () => {
      if (!id) return null

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (orderError) throw orderError

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id)

      if (itemsError) throw itemsError

      const typedOrder = order as OrderRow
      return { ...typedOrder, items: items as OrderItem[] } as OrderWithItems
    },
    enabled: !!id,
  })
}

export function useOrderItems(orderId: string | undefined) {
  return useQuery({
    queryKey: [...ORDERS_KEY, orderId, 'items'],
    queryFn: async () => {
      if (!orderId) return []

      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)

      if (error) throw error
      return (data ?? []) as OrderItem[]
    },
    enabled: !!orderId,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (order: OrderInsert & { items?: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[] }) => {
      const { items, ...orderData } = order

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData as never)
        .select()
        .single()

      if (orderError) throw orderError

      const typedOrder = newOrder as OrderRow

      if (items && items.length > 0) {
        const orderItems = items.map(item => ({
          ...item,
          order_id: typedOrder.id,
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems as never[])

        if (itemsError) throw itemsError
      }

      return typedOrder as Order
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    },
  })
}

export function useUpdateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...order }: OrderUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update(order as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Order
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status } as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Order
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    },
  })
}

export function useDeleteOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY })
    },
  })
}

// Estatísticas
export function useOrdersStats() {
  return useQuery({
    queryKey: [...ORDERS_KEY, 'stats'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: todayOrders, error } = await supabase
        .from('orders')
        .select('status, total')
        .gte('created_at', today.toISOString())

      if (error) throw error

      const orders = (todayOrders ?? []) as { status: OrderStatus; total: number }[]

      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        preparing: orders.filter(o => ['confirmed', 'preparing'].includes(o.status)).length,
        delivering: orders.filter(o => ['ready', 'delivering'].includes(o.status)).length,
        completed: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        revenue: orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + (o.total || 0), 0),
      }

      return stats
    },
  })
}
