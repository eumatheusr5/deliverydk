// Partner Status (precisa ser declarado antes do Database)
export type PartnerStatus = 'pending' | 'active' | 'blocked' | 'deleted'

// Order Status (precisa ser declarado antes do Database)
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled'

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
          is_admin: boolean
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
          is_admin?: boolean
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          role?: 'admin' | 'manager' | 'deliverer' | 'customer'
          is_admin?: boolean
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
      partners: {
        Row: {
          id: string
          user_id: string | null
          store_name: string
          store_slug: string
          store_description: string | null
          logo_url: string | null
          banner_url: string | null
          primary_color: string
          secondary_color: string
          accent_color: string
          owner_name: string
          owner_email: string
          owner_phone: string
          status: PartnerStatus
          total_orders: number
          total_revenue: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id?: string | null
          store_name: string
          store_slug: string
          store_description?: string | null
          logo_url?: string | null
          banner_url?: string | null
          primary_color?: string
          secondary_color?: string
          accent_color?: string
          owner_name: string
          owner_email: string
          owner_phone: string
          status?: PartnerStatus
        }
        Update: {
          store_name?: string
          store_slug?: string
          store_description?: string | null
          logo_url?: string | null
          banner_url?: string | null
          primary_color?: string
          secondary_color?: string
          accent_color?: string
          owner_name?: string
          owner_email?: string
          owner_phone?: string
          status?: PartnerStatus
        }
      }
      partner_products: {
        Row: {
          id: string
          partner_id: string
          product_id: string
          selling_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          partner_id: string
          product_id: string
          selling_price: number
          is_active?: boolean
        }
        Update: {
          selling_price?: number
          is_active?: boolean
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Record<string, unknown>
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value: Record<string, unknown>
          description?: string | null
        }
        Update: {
          key?: string
          value?: Record<string, unknown>
          description?: string | null
        }
      }
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'deliverer' | 'customer'
      order_status: OrderStatus
      delivery_type: 'delivery' | 'pickup'
      payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix'
      partner_status: PartnerStatus
    }
  }
}

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

// =============================================
// SISTEMA DE PARCEIROS
// =============================================

// Partners
export type Partner = Database['public']['Tables']['partners']['Row']
export type PartnerInsert = Database['public']['Tables']['partners']['Insert']
export type PartnerUpdate = Database['public']['Tables']['partners']['Update']

// Partner Products (Margens)
export type PartnerProduct = Database['public']['Tables']['partner_products']['Row']
export type PartnerProductInsert = Database['public']['Tables']['partner_products']['Insert']
export type PartnerProductUpdate = Database['public']['Tables']['partner_products']['Update']

// Partner Product com detalhes do produto
export interface PartnerProductWithDetails extends PartnerProduct {
  product: Product
  margin: number // selling_price - product.price
  margin_percent: number // (margin / product.price) * 100
}

// Settings
export type Setting = Database['public']['Tables']['settings']['Row']

// Business Hours
export interface BusinessHour {
  open: string
  close: string
  enabled: boolean
}

export interface BusinessHours {
  monday: BusinessHour
  tuesday: BusinessHour
  wednesday: BusinessHour
  thursday: BusinessHour
  friday: BusinessHour
  saturday: BusinessHour
  sunday: BusinessHour
}

// Payment Methods
export interface PaymentMethodSetting {
  enabled: boolean
  name: string
}

export interface PaymentMethods {
  pix: PaymentMethodSetting
  cash: PaymentMethodSetting
  credit_card: PaymentMethodSetting
  debit_card: PaymentMethodSetting
}

// Delivery Settings
export interface DeliverySettings {
  delivery_fee: number
  free_delivery_min: number
  min_order_value: number
  estimated_time_min: number
  estimated_time_max: number
}

// Store Info
export interface StoreInfo {
  name: string
  phone: string
  address: string
  is_open: boolean
}

// Partner Status Labels
export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  pending: 'Pendente',
  active: 'Ativo',
  blocked: 'Bloqueado',
  deleted: 'Excluído',
}

export const PARTNER_STATUS_COLORS: Record<PartnerStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  active: 'bg-success/10 text-success',
  blocked: 'bg-error/10 text-error',
  deleted: 'bg-border text-text-secondary',
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
