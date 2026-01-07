import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Wallet,
  Clock,
  TrendingUp,
  ArrowDownCircle,
  DollarSign,
  Calendar,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { usePartnerStore } from '@/stores/partner-store'
import { getAccessToken } from '@/lib/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled'
type TransactionType = 'sale' | 'withdrawal' | 'adjustment' | 'refund'

type PartnerBalance = {
  id: string
  available_balance: number
  pending_balance: number
  total_earned: number
  total_withdrawn: number
}

type Withdrawal = {
  id: string
  amount: number
  status: WithdrawalStatus
  pix_key: string | null
  requested_at: string
  processed_at: string | null
  notes: string | null
}

type Transaction = {
  id: string
  type: TransactionType
  amount: number
  balance_after: number
  description: string | null
  created_at: string
}

type PaymentSettings = {
  min_withdrawal_amount: number
  min_days_to_withdraw: number
  partner_commission_percent: number
}

type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom'

function usePartnerBalance(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-balance', partnerId],
    queryFn: async () => {
      if (!partnerId) return null
      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/partner_balances?partner_id=eq.${partnerId}&select=*`

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Erro ao buscar saldo')
      const data = await response.json()
      return data[0] as PartnerBalance | null
    },
    enabled: !!partnerId,
  })
}

function usePartnerWithdrawals(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-withdrawals', partnerId],
    queryFn: async () => {
      if (!partnerId) return []
      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/partner_withdrawals?partner_id=eq.${partnerId}&select=*&order=requested_at.desc`

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
    enabled: !!partnerId,
  })
}

function usePartnerTransactions(partnerId: string | undefined, dateFilter: DateFilter, customDates?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['partner-transactions', partnerId, dateFilter, customDates],
    queryFn: async () => {
      if (!partnerId) return []
      const token = getAccessToken()

      let startDate: Date
      let endDate: Date = new Date()

      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(new Date())
          endDate = endOfDay(new Date())
          break
        case 'week':
          startDate = startOfWeek(new Date(), { locale: ptBR })
          endDate = endOfWeek(new Date(), { locale: ptBR })
          break
        case 'month':
          startDate = startOfMonth(new Date())
          endDate = endOfMonth(new Date())
          break
        case 'year':
          startDate = new Date(new Date().getFullYear(), 0, 1)
          endDate = new Date(new Date().getFullYear(), 11, 31)
          break
        case 'custom':
          if (customDates) {
            startDate = customDates.start
            endDate = customDates.end
          } else {
            startDate = subDays(new Date(), 30)
          }
          break
        default:
          startDate = subDays(new Date(), 30)
      }

      const url = `${supabaseUrl}/rest/v1/partner_transactions?partner_id=eq.${partnerId}&created_at=gte.${startDate.toISOString()}&created_at=lte.${endDate.toISOString()}&select=*&order=created_at.desc`

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Erro ao buscar transações')
      return response.json() as Promise<Transaction[]>
    },
    enabled: !!partnerId,
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

function useRequestWithdrawal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ partnerId, amount, pixKey }: { partnerId: string; amount: number; pixKey: string }) => {
      const token = getAccessToken()
      const response = await fetch(`${supabaseUrl}/rest/v1/partner_withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          partner_id: partnerId,
          amount,
          pix_key: pixKey,
          status: 'pending',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao solicitar saque')
      }

      // Atualizar saldo bloqueando o valor
      await fetch(`${supabaseUrl}/rest/v1/rpc/block_withdrawal_amount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ p_partner_id: partnerId, p_amount: amount }),
      })

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-balance'] })
      queryClient.invalidateQueries({ queryKey: ['partner-withdrawals'] })
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

const statusIcons: Record<WithdrawalStatus, React.ReactNode> = {
  pending: <Clock size={14} />,
  approved: <CheckCircle size={14} />,
  paid: <CheckCircle size={14} />,
  rejected: <XCircle size={14} />,
  cancelled: <XCircle size={14} />,
}

const transactionTypeLabels: Record<TransactionType, string> = {
  sale: 'Venda',
  withdrawal: 'Saque',
  adjustment: 'Ajuste',
  refund: 'Reembolso',
}

const transactionTypeColors: Record<TransactionType, string> = {
  sale: 'text-success',
  withdrawal: 'text-error',
  adjustment: 'text-info',
  refund: 'text-warning',
}

function WithdrawalModal({
  isOpen,
  onClose,
  balance,
  settings,
  partnerId,
}: {
  isOpen: boolean
  onClose: () => void
  balance: PartnerBalance | null
  settings: PaymentSettings | undefined
  partnerId: string
}) {
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const requestWithdrawal = useRequestWithdrawal()

  const minAmount = settings?.min_withdrawal_amount || 50
  const availableBalance = Number(balance?.available_balance || 0)
  const parsedAmount = parseFloat(amount) || 0

  const canWithdraw = parsedAmount >= minAmount && parsedAmount <= availableBalance && pixKey.trim().length > 0

  const handleSubmit = async () => {
    if (!canWithdraw) return

    try {
      await requestWithdrawal.mutateAsync({
        partnerId,
        amount: parsedAmount,
        pixKey: pixKey.trim(),
      })
      toast.success('Solicitação de saque enviada!')
      setAmount('')
      setPixKey('')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao solicitar saque')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Solicitar Saque" size="sm">
      <div className="space-y-4">
        <div className="bg-surface rounded-lg p-4">
          <p className="text-sm text-text-secondary">Saldo disponível</p>
          <p className="text-2xl font-bold text-success">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableBalance)}
          </p>
        </div>

        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={18} className="text-warning mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-warning">Regras de saque</p>
            <ul className="text-text-secondary mt-1 space-y-0.5">
              <li>• Valor mínimo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minAmount)}</li>
              <li>• Vendas disponíveis após {settings?.min_days_to_withdraw || 7} dias</li>
            </ul>
          </div>
        </div>

        <Input
          label="Valor do saque"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          error={parsedAmount > availableBalance ? 'Valor maior que o saldo disponível' : undefined}
        />

        <Input
          label="Chave PIX"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder="CPF, e-mail, telefone ou chave aleatória"
        />

        <Button
          onClick={handleSubmit}
          disabled={!canWithdraw}
          isLoading={requestWithdrawal.isPending}
          className="w-full"
        >
          <ArrowDownCircle size={18} className="mr-2" />
          Solicitar Saque
        </Button>
      </div>
    </Modal>
  )
}

export function PartnerFinanceiroPage() {
  const { partner } = usePartnerStore()
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')

  const { data: balance, isLoading: loadingBalance } = usePartnerBalance(partner?.id)
  const { data: withdrawals, isLoading: loadingWithdrawals } = usePartnerWithdrawals(partner?.id)
  const { data: transactions, isLoading: loadingTransactions } = usePartnerTransactions(partner?.id, dateFilter)
  const { data: settings } = usePaymentSettings()

  const pendingWithdrawals = withdrawals?.filter((w) => w.status === 'pending') || []
  const totalPendingWithdrawal = pendingWithdrawals.reduce((acc, w) => acc + w.amount, 0)

  const totalSales = transactions?.filter((t) => t.type === 'sale').reduce((acc, t) => acc + t.amount, 0) || 0
  const totalWithdrawals = transactions?.filter((t) => t.type === 'withdrawal').reduce((acc, t) => acc + Math.abs(t.amount), 0) || 0

  const dateFilterLabels: Record<DateFilter, string> = {
    today: 'Hoje',
    week: 'Esta semana',
    month: 'Este mês',
    year: 'Este ano',
    custom: 'Personalizado',
  }

  if (loadingBalance) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro</h1>
          <p className="text-text-secondary mt-1">Acompanhe seus ganhos e solicite saques</p>
        </div>
        <Button onClick={() => setShowWithdrawalModal(true)}>
          <ArrowDownCircle size={18} className="mr-2" />
          Solicitar Saque
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <Wallet size={20} className="text-success" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Saldo Disponível</p>
              <p className="text-xl font-bold text-success">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(balance?.available_balance || 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Saldo Pendente</p>
              <p className="text-xl font-bold text-warning">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(balance?.pending_balance || 0))}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Liberado após {settings?.min_days_to_withdraw || 7} dias
          </p>
        </div>

        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Ganho</p>
              <p className="text-xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(balance?.total_earned || 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-info" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Sacado</p>
              <p className="text-xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(balance?.total_withdrawn || 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Withdrawals Alert */}
      {pendingWithdrawals.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-warning flex-shrink-0" />
          <div>
            <p className="font-medium text-warning">
              {pendingWithdrawals.length} saque(s) pendente(s)
            </p>
            <p className="text-sm text-text-secondary">
              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendingWithdrawal)}
            </p>
          </div>
        </div>
      )}

      {/* Period Stats */}
      <div className="bg-background border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <History size={18} />
            Resumo do Período
          </h2>
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-border rounded-lg bg-surface"
            >
              {Object.entries(dateFilterLabels).filter(([key]) => key !== 'custom').map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface rounded-lg p-3">
            <p className="text-sm text-text-secondary">Vendas no período</p>
            <p className="text-lg font-bold text-success">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSales)}
            </p>
          </div>
          <div className="bg-surface rounded-lg p-3">
            <p className="text-sm text-text-secondary">Saques no período</p>
            <p className="text-lg font-bold text-error">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalWithdrawals)}
            </p>
          </div>
        </div>
      </div>

      {/* Withdrawals History */}
      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <ArrowDownCircle size={18} />
            Histórico de Saques
          </h2>
        </div>

        {loadingWithdrawals ? (
          <div className="flex justify-center py-8">
            <Spinner size={24} />
          </div>
        ) : !withdrawals?.length ? (
          <div className="p-8 text-center text-text-secondary">
            Nenhum saque realizado
          </div>
        ) : (
          <div className="divide-y divide-border">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusColors[withdrawal.status]}`}>
                    {statusIcons[withdrawal.status]}
                  </div>
                  <div>
                    <p className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(withdrawal.amount)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {format(new Date(withdrawal.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[withdrawal.status]}`}>
                  {statusLabels[withdrawal.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions History */}
      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Calendar size={18} />
            Extrato de Transações ({dateFilterLabels[dateFilter]})
          </h2>
        </div>

        {loadingTransactions ? (
          <div className="flex justify-center py-8">
            <Spinner size={24} />
          </div>
        ) : !transactions?.length ? (
          <div className="p-8 text-center text-text-secondary">
            Nenhuma transação no período
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{transaction.description || transactionTypeLabels[transaction.type]}</p>
                  <p className="text-xs text-text-secondary">
                    {format(new Date(transaction.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <span className={`font-semibold ${transactionTypeColors[transaction.type]}`}>
                  {transaction.amount > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        balance={balance || null}
        settings={settings}
        partnerId={partner?.id || ''}
      />
    </div>
  )
}

