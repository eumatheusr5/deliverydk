import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getAccessToken } from '@/lib/supabase'
import type { Customer, CustomerInsert, CustomerUpdate, CustomerWithStats, Order } from '@/types/database'

const CUSTOMERS_KEY = ['customers']
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Tipos para as queries
type OrderStats = Pick<Order, 'customer_phone' | 'created_at'>
type OrderDetail = Pick<Order, 'id' | 'created_at' | 'total' | 'status'>
type CustomerStats = Pick<Customer, 'id' | 'created_at'>

export function useCustomers() {
  return useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async () => {
      const token = getAccessToken()
      
      // Busca clientes com fetch direto
      const customersResponse = await fetch(`${supabaseUrl}/rest/v1/customers?select=*&order=name.asc`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`,
        },
      })

      if (!customersResponse.ok) throw new Error('Erro ao buscar clientes')
      const customers = await customersResponse.json() as Customer[]

      // Busca estatísticas de pedidos
      const ordersResponse = await fetch(`${supabaseUrl}/rest/v1/orders?select=customer_phone,created_at&order=created_at.desc`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`,
        },
      })

      if (!ordersResponse.ok) throw new Error('Erro ao buscar pedidos')
      const ordersStats = await ordersResponse.json() as OrderStats[]

      // Agrupa pedidos por telefone
      const ordersByPhone: Record<string, { count: number; lastOrderDate: string | null }> = {}
      
      for (const order of ordersStats ?? []) {
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
      const customersWithStats: CustomerWithStats[] = (customers ?? []).map((customer) => {
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
