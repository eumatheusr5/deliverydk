import { useQuery } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import {
  Search,
  ShoppingBag,
  Clock,
  MapPin,
  X,
} from 'lucide-react'

import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { getAccessToken } from '@/lib/supabase'
import { usePartnerStore } from '@/stores/partner-store'
import { formatCurrency } from '@/lib/format'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Pedidos do parceiro com dados limitados (LGPD) - usando fetch direto
function usePartnerOrders(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-orders', partnerId],
    queryFn: async () => {
      if (!partnerId) return []

      const token = getAccessToken()
      
      // Buscar pedidos
      const ordersUrl = `${supabaseUrl}/rest/v1/orders?partner_id=eq.${partnerId}&select=id,order_number,total,status,customer_name,customer_address,payment_method,created_at&order=created_at.desc`
      const ordersResponse = await fetch(ordersUrl, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`,
        },
      })

      if (!ordersResponse.ok) {
        const error = await ordersResponse.json()
        throw new Error(error.message || 'Erro ao buscar pedidos')
      }

      const orders = await ordersResponse.json()

      // Para cada pedido, buscar os itens
      const ordersWithItems = await Promise.all(
        orders.map(async (order: {
          id: string
          order_number: number
          total: number
          status: string
          customer_name: string
          customer_address: string
          payment_method: string
          created_at: string
        }) => {
          const itemsUrl = `${supabaseUrl}/rest/v1/order_items?order_id=eq.${order.id}&select=id,quantity,unit_price,product_name`
          const itemsResponse = await fetch(itemsUrl, {
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': token ? `Bearer ${token}` : `Bearer ${supabaseAnonKey}`,
            },
          })

          const items = itemsResponse.ok ? await itemsResponse.json() : []

          return {
            id: order.id,
            order_number: order.order_number,
            total: order.total,
            status: order.status,
            customer_first_name: order.customer_name?.split(' ')[0] || 'Cliente',
            customer_address: order.customer_address || 'N/A',
            payment_method: order.payment_method,
            created_at: order.created_at,
            items: items.map((item: { id: string; quantity: number; unit_price: number; product_name: string }) => ({
              id: item.id,
              quantity: item.quantity,
              price: item.unit_price,
              product_name: item.product_name,
            })),
          }
        })
      )

      return ordersWithItems
    },
    enabled: !!partnerId,
  })
}

type PartnerOrder = {
  id: string
  order_number: number
  total: number
  status: string
  customer_first_name: string
  customer_address: string
  payment_method: string
  created_at: string
  items: { id: string; quantity: number; price: number; product_name: string }[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivering: 'Em entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  confirmed: 'bg-accent/10 text-accent',
  preparing: 'bg-secondary/10 text-secondary',
  delivering: 'bg-primary/10 text-primary',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-error/10 text-error',
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
}

type FilterTab = 'all' | 'pending' | 'preparing' | 'delivering' | 'delivered'

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'delivering', label: 'Entrega' },
  { key: 'delivered', label: 'Entregues' },
]

function OrderDetailsModal({
  order,
  isOpen,
  onClose,
}: {
  order: PartnerOrder | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!order) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pedido #${order.order_number}`} size="md">
      <div className="space-y-4">
        {/* Status e data */}
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          <span className="text-sm text-text-secondary">
            {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        {/* Cliente (dados limitados - LGPD) */}
        <div className="bg-surface rounded-lg p-4">
          <p className="text-sm text-text-secondary mb-2">Cliente</p>
          <p className="font-medium">{order.customer_first_name}</p>
          <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
            <MapPin size={14} />
            {order.customer_address}
          </p>
        </div>

        {/* Itens */}
        <div className="bg-surface rounded-lg p-4">
          <p className="text-sm text-text-secondary mb-3">Itens do Pedido</p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.quantity}x {item.product_name}
                </span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Pagamento */}
        <div className="bg-surface rounded-lg p-4">
          <p className="text-sm text-text-secondary mb-1">Forma de Pagamento</p>
          <p className="font-medium">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
        </div>

        {/* Aviso LGPD */}
        <div className="bg-warning/10 rounded-lg p-3 text-sm text-warning">
          <p className="font-medium">📋 Proteção de Dados</p>
          <p className="mt-1 text-warning/80">
            Por questões de LGPD, apenas dados limitados do cliente são exibidos.
          </p>
        </div>
      </div>
    </Modal>
  )
}

export function PartnerOrdersPage() {
  const { partner } = usePartnerStore()
  const { data: orders, isLoading } = usePartnerOrders(partner?.id)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(null)

  // Filtrar pedidos
  const filteredOrders = orders?.filter((order) => {
    // Filtro por status
    if (activeTab !== 'all') {
      if (activeTab === 'pending' && !['pending', 'confirmed'].includes(order.status)) return false
      if (activeTab === 'preparing' && order.status !== 'preparing') return false
      if (activeTab === 'delivering' && order.status !== 'delivering') return false
      if (activeTab === 'delivered' && order.status !== 'delivered') return false
    }

    // Filtro por busca
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        order.id.toLowerCase().includes(searchLower) ||
        order.customer_first_name.toLowerCase().includes(searchLower) ||
        order.customer_address.toLowerCase().includes(searchLower)
      )
    }

    return true
  })

  const getCount = (tab: FilterTab) => {
    if (!orders) return 0
    if (tab === 'all') return orders.length
    if (tab === 'pending') return orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length
    if (tab === 'preparing') return orders.filter(o => o.status === 'preparing').length
    if (tab === 'delivering') return orders.filter(o => o.status === 'delivering').length
    if (tab === 'delivered') return orders.filter(o => o.status === 'delivered').length
    return 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meus Pedidos</h1>
        <p className="text-text-secondary mt-1">
          Acompanhe os pedidos realizados através da sua loja
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {FILTER_TABS.map((tab) => {
          const count = getCount(tab.key)
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors relative
                ${activeTab === tab.key
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key ? 'bg-primary text-white' : 'bg-surface'
                }`}>
                  {count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          placeholder="Buscar por ID, cliente ou bairro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg transition-colors placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : filteredOrders?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background border border-border rounded-xl">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4">
            <ShoppingBag size={40} className="text-text-secondary/30" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {search ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
          </h3>
          <p className="text-text-secondary text-center max-w-md">
            {search
              ? 'Tente buscar por outro termo'
              : 'Compartilhe seu cardápio para começar a receber pedidos!'}
          </p>
        </div>
      ) : (
        <div className="bg-background border border-border rounded-xl divide-y divide-border">
          {filteredOrders?.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="p-4 hover:bg-surface/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">#{order.order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary truncate">
                    {order.customer_first_name} • {order.customer_address}
                  </p>
                  <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(order.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-text-secondary">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}

