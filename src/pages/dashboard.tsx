import { useAuthStore } from '@/stores/auth-store'
import { Package, TrendingUp, Users, Clock } from 'lucide-react'

const stats = [
  { name: 'Pedidos Hoje', value: '0', icon: Package, change: '+0%' },
  { name: 'Clientes Ativos', value: '0', icon: Users, change: '+0%' },
  { name: 'Taxa de Entrega', value: '0%', icon: TrendingUp, change: '+0%' },
  { name: 'Tempo Médio', value: '0 min', icon: Clock, change: '0%' },
]

export function DashboardPage() {
  const { profile } = useAuthStore()

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Bem-vindo de volta, {profile?.full_name ?? 'Usuário'}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">{stat.name}</p>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
              </div>
              <div className="p-2 bg-surface rounded-lg">
                <stat.icon size={20} className="text-text-secondary" />
              </div>
            </div>
            <p className="text-xs text-text-secondary mt-3">
              <span className="text-success">{stat.change}</span> vs. ontem
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-background border border-border rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Início Rápido</h2>
        <p className="text-text-secondary text-sm">
          O sistema está pronto para uso. Configure seus produtos, áreas de entrega e comece a receber pedidos.
        </p>
      </div>
    </div>
  )
}
