import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DollarSign,
  Clock,
  Store,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Check,
  X,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { getAccessToken } from '@/lib/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled'

type Withdrawal = {
  id: string
  partner_id: string
  amount: number
  status: WithdrawalStatus
  pix_key: string | null
  bank_info: Record<string, string> | null
  requested_at: string
  processed_at: string | null
  notes: string | null
  partner: {
    store_name: string
    owner_name: string
  }
}

type PartnerBalance = {
  id: string
  partner_id: string
  available_balance: number
  pending_balance: number
  total_earned: number
  total_withdrawn: number
  partner: {
    store_name: string
    owner_name: string
  }
}

type PaymentSettings = {
  id: string
  min_withdrawal_amount: number
  min_days_to_withdraw: number
}

function useWithdrawals(status?: WithdrawalStatus | 'all') {
  return useQuery({
    queryKey: ['admin-withdrawals', status],
    queryFn: async () => {
      const token = getAccessToken()
      let url = `${supabaseUrl}/rest/v1/partner_withdrawals?select=*,partner:partners(store_name,owner_name)&order=requested_at.desc`
      
      if (status && status !== 'all') {
        url += `&status=eq.${status}`
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Erro ao buscar saques')
      return response.json() as Promise<Withdrawal[]>
    },
  })
}

function usePartnerBalances() {
  return useQuery({
    queryKey: ['admin-partner-balances'],
    queryFn: async () => {
      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/partner_balances?select=*,partner:partners(store_name,owner_name)&order=available_balance.desc`

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Erro ao buscar saldos')
      return response.json() as Promise<PartnerBalance[]>
    },
  })
}

function usePaymentSettings() {
  return useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/payment_settings?limit=1`

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })

      if (!response.ok) throw new Error('Erro ao buscar configurações')
      const data = await response.json()
      return data[0] as PaymentSettings
    },
  })
}

function useUpdateWithdrawal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string
      status: WithdrawalStatus
      notes?: string
    }) => {
      const token = getAccessToken()
      const response = await fetch(`${supabaseUrl}/rest/v1/partner_withdrawals?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          status,
          processed_at: new Date().toISOString(),
          notes,
        }),
      })

      if (!response.ok) throw new Error('Erro ao atualizar saque')

      // Se foi pago, atualizar saldo
      if (status === 'paid') {
        const [withdrawal] = await response.json()
        
        // Atualizar saldo
        await fetch(`${supabaseUrl}/rest/v1/partner_balances?partner_id=eq.${withdrawal.partner_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            available_balance: `available_balance - ${withdrawal.amount}`,
            total_withdrawn: `total_withdrawn + ${withdrawal.amount}`,
          }),
        })

        // Registrar transação
        await fetch(`${supabaseUrl}/rest/v1/partner_transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            partner_id: withdrawal.partner_id,
            type: 'withdrawal',
            amount: -withdrawal.amount,
            balance_after: 0, // Será recalculado
            reference_id: withdrawal.id,
            description: `Saque #${withdrawal.id.slice(0, 8)} - Pago`,
          }),
        })
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] })
      queryClient.invalidateQueries({ queryKey: ['admin-partner-balances'] })
    },
  })
}

function useUpdatePaymentSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: Partial<PaymentSettings>) => {
      const token = getAccessToken()
      const response = await fetch(`${supabaseUrl}/rest/v1/payment_settings?id=not.is.null`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error('Erro ao atualizar configurações')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] })
      toast.success('Configurações atualizadas!')
    },
  })
}

const statusLabels: Record<WithdrawalStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  paid: 'Pago',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
}

const statusColors: Record<WithdrawalStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-info/10 text-info',
  paid: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
  cancelled: 'bg-text-secondary/10 text-text-secondary',
}

function WithdrawalModal({
  withdrawal,
  isOpen,
  onClose,
}: {
  withdrawal: Withdrawal | null
  isOpen: boolean
  onClose: () => void
}) {
  const [notes, setNotes] = useState('')
  const updateWithdrawal = useUpdateWithdrawal()

  if (!withdrawal) return null

  const handleAction = async (status: WithdrawalStatus) => {
    try {
      await updateWithdrawal.mutateAsync({ id: withdrawal.id, status, notes })
      toast.success(status === 'paid' ? 'Pagamento confirmado!' : `Status atualizado para ${statusLabels[status]}`)
      onClose()
    } catch {
      toast.error('Erro ao processar')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Saque" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-text-secondary">Parceiro</p>
            <p className="font-medium">{withdrawal.partner?.store_name}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Responsável</p>
            <p className="font-medium">{withdrawal.partner?.owner_name}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Valor</p>
            <p className="text-xl font-bold text-success">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(withdrawal.amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Status</p>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[withdrawal.status]}`}>
              {statusLabels[withdrawal.status]}
            </span>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Data da Solicitação</p>
            <p className="font-medium">
              {format(new Date(withdrawal.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          {withdrawal.pix_key && (
            <div>
              <p className="text-sm text-text-secondary">Chave PIX</p>
              <p className="font-medium font-mono">{withdrawal.pix_key}</p>
            </div>
          )}
        </div>

        {withdrawal.status === 'pending' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Observações</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
                rows={2}
                placeholder="Adicionar observação (opcional)"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleAction('paid')}
                isLoading={updateWithdrawal.isPending}
                className="flex-1 bg-success hover:bg-success/90"
              >
                <Check size={18} className="mr-2" />
                Confirmar Pagamento
              </Button>
              <Button
                onClick={() => handleAction('rejected')}
                isLoading={updateWithdrawal.isPending}
                variant="danger"
                className="flex-1"
              >
                <X size={18} className="mr-2" />
                Rejeitar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function SettingsModal({
  isOpen,
  onClose,
  settings,
}: {
  isOpen: boolean
  onClose: () => void
  settings: PaymentSettings | undefined
}) {
  const [minAmount, setMinAmount] = useState(settings?.min_withdrawal_amount?.toString() || '50')
  const [minDays, setMinDays] = useState(settings?.min_days_to_withdraw?.toString() || '7')
  const updateSettings = useUpdatePaymentSettings()

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        min_withdrawal_amount: parseFloat(minAmount),
        min_days_to_withdraw: parseInt(minDays),
      })
      onClose()
    } catch {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurações de Pagamento" size="sm">
      <div className="space-y-4">
        <Input
          label="Valor mínimo para saque (R$)"
          type="number"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
        />
        <Input
          label="Dias mínimos após venda para liberar saque"
          type="number"
          value={minDays}
          onChange={(e) => setMinDays(e.target.value)}
        />
        <div className="bg-surface rounded-lg p-3">
          <p className="text-sm text-text-secondary">
            <strong>Como funciona:</strong> O lucro do parceiro é automaticamente calculado como a diferença entre o preço de venda (definido pelo parceiro) e o preço de custo (definido por você).
          </p>
        </div>
        <Button onClick={handleSave} isLoading={updateSettings.isPending} className="w-full">
          Salvar Configurações
        </Button>
      </div>
    </Modal>
  )
}

export function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'balances'>('withdrawals')

  const { data: withdrawals, isLoading: loadingWithdrawals } = useWithdrawals(statusFilter)
  const { data: balances, isLoading: loadingBalances } = usePartnerBalances()
  const { data: settings } = usePaymentSettings()

  const filteredWithdrawals = withdrawals?.filter((w) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      w.partner?.store_name?.toLowerCase().includes(searchLower) ||
      w.partner?.owner_name?.toLowerCase().includes(searchLower)
    )
  })

  const filteredBalances = balances?.filter((b) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      b.partner?.store_name?.toLowerCase().includes(searchLower) ||
      b.partner?.owner_name?.toLowerCase().includes(searchLower)
    )
  })

  const pendingCount = withdrawals?.filter((w) => w.status === 'pending').length || 0
  const totalPending = withdrawals
    ?.filter((w) => w.status === 'pending')
    .reduce((acc, w) => acc + w.amount, 0) || 0

  const totalAvailable = balances?.reduce((acc, b) => acc + Number(b.available_balance), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pagamentos</h1>
          <p className="text-text-secondary mt-1">Gerencie pagamentos e saques dos parceiros</p>
        </div>
        <Button onClick={() => setShowSettings(true)} variant="secondary">
          <Filter size={18} className="mr-2" />
          Configurações
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Saques Pendentes</p>
              <p className="text-xl font-semibold">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-error" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total a Pagar</p>
              <p className="text-xl font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <Wallet size={20} className="text-success" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Saldo Total Parceiros</p>
              <p className="text-xl font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAvailable)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Parceiros Ativos</p>
              <p className="text-xl font-semibold">{balances?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'withdrawals'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Solicitações de Saque
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'balances'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Saldos dos Parceiros
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Buscar por parceiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background"
          />
        </div>
        {activeTab === 'withdrawals' && (
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WithdrawalStatus | 'all')}
              className="appearance-none pl-4 pr-10 py-2 border border-border rounded-lg bg-background"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="paid">Pagos</option>
              <option value="rejected">Rejeitados</option>
            </select>
            <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'withdrawals' ? (
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          {loadingWithdrawals ? (
            <div className="p-8 text-center text-text-secondary">Carregando...</div>
          ) : !filteredWithdrawals?.length ? (
            <div className="p-8 text-center text-text-secondary">Nenhuma solicitação de saque</div>
          ) : (
            <table className="w-full">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Parceiro</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Valor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Data</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center">
                          <Store size={18} className="text-text-secondary" />
                        </div>
                        <div>
                          <p className="font-medium">{withdrawal.partner?.store_name}</p>
                          <p className="text-sm text-text-secondary">{withdrawal.partner?.owner_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-success">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(withdrawal.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[withdrawal.status]}`}>
                        {statusLabels[withdrawal.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {format(new Date(withdrawal.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                        className="p-2 hover:bg-surface rounded-lg transition-colors"
                      >
                        <Eye size={18} className="text-text-secondary" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          {loadingBalances ? (
            <div className="p-8 text-center text-text-secondary">Carregando...</div>
          ) : !filteredBalances?.length ? (
            <div className="p-8 text-center text-text-secondary">Nenhum parceiro com saldo</div>
          ) : (
            <table className="w-full">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Parceiro</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Disponível</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Pendente</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Total Ganho</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Total Sacado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBalances.map((balance) => (
                  <tr key={balance.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center">
                          <Store size={18} className="text-text-secondary" />
                        </div>
                        <div>
                          <p className="font-medium">{balance.partner?.store_name}</p>
                          <p className="text-sm text-text-secondary">{balance.partner?.owner_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-success">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(balance.available_balance))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-warning">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(balance.pending_balance))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-text-secondary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(balance.total_earned))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-text-secondary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(balance.total_withdrawn))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      <WithdrawalModal
        withdrawal={selectedWithdrawal}
        isOpen={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
      />
    </div>
  )
}

