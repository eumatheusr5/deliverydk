import { useState } from 'react'
import { toast } from 'sonner'
import {
  Store,
  Search,
  Eye,
  Ban,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Phone,
  Mail,
  TrendingUp,
  ShoppingBag,
  X,
  MoreVertical,
  Play,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import {
  usePartners,
  usePartner,
  useUpdatePartnerStatus,
  useDeletePartner,
  usePartnerStats,
} from '@/hooks/use-partners'
import { formatCurrency } from '@/lib/format'
import type { Partner, PartnerStatus } from '@/types/database'
import { PARTNER_STATUS_LABELS, PARTNER_STATUS_COLORS } from '@/types/database'

type FilterTab = 'all' | PartnerStatus

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Ativos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'blocked', label: 'Bloqueados' },
]

function getStatusIcon(status: PartnerStatus) {
  switch (status) {
    case 'pending':
      return <Clock size={14} />
    case 'active':
      return <CheckCircle size={14} />
    case 'blocked':
      return <Ban size={14} />
    case 'deleted':
      return <XCircle size={14} />
  }
}

// Dropdown de ações
function ActionsDropdown({ 
  partner, 
  onView,
  onStatusChange,
  onDelete,
}: { 
  partner: Partner
  onView: () => void
  onStatusChange: (status: PartnerStatus) => void
  onDelete: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition-colors"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-20 min-w-[160px] py-1">
            <button
              onClick={() => { onView(); setIsOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
            >
              <Eye size={14} />
              Ver detalhes
            </button>
            
            <a
              href={`/cardapio/${partner.store_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink size={14} />
              Ver cardápio
            </a>

            <div className="border-t border-border my-1" />

            {partner.status === 'pending' && (
              <button
                onClick={() => { onStatusChange('active'); setIsOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 text-success"
              >
                <Play size={14} />
                Aprovar
              </button>
            )}

            {partner.status === 'active' && (
              <button
                onClick={() => { onStatusChange('blocked'); setIsOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 text-warning"
              >
                <Ban size={14} />
                Bloquear
              </button>
            )}

            {partner.status === 'blocked' && (
              <button
                onClick={() => { onStatusChange('active'); setIsOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 text-success"
              >
                <CheckCircle size={14} />
                Desbloquear
              </button>
            )}

            <button
              onClick={() => { onDelete(); setIsOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 text-error"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Modal de detalhes do parceiro
function PartnerDetailsModal({
  partnerId,
  isOpen,
  onClose,
}: {
  partnerId: string | null
  isOpen: boolean
  onClose: () => void
}) {
  const { data: partner, isLoading } = usePartner(partnerId ?? undefined)
  const { data: stats } = usePartnerStats(partnerId ?? undefined)

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Parceiro" size="lg">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size={32} />
        </div>
      ) : partner ? (
        <div className="space-y-6">
          {/* Header com logo e nome */}
          <div className="flex items-start gap-4">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.store_name}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: partner.primary_color }}
              >
                {partner.store_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold">{partner.store_name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PARTNER_STATUS_COLORS[partner.status]}`}>
                  {PARTNER_STATUS_LABELS[partner.status]}
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-1">/{partner.store_slug}</p>
              {partner.store_description && (
                <p className="text-sm text-text-secondary mt-2">{partner.store_description}</p>
              )}
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface rounded-lg p-3 text-center">
              <ShoppingBag size={20} className="mx-auto text-accent mb-1" />
              <p className="text-lg font-bold">{stats?.totalOrders ?? 0}</p>
              <p className="text-xs text-text-secondary">Pedidos</p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <TrendingUp size={20} className="mx-auto text-success mb-1" />
              <p className="text-lg font-bold">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
              <p className="text-xs text-text-secondary">Faturamento</p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <ShoppingBag size={20} className="mx-auto text-warning mb-1" />
              <p className="text-lg font-bold">{stats?.ordersToday ?? 0}</p>
              <p className="text-xs text-text-secondary">Hoje</p>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center">
              <Clock size={20} className="mx-auto text-accent mb-1" />
              <p className="text-lg font-bold">{stats?.pendingOrders ?? 0}</p>
              <p className="text-xs text-text-secondary">Em andamento</p>
            </div>
          </div>

          {/* Dados do proprietário */}
          <div className="bg-surface rounded-lg p-4">
            <h4 className="font-medium mb-3">Dados do Proprietário</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-text-secondary">Nome:</span> {partner.owner_name}</p>
              <p className="flex items-center gap-2">
                <Mail size={14} className="text-text-secondary" />
                {partner.owner_email}
              </p>
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-text-secondary" />
                {partner.owner_phone}
              </p>
            </div>
          </div>

          {/* Personalização */}
          <div className="bg-surface rounded-lg p-4">
            <h4 className="font-medium mb-3">Personalização</h4>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border border-border" 
                  style={{ backgroundColor: partner.primary_color }}
                  title="Cor primária"
                />
                <span className="text-xs text-text-secondary">Primária</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border border-border" 
                  style={{ backgroundColor: partner.secondary_color }}
                  title="Cor secundária"
                />
                <span className="text-xs text-text-secondary">Secundária</span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border border-border" 
                  style={{ backgroundColor: partner.accent_color }}
                  title="Cor de destaque"
                />
                <span className="text-xs text-text-secondary">Destaque</span>
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="text-sm text-text-secondary">
            <p>Cadastrado em {format(new Date(partner.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>

          {/* Link para cardápio */}
          <a
            href={`/cardapio/${partner.store_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button variant="secondary" className="w-full">
              <ExternalLink size={16} className="mr-2" />
              Ver Cardápio Público
            </Button>
          </a>
        </div>
      ) : (
        <p className="text-center text-text-secondary py-8">Parceiro não encontrado</p>
      )}
    </Modal>
  )
}

// Modal de confirmação
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  isLoading: boolean
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        <p className="text-text-secondary mb-6">{message}</p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className={`flex-1 ${confirmVariant === 'danger' ? 'bg-error hover:bg-error/90' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? <Spinner size={16} /> : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function PartnersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'status' | 'delete'
    partner: Partner
    newStatus?: PartnerStatus
  } | null>(null)

  const { data: partners, isLoading } = usePartners(activeTab === 'all' ? undefined : activeTab)
  const updateStatus = useUpdatePartnerStatus()
  const deletePartner = useDeletePartner()

  // Filtrar por busca
  const filteredPartners = partners?.filter((partner) => {
    const searchLower = search.toLowerCase()
    return (
      partner.store_name.toLowerCase().includes(searchLower) ||
      partner.owner_name.toLowerCase().includes(searchLower) ||
      partner.owner_email.toLowerCase().includes(searchLower) ||
      partner.store_slug.toLowerCase().includes(searchLower)
    )
  })

  const handleView = (partner: Partner) => {
    setSelectedPartnerId(partner.id)
    setIsDetailsOpen(true)
  }

  const handleStatusChange = (partner: Partner, newStatus: PartnerStatus) => {
    setConfirmAction({ type: 'status', partner, newStatus })
  }

  const handleDelete = (partner: Partner) => {
    setConfirmAction({ type: 'delete', partner })
  }

  const confirmStatusChange = async () => {
    if (!confirmAction || confirmAction.type !== 'status' || !confirmAction.newStatus) return
    
    try {
      await updateStatus.mutateAsync({ 
        id: confirmAction.partner.id, 
        status: confirmAction.newStatus 
      })
      toast.success(`Parceiro ${PARTNER_STATUS_LABELS[confirmAction.newStatus].toLowerCase()}!`)
      setConfirmAction(null)
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const confirmDelete = async () => {
    if (!confirmAction || confirmAction.type !== 'delete') return
    
    try {
      await deletePartner.mutateAsync(confirmAction.partner.id)
      toast.success('Parceiro excluído!')
      setConfirmAction(null)
    } catch {
      toast.error('Erro ao excluir parceiro')
    }
  }

  const getCount = (status: FilterTab) => {
    if (!partners) return 0
    if (status === 'all') return partners.length
    return partners.filter(p => p.status === status).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parceiros</h1>
        <p className="text-text-secondary mt-1">
          Gerencie os parceiros da sua dark kitchen
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
          placeholder="Buscar por nome, email ou slug..."
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

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : filteredPartners?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background border border-border rounded-xl">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4">
            <Store size={40} className="text-text-secondary/30" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {search ? 'Nenhum parceiro encontrado' : 'Nenhum parceiro cadastrado'}
          </h3>
          <p className="text-text-secondary text-center max-w-md">
            {search
              ? 'Tente buscar por outro termo'
              : 'Os parceiros aparecerão aqui após se cadastrarem'}
          </p>
        </div>
      ) : (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Parceiro
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Contato
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Pedidos
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    Faturamento
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Cadastro
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 w-12">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPartners?.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-surface/50 transition-colors"
                  >
                    {/* Parceiro */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {partner.logo_url ? (
                          <img
                            src={partner.logo_url}
                            alt={partner.store_name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: partner.primary_color }}
                          >
                            {partner.store_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{partner.store_name}</p>
                          <p className="text-xs text-text-secondary">/{partner.store_slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-sm">{partner.owner_name}</p>
                        <p className="text-xs text-text-secondary">{partner.owner_email}</p>
                      </div>
                    </td>

                    {/* Pedidos */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold">{partner.total_orders}</span>
                    </td>

                    {/* Faturamento */}
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="font-semibold text-success">
                        {formatCurrency(partner.total_revenue)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${PARTNER_STATUS_COLORS[partner.status]}`}>
                        {getStatusIcon(partner.status)}
                        {PARTNER_STATUS_LABELS[partner.status]}
                      </span>
                    </td>

                    {/* Cadastro */}
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <div>
                        <p className="text-sm">
                          {format(new Date(partner.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatDistanceToNow(new Date(partner.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <ActionsDropdown
                        partner={partner}
                        onView={() => handleView(partner)}
                        onStatusChange={(status) => handleStatusChange(partner, status)}
                        onDelete={() => handleDelete(partner)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <PartnerDetailsModal
        partnerId={selectedPartnerId}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      {/* Confirm Status Modal */}
      {confirmAction?.type === 'status' && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmStatusChange}
          title={`${confirmAction.newStatus === 'active' ? 'Ativar' : confirmAction.newStatus === 'blocked' ? 'Bloquear' : ''} Parceiro`}
          message={`Tem certeza que deseja ${confirmAction.newStatus === 'active' ? 'ativar' : 'bloquear'} o parceiro "${confirmAction.partner.store_name}"?`}
          confirmLabel={confirmAction.newStatus === 'active' ? 'Ativar' : 'Bloquear'}
          confirmVariant={confirmAction.newStatus === 'blocked' ? 'danger' : 'primary'}
          isLoading={updateStatus.isPending}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmAction?.type === 'delete' && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmDelete}
          title="Excluir Parceiro"
          message={`Tem certeza que deseja excluir o parceiro "${confirmAction.partner.store_name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          confirmVariant="danger"
          isLoading={deletePartner.isPending}
        />
      )}
    </div>
  )
}

