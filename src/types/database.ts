export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          cep: string | null
          address: string | null
          neighborhood: string | null
          city: string | null
          complement: string | null
          reference: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          phone: string
          email?: string | null
          cep?: string | null
          address?: string | null
          neighborhood?: string | null
          city?: string | null
          complement?: string | null
          reference?: string | null
          notes?: string | null
        }
        Update: {
          name?: string
          phone?: string
          email?: string | null
          cep?: string | null
          address?: string | null
          neighborhood?: string | null
          city?: string | null
          complement?: string | null
          reference?: string | null
          notes?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: 'admin' | 'manager' | 'deliverer' | 'customer'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'manager' | 'deliverer' | 'customer'
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'manager' | 'deliverer' | 'customer'
          avatar_url?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          image_url: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          description?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string | null
          image_url?: string | null
          sort_order?: number
          is_active?: boolean
        }
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          image_url: string | null
          price: number
          promotional_price: number | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          category_id: string
          name: string
          description?: string | null
          image_url?: string | null
          price: number
          promotional_price?: number | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          category_id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          price?: number
          promotional_price?: number | null
          sort_order?: number
          is_active?: boolean
        }
      }
      orders: {
        Row: {
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
        Insert: {
          customer_name: string
          customer_phone: string
          customer_address?: string | null
          delivery_type?: 'delivery' | 'pickup'
          payment_method?: 'cash' | 'credit_card' | 'debit_card' | 'pix'
          status?: OrderStatus
          subtotal?: number
          delivery_fee?: number
          discount?: number
          total?: number
          notes?: string | null
        }
        Update: {
          customer_name?: string
          customer_phone?: string
          customer_address?: string | null
          delivery_type?: 'delivery' | 'pickup'
          payment_method?: 'cash' | 'credit_card' | 'debit_card' | 'pix'
          status?: OrderStatus
          subtotal?: number
          delivery_fee?: number
          discount?: number
          total?: number
          notes?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          notes: string | null
          created_at: string
        }
        Insert: {
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
          total_price: number
          notes?: string | null
        }
        Update: {
          product_name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          notes?: string | null
        }
      }
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'deliverer' | 'customer'
      order_status: OrderStatus
      delivery_type: 'delivery' | 'pickup'
      payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix'
    }
  }
}

// Order Status
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled'

// Profiles
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type UserRole = Database['public']['Enums']['user_role']

// Categories
export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

// Products
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

// Orders
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['orders']['Update']

// Order Items
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert']
export type OrderItemUpdate = Database['public']['Tables']['order_items']['Update']

// Order with items
export type OrderWithItems = Order & {
  items: OrderItem[]
}

// Customers
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']

// Customer com estatísticas
export type CustomerWithStats = Customer & {
  total_orders: number
  days_since_last_order: number | null
  last_order_date: string | null
}

// Status labels em português
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivering: 'Em entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  confirmed: 'bg-accent/10 text-accent',
  preparing: 'bg-purple-100 text-purple-700',
  ready: 'bg-success/10 text-success',
  delivering: 'bg-blue-100 text-blue-700',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'PIX',
}

export const DELIVERY_TYPE_LABELS: Record<string, string> = {
  delivery: 'Entrega',
  pickup: 'Retirada',
}
