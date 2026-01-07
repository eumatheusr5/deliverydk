import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Customer, CustomerInsert, CustomerUpdate, CustomerWithStats, Order } from '@/types/database'

const CUSTOMERS_KEY = ['customers']

// Tipos para as queries
type OrderStats = Pick<Order, 'customer_phone' | 'created_at'>
type OrderDetail = Pick<Order, 'id' | 'created_at' | 'total' | 'status'>
type CustomerStats = Pick<Customer, 'id' | 'created_at'>

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async () => {
      // Busca clientes com estatísticas de pedidos
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

      if (customersError) throw customersError

      // Busca estatísticas de pedidos para cada cliente (por telefone)
      const { data: ordersStats, error: ordersError } = await supabase
        .from('orders')
        .select('customer_phone, created_at')
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Agrupa pedidos por telefone
      const ordersByPhone: Record<string, { count: number; lastOrderDate: string | null }> = {}
      
      for (const order of (ordersStats as OrderStats[]) ?? []) {
        const phone = order.customer_phone
        if (!ordersByPhone[phone]) {
          ordersByPhone[phone] = {
            count: 0,
            lastOrderDate: order.created_at,
          }
        }
        ordersByPhone[phone].count++
      }

      // Combina clientes com estatísticas
      const customersWithStats: CustomerWithStats[] = ((customers as Customer[]) ?? []).map((customer) => {
        const stats = ordersByPhone[customer.phone] || { count: 0, lastOrderDate: null }
        
        let daysSinceLastOrder: number | null = null
        if (stats.lastOrderDate) {
          const lastOrderDate = new Date(stats.lastOrderDate)
          const today = new Date()
          const diffTime = today.getTime() - lastOrderDate.getTime()
          daysSinceLastOrder = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        }

        return {
          ...customer,
          total_orders: stats.count,
          days_since_last_order: daysSinceLastOrder,
          last_order_date: stats.lastOrderDate,
        }
      })

      return customersWithStats
    },
  })
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      const customer = data as Customer

      // Busca estatísticas de pedidos para este cliente
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total, status')
        .eq('customer_phone', customer.phone)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      const ordersList = (orders as OrderDetail[]) ?? []
      const totalOrders = ordersList.length
      const lastOrderDate = ordersList[0]?.created_at ?? null
      
      let daysSinceLastOrder: number | null = null
      if (lastOrderDate) {
        const lastDate = new Date(lastOrderDate)
        const today = new Date()
        const diffTime = today.getTime() - lastDate.getTime()
        daysSinceLastOrder = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      }

      return {
        ...customer,
        total_orders: totalOrders,
        days_since_last_order: daysSinceLastOrder,
        last_order_date: lastOrderDate,
        orders: ordersList,
      } as CustomerWithStats & { orders: OrderDetail[] }
    },
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (customer: CustomerInsert) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer as never)
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...customer }: CustomerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer as never)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY })
    },
  })
}

// Estatísticas gerais de clientes
export function useCustomersStats() {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, 'stats'],
    queryFn: async () => {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, created_at')

      if (error) throw error

      const customersList = (customers as CustomerStats[]) ?? []
      const total = customersList.length
      
      // Clientes dos últimos 30 dias
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const newCustomers = customersList.filter(c => 
        new Date(c.created_at) >= thirtyDaysAgo
      ).length

      return {
        total,
        newCustomers,
      }
    },
  })
}
