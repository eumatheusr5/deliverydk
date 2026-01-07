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
  FileText,
  Receipt,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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

type FilterTab = 'active' | 'pending' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'active', label: 'Ativos', icon: <Clock size={16} /> },
  { key: 'pending', label: 'Pendentes', icon: <Clock size={16} /> },
  { key: 'preparing', label: 'Preparando', icon: <ChefHat size={16} /> },
  { key: 'delivering', label: 'Em entrega', icon: <Truck size={16} /> },
  { key: 'delivered', label: 'Entregues', icon: <CheckCircle2 size={16} /> },
  { key: 'cancelled', label: 'Cancelados', icon: <XCircle size={16} /> },
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

const STATUS_ACTION_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmar',
  preparing: 'Preparar',
  ready: 'Pronto',
  delivering: 'Saiu entrega',
  delivered: 'Entregar',
  cancelled: 'Cancelar',
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
      return <Clock size={16} />
    case 'confirmed':
      return <CheckCircle2 size={16} />
    case 'preparing':
      return <ChefHat size={16} />
    case 'ready':
      return <Package size={16} />
    case 'delivering':
      return <Truck size={16} />
    case 'delivered':
      return <CheckCircle2 size={16} />
    case 'cancelled':
      return <XCircle size={16} />
  }
}

// Order Card Component
function OrderCard({
  order,
  onViewDetails,
}: {
  order: Order
  onViewDetails: (order: Order) => void
}) {
  const updateStatus = useUpdateOrderStatus()
  const nextStatuses = STATUS_FLOW[order.status]

  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ id: order.id, status: newStatus })
      toast.success(`Pedido #${order.order_number} atualizado para ${ORDER_STATUS_LABELS[newStatus]}`)
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">#{order.order_number}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
              {getStatusIcon(order.status)}
              <span className="ml-1">{ORDER_STATUS_LABELS[order.status]}</span>
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-text-secondary">
            <User size={14} />
            <span>{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-1 text-text-secondary">
            {getPaymentIcon(order.payment_method)}
            <span>{PAYMENT_METHOD_LABELS[order.payment_method]}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-text-secondary">
            {order.delivery_type === 'delivery' ? (
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span className="truncate max-w-[200px]">{order.customer_address || 'Sem endereço'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Package size={14} />
                <span>Retirada no local</span>
              </div>
            )}
          </div>
          <span className="text-lg font-bold text-success">{formatCurrency(order.total)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="flex-1 text-sm py-2" onClick={() => onViewDetails(order)}>
            <FileText size={14} />
            Detalhes
          </Button>
          {nextStatuses.map((status) => (
            <Button
              key={status}
              variant={status === 'cancelled' ? 'secondary' : 'primary'}
              className={`flex-1 text-sm py-2 ${status === 'cancelled' ? 'text-error hover:bg-error/10' : ''}`}
              onClick={() => handleStatusChange(status)}
              disabled={updateStatus.isPending}
            >
              {STATUS_ACTION_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>
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
                {STATUS_ACTION_LABELS[status]}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

// Stats Cards
function StatsCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-background border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-text-secondary">{label}</p>
      </div>
    </div>
  )
}

export function OrdersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('active')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const statusFilter = activeTab === 'active' ? 'active' : activeTab === 'preparing' ? undefined : activeTab
  const { data: orders, isLoading } = useOrders(statusFilter as OrderStatus | 'active' | undefined)

  // Filter preparing to include both confirmed and preparing
  const filteredOrders = activeTab === 'preparing'
    ? orders?.filter(o => ['confirmed', 'preparing'].includes(o.status))
    : activeTab === 'delivering'
    ? orders?.filter(o => ['ready', 'delivering'].includes(o.status))
    : orders

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }

  // Stats
  const pendingCount = orders?.filter(o => o.status === 'pending').length ?? 0
  const preparingCount = orders?.filter(o => ['confirmed', 'preparing'].includes(o.status)).length ?? 0
  const deliveringCount = orders?.filter(o => ['ready', 'delivering'].includes(o.status)).length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <p className="text-text-secondary mt-1">Gerencie os pedidos do seu estabelecimento</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          label="Pendentes"
          value={pendingCount}
          icon={<Clock size={24} className="text-warning" />}
          color="bg-warning/10"
        />
        <StatsCard
          label="Em preparo"
          value={preparingCount}
          icon={<ChefHat size={24} className="text-purple-600" />}
          color="bg-purple-100"
        />
        <StatsCard
          label="Em entrega"
          value={deliveringCount}
          icon={<Truck size={24} className="text-accent" />}
          color="bg-accent/10"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
              ${activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-border'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders?.map((order) => (
            <OrderCard key={order.id} order={order} onViewDetails={handleViewDetails} />
          ))}
        </div>
      )}

      {/* Details Modal */}
      <OrderDetailsModal order={selectedOrder} isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} />
    </div>
  )
}

