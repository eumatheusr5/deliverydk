import { useState } from 'react'
import { toast } from 'sonner'
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Package,
  Truck,
  XCircle,
  Phone,
  MapPin,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Receipt,
  Eye,
  ChevronDown,
} from 'lucide-react'

// Truck still used in StatusDropdown icon
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import {
  useOrders,
  useOrderItems,
  useUpdateOrderStatus,
} from '@/hooks/use-orders'
import { formatCurrency } from '@/lib/format'
import type { Order, OrderStatus } from '@/types/database'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from '@/types/database'

type FilterTab = 'all' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled'

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'ready', label: 'Pronto' },
  { key: 'delivering', label: 'Em entrega' },
  { key: 'delivered', label: 'Entregues' },
  { key: 'cancelled', label: 'Cancelados' },
]

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivering', 'cancelled'],
  delivering: ['delivered'],
  delivered: [],
  cancelled: [],
}

function getPaymentIcon(method: string) {
  switch (method) {
    case 'cash':
      return <Banknote size={14} />
    case 'pix':
      return <QrCode size={14} />
    default:
      return <CreditCard size={14} />
  }
}

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return <Clock size={14} />
    case 'confirmed':
      return <CheckCircle2 size={14} />
    case 'preparing':
      return <ChefHat size={14} />
    case 'ready':
      return <Package size={14} />
    case 'delivering':
      return <Truck size={14} />
    case 'delivered':
      return <CheckCircle2 size={14} />
    case 'cancelled':
      return <XCircle size={14} />
  }
}

// Status Dropdown
function StatusDropdown({ order }: { order: Order }) {
  const [isOpen, setIsOpen] = useState(false)
  const updateStatus = useUpdateOrderStatus()
  const nextStatuses = STATUS_FLOW[order.status]

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsOpen(false)
    try {
      await updateStatus.mutateAsync({ id: order.id, status: newStatus })
      toast.success(`Pedido #${order.order_number} → ${ORDER_STATUS_LABELS[newStatus]}`)
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  if (nextStatuses.length === 0) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
        {getStatusIcon(order.status)}
        {ORDER_STATUS_LABELS[order.status]}
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${ORDER_STATUS_COLORS[order.status]}`}
      >
        {getStatusIcon(order.status)}
        {ORDER_STATUS_LABELS[order.status]}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-20 min-w-[140px] py-1">
            {nextStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 ${
                  status === 'cancelled' ? 'text-error' : ''
                }`}
                disabled={updateStatus.isPending}
              >
                {getStatusIcon(status)}
                {ORDER_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Order Details Modal
function OrderDetailsModal({
  order,
  isOpen,
  onClose,
}: {
  order: Order | null
  isOpen: boolean
  onClose: () => void
}) {
  const { data: items, isLoading } = useOrderItems(order?.id)
  const updateStatus = useUpdateOrderStatus()
  const nextStatuses = order ? STATUS_FLOW[order.status] : []

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return
    try {
      await updateStatus.mutateAsync({ id: order.id, status: newStatus })
      toast.success(`Status atualizado para ${ORDER_STATUS_LABELS[newStatus]}`)
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  if (!order) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pedido #${order.order_number}`} size="lg">
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${ORDER_STATUS_COLORS[order.status]}`}>
            {getStatusIcon(order.status)}
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span className="text-sm text-text-secondary">
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>

        {/* Customer Info */}
        <div className="bg-surface rounded-lg p-4 space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <User size={16} />
            Cliente
          </h4>
          <p className="text-sm">{order.customer_name}</p>
          <p className="text-sm text-text-secondary flex items-center gap-2">
            <Phone size={14} />
            {order.customer_phone}
          </p>
          {order.delivery_type === 'delivery' && order.customer_address && (
            <p className="text-sm text-text-secondary flex items-center gap-2">
              <MapPin size={14} />
              {order.customer_address}
            </p>
          )}
          {order.delivery_type === 'pickup' && (
            <p className="text-sm text-text-secondary flex items-center gap-2">
              <Package size={14} />
              Retirada no local
            </p>
          )}
        </div>

        {/* Items */}
        <div>
          <h4 className="font-medium flex items-center gap-2 mb-3">
            <Receipt size={16} />
            Itens do pedido
          </h4>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size={20} />
            </div>
          ) : (
            <div className="space-y-2">
              {items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-medium">{item.quantity}x</span>
                    <span className="ml-2">{item.product_name}</span>
                    {item.notes && <p className="text-xs text-text-secondary mt-0.5">{item.notes}</p>}
                  </div>
                  <span className="font-medium">{formatCurrency(item.total_price)}</span>
                </div>
              ))}
              {(!items || items.length === 0) && (
                <p className="text-sm text-text-secondary text-center py-4">Nenhum item registrado</p>
              )}
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="bg-surface rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.delivery_fee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Taxa de entrega</span>
              <span>{formatCurrency(order.delivery_fee)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex items-center justify-between text-sm text-success">
              <span>Desconto</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-border">
            <span>Total</span>
            <span className="text-success">{formatCurrency(order.total)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary pt-2">
            {getPaymentIcon(order.payment_method)}
            <span>{PAYMENT_METHOD_LABELS[order.payment_method]}</span>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <h4 className="font-medium text-warning mb-1">Observações</h4>
            <p className="text-sm">{order.notes}</p>
          </div>
        )}

        {/* Actions */}
        {nextStatuses.length > 0 && (
          <div className="flex items-center gap-2 pt-4 border-t border-border">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                variant={status === 'cancelled' ? 'secondary' : 'primary'}
                className={`flex-1 ${status === 'cancelled' ? 'text-error hover:bg-error/10' : ''}`}
                onClick={() => handleStatusChange(status)}
                disabled={updateStatus.isPending}
              >
                {ORDER_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function OrdersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const { data: allOrders, isLoading } = useOrders()

  // Filter orders based on tab
  const filteredOrders = activeTab === 'all' 
    ? allOrders 
    : allOrders?.filter(o => o.status === activeTab)

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }

  // Count per status
  const getCount = (status: FilterTab) => {
    if (status === 'all') return allOrders?.length ?? 0
    return allOrders?.filter(o => o.status === status).length ?? 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <p className="text-text-secondary mt-1">Gerencie os pedidos do seu estabelecimento</p>
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

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : filteredOrders?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background border border-border rounded-xl">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4">
            <Receipt size={40} className="text-text-secondary/30" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum pedido</h3>
          <p className="text-text-secondary text-center max-w-md">
            Não há pedidos com este filtro no momento
          </p>
        </div>
      ) : (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Pedido
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Data
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Cliente
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    Endereço
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Pagamento
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Total
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 w-12">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders?.map((order) => (
                  <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                    {/* Order Number */}
                    <td className="px-4 py-3">
                      <span className="font-semibold">#{order.order_number}</span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">{order.customer_name}</p>
                        <p className="text-xs text-text-secondary">{order.customer_phone}</p>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {order.delivery_type === 'delivery' ? (
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate" title={order.customer_address || ''}>
                            {order.customer_address || '-'}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                          <Package size={12} />
                          Retirada no local
                        </span>
                      )}
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                        {getPaymentIcon(order.payment_method)}
                        {PAYMENT_METHOD_LABELS[order.payment_method]}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusDropdown order={order} />
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-success">{formatCurrency(order.total)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="p-2 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <OrderDetailsModal order={selectedOrder} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} />
    </div>
  )
}
