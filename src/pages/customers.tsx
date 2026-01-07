import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShoppingBag,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/use-customers'
import type { CustomerWithStats, CustomerInsert, CustomerUpdate } from '@/types/database'

// Schema de validação
const customerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').nullable().or(z.literal('')),
  cep: z.string().nullable().or(z.literal('')),
  address: z.string().nullable().or(z.literal('')),
  neighborhood: z.string().nullable().or(z.literal('')),
  city: z.string().nullable().or(z.literal('')),
  complement: z.string().nullable().or(z.literal('')),
  reference: z.string().nullable().or(z.literal('')),
  notes: z.string().nullable().or(z.literal('')),
})

// Tipo da resposta do ViaCEP
interface ViaCepResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

// Função para buscar CEP
async function fetchAddressByCep(cep: string): Promise<ViaCepResponse | null> {
  const cleanCep = cep.replace(/\D/g, '')
  if (cleanCep.length !== 8) return null
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
    const data = await response.json()
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}

type CustomerFormData = z.infer<typeof customerSchema>

// Componente do formulário de cliente
function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading,
}: {
  customer?: CustomerWithStats | null
  onSubmit: (data: CustomerFormData) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      email: customer?.email ?? '',
      cep: customer?.cep ?? '',
      address: customer?.address ?? '',
      neighborhood: customer?.neighborhood ?? '',
      city: customer?.city ?? '',
      complement: customer?.complement ?? '',
      reference: customer?.reference ?? '',
      notes: customer?.notes ?? '',
    },
  })

  const cepValue = watch('cep')

  // Buscar endereço quando CEP tiver 8 dígitos
  const handleCepBlur = async () => {
    const cleanCep = (cepValue ?? '').replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    setIsLoadingCep(true)
    const data = await fetchAddressByCep(cleanCep)
    setIsLoadingCep(false)

    if (data) {
      setValue('address', data.logradouro)
      setValue('neighborhood', data.bairro)
      setValue('city', `${data.localidade} - ${data.uf}`)
      if (data.complemento) {
        setValue('complement', data.complemento)
      }
      toast.success('Endereço encontrado!')
    } else {
      toast.error('CEP não encontrado')
    }
  }

  // Formatar CEP enquanto digita
  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 5) return numbers
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nome *"
          placeholder="Nome do cliente"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Telefone *"
          placeholder="(00) 00000-0000"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="email@exemplo.com"
        error={errors.email?.message}
        {...register('email')}
      />

      {/* CEP e Endereço */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Input
            label="CEP"
            placeholder="00000-000"
            maxLength={9}
            {...register('cep', {
              onChange: (e) => {
                e.target.value = formatCep(e.target.value)
              },
            })}
            onBlur={handleCepBlur}
          />
          {isLoadingCep && (
            <div className="absolute right-3 top-9">
              <Spinner size={16} />
            </div>
          )}
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Endereço"
            placeholder="Rua, número"
            error={errors.address?.message}
            {...register('address')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Bairro"
          placeholder="Bairro"
          error={errors.neighborhood?.message}
          {...register('neighborhood')}
        />
        <Input
          label="Cidade"
          placeholder="Cidade"
          error={errors.city?.message}
          {...register('city')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Complemento"
          placeholder="Apto, bloco, etc"
          error={errors.complement?.message}
          {...register('complement')}
        />
        <Input
          label="Referência"
          placeholder="Ponto de referência"
          error={errors.reference?.message}
          {...register('reference')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Observações
        </label>
        <textarea
          className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-md transition-colors placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
          rows={3}
          placeholder="Observações sobre o cliente"
          {...register('notes')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner size={16} /> : customer ? 'Salvar' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  )
}

// Modal de detalhes do cliente
function CustomerDetailsModal({
  customerId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: {
  customerId: string | null
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { data: customer, isLoading } = useCustomer(customerId ?? undefined)

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Cliente" size="lg">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size={32} />
        </div>
      ) : customer ? (
        <div className="space-y-6">
          {/* Info principal */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">{customer.name}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Phone size={14} />
                  {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="p-2 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition-colors"
                title="Editar"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface rounded-lg p-4 text-center">
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShoppingBag size={20} className="text-accent" />
              </div>
              <p className="text-2xl font-bold">{customer.total_orders}</p>
              <p className="text-xs text-text-secondary">Pedidos</p>
            </div>
            <div className="bg-surface rounded-lg p-4 text-center">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar size={20} className="text-success" />
              </div>
              <p className="text-sm font-medium">
                {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p className="text-xs text-text-secondary">Cliente desde</p>
            </div>
            <div className="bg-surface rounded-lg p-4 text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                customer.days_since_last_order !== null && customer.days_since_last_order > 30
                  ? 'bg-warning/10'
                  : 'bg-accent/10'
              }`}>
                <Clock size={20} className={
                  customer.days_since_last_order !== null && customer.days_since_last_order > 30
                    ? 'text-warning'
                    : 'text-accent'
                } />
              </div>
              <p className="text-sm font-medium">
                {customer.days_since_last_order !== null
                  ? `${customer.days_since_last_order} dias`
                  : 'Nunca'}
              </p>
              <p className="text-xs text-text-secondary">Sem pedir</p>
            </div>
          </div>

          {/* Endereço */}
          {(customer.address || customer.neighborhood || customer.city) && (
            <div className="bg-surface rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <MapPin size={16} />
                Endereço
              </h4>
              <p className="text-sm">
                {[customer.address, customer.complement].filter(Boolean).join(', ')}
              </p>
              <p className="text-sm text-text-secondary">
                {[customer.neighborhood, customer.city].filter(Boolean).join(' - ')}
              </p>
              {customer.reference && (
                <p className="text-sm text-text-secondary mt-1">
                  Ref: {customer.reference}
                </p>
              )}
            </div>
          )}

          {/* Observações */}
          {customer.notes && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <h4 className="font-medium text-warning mb-1">Observações</h4>
              <p className="text-sm whitespace-pre-line">{customer.notes}</p>
            </div>
          )}

          {/* Histórico de pedidos */}
          {customer.orders && customer.orders.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Últimos Pedidos</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {customer.orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 px-3 bg-surface rounded-lg text-sm"
                  >
                    <span>
                      {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className="font-medium">
                      R$ {order.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-text-secondary py-8">Cliente não encontrado</p>
      )}
    </Modal>
  )
}

// Modal de confirmação de exclusão
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  customerName: string
  isLoading: boolean
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir Cliente" size="sm">
      <div className="text-center">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-error" />
        </div>
        <p className="text-text-secondary mb-2">
          Tem certeza que deseja excluir o cliente
        </p>
        <p className="font-semibold text-lg mb-6">{customerName}?</p>
        <p className="text-sm text-text-secondary mb-6">
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            className="flex-1 bg-error hover:bg-error/90"
            disabled={isLoading}
          >
            {isLoading ? <Spinner size={16} /> : 'Excluir'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null)

  const { data: customers, isLoading } = useCustomers()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()

  // Filtrar clientes pela busca
  const filteredCustomers = customers?.filter((customer) => {
    const searchLower = search.toLowerCase()
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone.includes(search) ||
      customer.email?.toLowerCase().includes(searchLower)
    )
  })

  const handleCreate = () => {
    setEditingCustomer(null)
    setIsFormOpen(true)
  }

  const handleEdit = (customer: CustomerWithStats) => {
    setEditingCustomer(customer)
    setIsDetailsOpen(false)
    setIsFormOpen(true)
  }

  const handleView = (customer: CustomerWithStats) => {
    setSelectedCustomerId(customer.id)
    setIsDetailsOpen(true)
  }

  const handleDeleteClick = (customer: CustomerWithStats) => {
    setEditingCustomer(customer)
    setIsDetailsOpen(false)
    setIsDeleteOpen(true)
  }

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      const customerData: CustomerInsert | CustomerUpdate = {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        cep: data.cep || null,
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        complement: data.complement || null,
        reference: data.reference || null,
        notes: data.notes || null,
      }

      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, ...customerData })
        toast.success('Cliente atualizado com sucesso!')
      } else {
        await createCustomer.mutateAsync(customerData as CustomerInsert)
        toast.success('Cliente cadastrado com sucesso!')
      }
      setIsFormOpen(false)
      setEditingCustomer(null)
    } catch (error: unknown) {
      const err = error as { code?: string }
      if (err?.code === '23505') {
        toast.error('Já existe um cliente com este telefone')
      } else {
        toast.error('Erro ao salvar cliente')
      }
    }
  }

  const handleDelete = async () => {
    if (!editingCustomer) return
    try {
      await deleteCustomer.mutateAsync(editingCustomer.id)
      toast.success('Cliente excluído com sucesso!')
      setIsDeleteOpen(false)
      setEditingCustomer(null)
    } catch {
      toast.error('Erro ao excluir cliente')
    }
  }

  const getDaysSinceColor = (days: number | null) => {
    if (days === null) return 'text-text-secondary'
    if (days <= 7) return 'text-success'
    if (days <= 30) return 'text-warning'
    return 'text-error'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-text-secondary mt-1">
            Gerencie os clientes do seu estabelecimento
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={18} className="mr-1.5" />
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou email..."
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
      ) : filteredCustomers?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background border border-border rounded-xl">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4">
            <Users size={40} className="text-text-secondary/30" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </h3>
          <p className="text-text-secondary text-center max-w-md mb-6">
            {search
              ? 'Tente buscar por outro termo'
              : 'Cadastre seu primeiro cliente para começar'}
          </p>
          {!search && (
            <Button onClick={handleCreate}>
              <Plus size={18} className="mr-1.5" />
              Cadastrar Cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Cliente
                  </th>
                  <th className="text-left text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Contato
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Pedidos
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Cliente Desde
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3">
                    Dias Sem Pedir
                  </th>
                  <th className="text-center text-xs font-medium text-text-secondary uppercase tracking-wider px-4 py-3 w-24">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers?.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-surface/50 transition-colors cursor-pointer"
                    onClick={() => handleView(customer)}
                  >
                    {/* Nome */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-accent">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{customer.name}</p>
                          <p className="text-xs text-text-secondary md:hidden">
                            {customer.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1.5">
                          <Phone size={12} className="text-text-secondary" />
                          {customer.phone}
                        </p>
                        {customer.email && (
                          <p className="text-xs text-text-secondary flex items-center gap-1.5">
                            <Mail size={12} />
                            {customer.email}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Pedidos */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-accent/10 text-accent font-semibold rounded-full">
                        {customer.total_orders}
                      </span>
                    </td>

                    {/* Cliente desde */}
                    <td className="px-4 py-3 text-center">
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {formatDistanceToNow(new Date(customer.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </td>

                    {/* Dias sem pedir */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm font-semibold ${getDaysSinceColor(
                          customer.days_since_last_order
                        )}`}
                      >
                        {customer.days_since_last_order !== null
                          ? `${customer.days_since_last_order} dias`
                          : 'Nunca pediu'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleView(customer)}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-surface rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(customer)}
                          className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totais */}
      {filteredCustomers && filteredCustomers.length > 0 && (
        <div className="text-sm text-text-secondary text-center">
          Mostrando {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}
          {search && customers && ` de ${customers.length} total`}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingCustomer(null)
        }}
        title={editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
        size="lg"
      >
        <CustomerForm
          customer={editingCustomer}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingCustomer(null)
          }}
          isLoading={createCustomer.isPending || updateCustomer.isPending}
        />
      </Modal>

      {/* Details Modal */}
      <CustomerDetailsModal
        customerId={selectedCustomerId}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={() => {
          const customer = customers?.find((c) => c.id === selectedCustomerId)
          if (customer) handleEdit(customer)
        }}
        onDelete={() => {
          const customer = customers?.find((c) => c.id === selectedCustomerId)
          if (customer) handleDeleteClick(customer)
        }}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setEditingCustomer(null)
        }}
        onConfirm={handleDelete}
        customerName={editingCustomer?.name ?? ''}
        isLoading={deleteCustomer.isPending}
      />
    </div>
  )
}

