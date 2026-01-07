import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Clock,
  CreditCard,
  Truck,
  Store,
  Save,
  Power,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  useSettings,
  useUpdateSetting,
} from '@/hooks/use-settings'
import type { BusinessHours, PaymentMethods, DeliverySettings, StoreInfo } from '@/types/database'

const DAYS = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const

// Schema para delivery settings
const deliverySchema = z.object({
  delivery_fee: z.number().min(0, 'Taxa inválida'),
  free_delivery_min: z.number().min(0, 'Valor inválido'),
  min_order_value: z.number().min(0, 'Valor inválido'),
  estimated_time_min: z.number().min(1, 'Tempo inválido'),
  estimated_time_max: z.number().min(1, 'Tempo inválido'),
})

// Schema para store info
const storeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string(),
  address: z.string(),
})

type DeliveryFormData = z.infer<typeof deliverySchema>
type StoreFormData = z.infer<typeof storeSchema>

// Seção de Card
function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-background border border-border rounded-xl">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center">
          <Icon size={18} className="text-accent" />
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// Componente de horário de funcionamento
function BusinessHoursForm({ 
  data, 
  onSave,
  isLoading,
}: { 
  data: BusinessHours
  onSave: (data: BusinessHours) => void
  isLoading: boolean
}) {
  const [hours, setHours] = useState<BusinessHours>(data)

  const handleToggle = (day: keyof BusinessHours) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }))
  }

  const handleTimeChange = (day: keyof BusinessHours, field: 'open' | 'close', value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
  }

  const handleSave = () => {
    onSave(hours)
  }

  return (
    <div className="space-y-4">
      {DAYS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-4">
          <label className="flex items-center gap-2 w-28">
            <input
              type="checkbox"
              checked={hours[key].enabled}
              onChange={() => handleToggle(key)}
              className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className={hours[key].enabled ? '' : 'text-text-secondary'}>{label}</span>
          </label>
          
          <div className={`flex items-center gap-2 flex-1 ${!hours[key].enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <input
              type="time"
              value={hours[key].open}
              onChange={(e) => handleTimeChange(key, 'open', e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <span className="text-text-secondary">às</span>
            <input
              type="time"
              value={hours[key].close}
              onChange={(e) => handleTimeChange(key, 'close', e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      ))}

      <Button onClick={handleSave} disabled={isLoading} className="mt-4">
        {isLoading ? <Spinner size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
        Salvar Horários
      </Button>
    </div>
  )
}

// Componente de formas de pagamento
function PaymentMethodsForm({
  data,
  onSave,
  isLoading,
}: {
  data: PaymentMethods
  onSave: (data: PaymentMethods) => void
  isLoading: boolean
}) {
  const [methods, setMethods] = useState<PaymentMethods>(data)

  const handleToggle = (method: keyof PaymentMethods) => {
    setMethods(prev => ({
      ...prev,
      [method]: { ...prev[method], enabled: !prev[method].enabled }
    }))
  }

  const handleSave = () => {
    onSave(methods)
  }

  return (
    <div className="space-y-3">
      {(Object.keys(methods) as (keyof PaymentMethods)[]).map((key) => (
        <label key={key} className="flex items-center gap-3 p-3 bg-surface rounded-lg cursor-pointer hover:bg-surface/80 transition-colors">
          <input
            type="checkbox"
            checked={methods[key].enabled}
            onChange={() => handleToggle(key)}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span>{methods[key].name}</span>
        </label>
      ))}

      <Button onClick={handleSave} disabled={isLoading} className="mt-4">
        {isLoading ? <Spinner size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
        Salvar Pagamentos
      </Button>
    </div>
  )
}

// Componente de configurações de entrega
function DeliverySettingsForm({
  data,
  onSave,
  isLoading,
}: {
  data: DeliverySettings
  onSave: (data: DeliverySettings) => void
  isLoading: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryFormData>({
    resolver: zodResolver(deliverySchema),
    defaultValues: data,
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Taxa de Entrega (R$)</label>
          <Input
            type="number"
            step="0.01"
            {...register('delivery_fee', { valueAsNumber: true })}
            error={errors.delivery_fee?.message}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Entrega Grátis a partir de (R$)</label>
          <Input
            type="number"
            step="0.01"
            {...register('free_delivery_min', { valueAsNumber: true })}
            error={errors.free_delivery_min?.message}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Pedido Mínimo (R$)</label>
          <Input
            type="number"
            step="0.01"
            {...register('min_order_value', { valueAsNumber: true })}
            error={errors.min_order_value?.message}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5">Tempo Mín. (min)</label>
            <Input
              type="number"
              {...register('estimated_time_min', { valueAsNumber: true })}
              error={errors.estimated_time_min?.message}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5">Tempo Máx. (min)</label>
            <Input
              type="number"
              {...register('estimated_time_max', { valueAsNumber: true })}
              error={errors.estimated_time_max?.message}
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Spinner size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
        Salvar Entrega
      </Button>
    </form>
  )
}

// Componente de informações da loja
function StoreInfoForm({
  data,
  onSave,
  onToggleOpen,
  isLoading,
}: {
  data: StoreInfo
  onSave: (data: StoreFormData) => void
  onToggleOpen: () => void
  isLoading: boolean
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: data.name,
      phone: data.phone,
      address: data.address,
    },
  })

  return (
    <div className="space-y-6">
      {/* Toggle de aberto/fechado */}
      <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${data.is_open ? 'bg-success animate-pulse' : 'bg-error'}`} />
          <div>
            <p className="font-medium">{data.is_open ? 'Loja Aberta' : 'Loja Fechada'}</p>
            <p className="text-sm text-text-secondary">
              {data.is_open ? 'Recebendo pedidos' : 'Não está recebendo pedidos'}
            </p>
          </div>
        </div>
        <Button
          variant={data.is_open ? 'danger' : 'primary'}
          onClick={onToggleOpen}
          disabled={isLoading}
        >
          <Power size={16} className="mr-2" />
          {data.is_open ? 'Fechar Loja' : 'Abrir Loja'}
        </Button>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nome da Loja</label>
          <Input {...register('name')} error={errors.name?.message} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Telefone</label>
          <Input {...register('phone')} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Endereço</label>
          <Input {...register('address')} placeholder="Rua, número, bairro" />
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
          Salvar Informações
        </Button>
      </form>
    </div>
  )
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSetting = useUpdateSetting()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    )
  }

  const businessHours = settings?.business_hours?.value as unknown as BusinessHours | undefined
  const paymentMethods = settings?.payment_methods?.value as unknown as PaymentMethods | undefined
  const deliverySettings = settings?.delivery_settings?.value as unknown as DeliverySettings | undefined
  const storeInfo = settings?.store_info?.value as unknown as StoreInfo | undefined

  const handleSaveBusinessHours = async (data: BusinessHours) => {
    try {
      await updateSetting.mutateAsync({ key: 'business_hours', value: data as unknown as Record<string, unknown> })
      toast.success('Horários salvos!')
    } catch {
      toast.error('Erro ao salvar horários')
    }
  }

  const handleSavePaymentMethods = async (data: PaymentMethods) => {
    try {
      await updateSetting.mutateAsync({ key: 'payment_methods', value: data as unknown as Record<string, unknown> })
      toast.success('Formas de pagamento salvas!')
    } catch {
      toast.error('Erro ao salvar formas de pagamento')
    }
  }

  const handleSaveDeliverySettings = async (data: DeliverySettings) => {
    try {
      await updateSetting.mutateAsync({ key: 'delivery_settings', value: data as unknown as Record<string, unknown> })
      toast.success('Configurações de entrega salvas!')
    } catch {
      toast.error('Erro ao salvar configurações de entrega')
    }
  }

  const handleSaveStoreInfo = async (data: { name: string; phone: string; address: string }) => {
    try {
      await updateSetting.mutateAsync({ 
        key: 'store_info', 
        value: { ...storeInfo, ...data } as unknown as Record<string, unknown>
      })
      toast.success('Informações salvas!')
    } catch {
      toast.error('Erro ao salvar informações')
    }
  }

  const handleToggleOpen = async () => {
    if (!storeInfo) return
    try {
      await updateSetting.mutateAsync({ 
        key: 'store_info', 
        value: { ...storeInfo, is_open: !storeInfo.is_open } as unknown as Record<string, unknown>
      })
      toast.success(storeInfo.is_open ? 'Loja fechada!' : 'Loja aberta!')
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-text-secondary mt-1">
          Configure as preferências da sua dark kitchen
        </p>
      </div>

      {/* Grid de configurações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações da Loja */}
        {storeInfo && (
          <SettingsCard title="Informações da Loja" icon={Store}>
            <StoreInfoForm
              data={storeInfo}
              onSave={handleSaveStoreInfo}
              onToggleOpen={handleToggleOpen}
              isLoading={updateSetting.isPending}
            />
          </SettingsCard>
        )}

        {/* Horários */}
        {businessHours && (
          <SettingsCard title="Horário de Funcionamento" icon={Clock}>
            <BusinessHoursForm
              data={businessHours}
              onSave={handleSaveBusinessHours}
              isLoading={updateSetting.isPending}
            />
          </SettingsCard>
        )}

        {/* Formas de Pagamento */}
        {paymentMethods && (
          <SettingsCard title="Formas de Pagamento" icon={CreditCard}>
            <PaymentMethodsForm
              data={paymentMethods}
              onSave={handleSavePaymentMethods}
              isLoading={updateSetting.isPending}
            />
          </SettingsCard>
        )}

        {/* Configurações de Entrega */}
        {deliverySettings && (
          <SettingsCard title="Configurações de Entrega" icon={Truck}>
            <DeliverySettingsForm
              data={deliverySettings}
              onSave={handleSaveDeliverySettings}
              isLoading={updateSetting.isPending}
            />
          </SettingsCard>
        )}
      </div>
    </div>
  )
}

