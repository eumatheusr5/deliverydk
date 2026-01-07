import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Spinner } from '@/components/ui/spinner'
import { fetchFromSupabase } from '@/lib/supabase'
import { usePartnerStore } from '@/stores/partner-store'
import { formatCurrency } from '@/lib/format'

type Order = { 
  id: string
  total: number
  status: string
  created_at: string
  customer_name?: string
  neighborhood?: string
}

// Estatísticas do parceiro
function usePartnerDashboardStats(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-dashboard-stats', partnerId],
    queryFn: async () => {
      if (!partnerId) return null

      const { data: orders, error } = await fetchFromSupabase<Order[]>('orders', {
        select: 'id,total,status,created_at',
        filters: [{ column: 'partner_id', operator: 'eq', value: partnerId }],
      })

      if (error) throw error

      const ordersList = orders ?? []

      const now = new Date()
      const today = startOfDay(now)
      const weekStart = startOfWeek(now, { locale: ptBR })
      const monthStart = startOfMonth(now)

      const stats = {
        totalOrders: ordersList.length,
        totalRevenue: ordersList.reduce((acc, o) => acc + (o.total || 0), 0),
        
        ordersToday: ordersList.filter(o => new Date(o.created_at) >= today).length,
        revenueToday: ordersList
          .filter(o => new Date(o.created_at) >= today)
          .reduce((acc, o) => acc + (o.total || 0), 0),
        
        ordersWeek: ordersList.filter(o => new Date(o.created_at) >= weekStart).length,
        revenueWeek: ordersList
          .filter(o => new Date(o.created_at) >= weekStart)
          .reduce((acc, o) => acc + (o.total || 0), 0),
        
        ordersMonth: ordersList.filter(o => new Date(o.created_at) >= monthStart).length,
        revenueMonth: ordersList
          .filter(o => new Date(o.created_at) >= monthStart)
          .reduce((acc, o) => acc + (o.total || 0), 0),
        
        pendingOrders: ordersList.filter(o => 
          ['pending', 'confirmed', 'preparing'].includes(o.status)
        ).length,
      }

      return stats
    },
    enabled: !!partnerId,
  })
}

// Últimos pedidos (dados limitados - LGPD)
function usePartnerRecentOrders(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-recent-orders', partnerId],
    queryFn: async () => {
      if (!partnerId) return []

      const { data, error } = await fetchFromSupabase<Order[]>('orders', {
        select: 'id,total,status,customer_name,neighborhood,created_at',
        filters: [{ column: 'partner_id', operator: 'eq', value: partnerId }],
        order: { column: 'created_at', ascending: false },
        limit: 10,
      })

      if (error) throw error

      // Retornar apenas dados permitidos (LGPD)
      return (data ?? []).map((order) => ({
        id: order.id,
        total: order.total,
        status: order.status,
        // Apenas primeiro nome do cliente
        customer_first_name: order.customer_name?.split(' ')[0] || 'Cliente',
        // Apenas bairro, sem endereço completo
        neighborhood: order.neighborhood || 'N/A',
        created_at: order.created_at,
      }))
    },
    enabled: !!partnerId,
  })
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

function StatCard({
  title,
  value,
  subvalue,
  icon: Icon,
  trend,
}: {
  title: string
  value: string | number
  subvalue?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  trend?: 'up' | 'down'
}) {
  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subvalue && (
            <p className="text-xs text-text-secondary mt-1">{subvalue}</p>
          )}
        </div>
        <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center">
          <Icon size={20} className="text-accent" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-success' : 'text-error'}`}>
          <ArrowUpRight size={12} className={trend === 'down' ? 'rotate-180' : ''} />
          <span>vs. ontem</span>
        </div>
      )}
    </div>
  )
}

export function PartnerDashboardPage() {
  const { partner } = usePartnerStore()
  const { data: stats, isLoading: statsLoading } = usePartnerDashboardStats(partner?.id)
  const { data: recentOrders, isLoading: ordersLoading } = usePartnerRecentOrders(partner?.id)
  const [copied, setCopied] = useState(false)

  const menuUrl = `${window.location.origin}/cardapio/${partner?.store_slug}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Olá, {partner?.owner_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-text-secondary mt-1">
            Confira o desempenho da sua loja
          </p>
        </div>

        {/* Link do cardápio */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg text-sm">
            <span className="text-text-secondary truncate max-w-[200px]">{menuUrl}</span>
            <button
              onClick={handleCopyLink}
              className="p-1 hover:bg-background rounded transition-colors"
              title="Copiar link"
            >
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            </button>
          </div>
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            title="Abrir cardápio"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pedidos Hoje"
          value={stats?.ordersToday ?? 0}
          subvalue={formatCurrency(stats?.revenueToday ?? 0)}
          icon={ShoppingBag}
        />
        <StatCard
          title="Esta Semana"
          value={stats?.ordersWeek ?? 0}
          subvalue={formatCurrency(stats?.revenueWeek ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          title="Este Mês"
          value={stats?.ordersMonth ?? 0}
          subvalue={formatCurrency(stats?.revenueMonth ?? 0)}
          icon={DollarSign}
        />
        <StatCard
          title="Em Andamento"
          value={stats?.pendingOrders ?? 0}
          icon={Clock}
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Últimos Pedidos</h2>
          <a href="/parceiro/pedidos" className="text-sm text-primary hover:underline">
            Ver todos
          </a>
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size={24} />
          </div>
        ) : recentOrders?.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum pedido ainda</p>
            <p className="text-sm mt-1">Compartilhe seu cardápio para começar a vender!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders?.map((order) => (
              <div key={order.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{order.customer_first_name}</p>
                    <p className="text-sm text-text-secondary">{order.neighborhood}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(order.total)}</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatDistanceToNow(new Date(order.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="/parceiro/produtos" className="block">
          <div className="bg-background border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <h3 className="font-medium">Definir Preços</h3>
            <p className="text-sm text-text-secondary mt-1">
              Configure os preços dos produtos no seu cardápio
            </p>
          </div>
        </a>
        <a href="/parceiro/personalizacao" className="block">
          <div className="bg-background border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <h3 className="font-medium">Personalizar Loja</h3>
            <p className="text-sm text-text-secondary mt-1">
              Altere logo, cores e informações da sua loja
            </p>
          </div>
        </a>
        <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="block">
          <div className="bg-background border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <h3 className="font-medium">Ver Cardápio</h3>
            <p className="text-sm text-text-secondary mt-1">
              Veja como seus clientes veem sua loja
            </p>
          </div>
        </a>
      </div>
    </div>
  )
}

