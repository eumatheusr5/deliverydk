import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Palette,
  Store,
  Image,
  Save,
  ExternalLink,
  Eye,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'
import { usePartnerStore } from '@/stores/partner-store'

const personalizationSchema = z.object({
  store_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  store_description: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
})

type PersonalizationFormData = z.infer<typeof personalizationSchema>

// Componente de preview do cardápio
function MenuPreview({
  storeName,
  storeDescription,
  logoUrl,
  bannerUrl,
  primaryColor,
  secondaryColor,
  accentColor,
}: {
  storeName: string
  storeDescription?: string
  logoUrl?: string | null
  bannerUrl?: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
}) {
  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium">Preview do Cardápio</span>
        <span className="text-xs text-text-secondary">Como os clientes veem</span>
      </div>
      
      <div className="h-[400px] overflow-y-auto">
        {/* Header */}
        <div 
          className="h-24 relative"
          style={{ backgroundColor: primaryColor }}
        >
          {bannerUrl && (
            <img 
              src={bannerUrl} 
              alt="Banner" 
              className="w-full h-full object-cover opacity-40"
            />
          )}
        </div>

        {/* Logo e nome */}
        <div className="px-4 -mt-8 relative z-10">
          <div className="flex items-end gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName}
                className="w-16 h-16 rounded-xl border-4 border-background object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl border-4 border-background flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: secondaryColor }}
              >
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="pb-1">
              <h3 className="font-bold text-lg">{storeName}</h3>
              {storeDescription && (
                <p className="text-xs text-text-secondary line-clamp-1">{storeDescription}</p>
              )}
            </div>
          </div>
        </div>

        {/* Exemplo de categoria */}
        <div className="p-4 mt-4">
          <h4 className="font-semibold mb-3" style={{ color: primaryColor }}>
            🍕 Pizzas
          </h4>
          
          {/* Exemplo de produto */}
          <div className="flex gap-3 p-3 bg-surface rounded-lg">
            <div className="w-16 h-16 bg-border rounded-lg flex items-center justify-center">
              <span className="text-2xl">🍕</span>
            </div>
            <div className="flex-1">
              <p className="font-medium">Pizza Margherita</p>
              <p className="text-xs text-text-secondary">Molho, mozzarella e manjericão</p>
              <p 
                className="text-sm font-semibold mt-1"
                style={{ color: accentColor }}
              >
                R$ 45,00
              </p>
            </div>
          </div>

          {/* Botão exemplo */}
          <button
            className="w-full mt-4 py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: secondaryColor }}
          >
            Ver Carrinho (1 item)
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente de upload de imagem
function ImageUploader({
  label,
  currentUrl,
  onUpload,
  aspect = 'square',
}: {
  label: string
  currentUrl?: string | null
  onUpload: (url: string) => void
  aspect?: 'square' | 'banner'
}) {
  const [isUploading, setIsUploading] = useState(false)
  const { partner } = usePartnerStore()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !partner) return

    setIsUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${partner.id}/${aspect}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('partner-images')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('partner-images')
        .getPublicUrl(fileName)

      onUpload(data.publicUrl)
      toast.success('Imagem enviada!')
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Erro ao enviar imagem')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div 
        className={`relative border-2 border-dashed border-border rounded-xl overflow-hidden transition-colors hover:border-primary/50 ${
          aspect === 'banner' ? 'h-32' : 'w-32 h-32'
        }`}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary">
            <Image size={24} />
            <span className="text-xs mt-1">Enviar</span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Spinner size={24} />
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isUploading}
        />
      </div>
    </div>
  )
}

export function PartnerPersonalizationPage() {
  const { partner, setPartner } = usePartnerStore()
  const [isLoading, setIsLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(partner?.logo_url || '')
  const [bannerUrl, setBannerUrl] = useState(partner?.banner_url || '')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PersonalizationFormData>({
    resolver: zodResolver(personalizationSchema),
    defaultValues: {
      store_name: partner?.store_name || '',
      store_description: partner?.store_description || '',
      primary_color: partner?.primary_color || '#0f172a',
      secondary_color: partner?.secondary_color || '#3b82f6',
      accent_color: partner?.accent_color || '#22c55e',
    },
  })

  const watchedValues = watch()

  const onSubmit = async (data: PersonalizationFormData) => {
    if (!partner) return

    setIsLoading(true)
    try {
      const { data: updatedPartner, error } = await supabase
        .from('partners')
        .update({
          store_name: data.store_name,
          store_description: data.store_description || null,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          accent_color: data.accent_color,
          logo_url: logoUrl || null,
          banner_url: bannerUrl || null,
        } as never)
        .eq('id', partner.id)
        .select()
        .single()

      if (error) throw error

      setPartner(updatedPartner as typeof partner)
      toast.success('Personalização salva!')
    } catch {
      toast.error('Erro ao salvar personalização')
    } finally {
      setIsLoading(false)
    }
  }

  const menuUrl = `${window.location.origin}/cardapio/${partner?.store_slug}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personalização</h1>
          <p className="text-text-secondary mt-1">
            Personalize a aparência do seu cardápio
          </p>
        </div>

        <a
          href={menuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:border-primary/50 transition-colors"
        >
          <Eye size={16} />
          Ver cardápio ao vivo
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações básicas */}
            <div className="bg-background border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center">
                  <Store size={18} className="text-accent" />
                </div>
                <h2 className="font-semibold">Informações da Loja</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nome da Loja</label>
                  <Input {...register('store_name')} error={errors.store_name?.message} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Descrição (opcional)</label>
                  <textarea
                    {...register('store_description')}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg transition-colors placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                    placeholder="Uma breve descrição da sua loja..."
                  />
                  {errors.store_description && (
                    <p className="text-xs text-error mt-1">{errors.store_description.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Imagens */}
            <div className="bg-background border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center">
                  <Image size={18} className="text-accent" />
                </div>
                <h2 className="font-semibold">Imagens</h2>
              </div>

              <div className="space-y-4">
                <ImageUploader
                  label="Logo (recomendado: 200x200)"
                  currentUrl={logoUrl}
                  onUpload={setLogoUrl}
                  aspect="square"
                />

                <ImageUploader
                  label="Banner (recomendado: 1200x300)"
                  currentUrl={bannerUrl}
                  onUpload={setBannerUrl}
                  aspect="banner"
                />
              </div>
            </div>

            {/* Cores */}
            <div className="bg-background border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center">
                  <Palette size={18} className="text-accent" />
                </div>
                <h2 className="font-semibold">Cores</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Primária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      {...register('primary_color')}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input
                      {...register('primary_color')}
                      className="font-mono text-sm"
                      error={errors.primary_color?.message}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Secundária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      {...register('secondary_color')}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input
                      {...register('secondary_color')}
                      className="font-mono text-sm"
                      error={errors.secondary_color?.message}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Destaque</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      {...register('accent_color')}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input
                      {...register('accent_color')}
                      className="font-mono text-sm"
                      error={errors.accent_color?.message}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Spinner size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
              Salvar Personalização
            </Button>
          </form>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <MenuPreview
            storeName={watchedValues.store_name || 'Minha Loja'}
            storeDescription={watchedValues.store_description}
            logoUrl={logoUrl}
            bannerUrl={bannerUrl}
            primaryColor={watchedValues.primary_color}
            secondaryColor={watchedValues.secondary_color}
            accentColor={watchedValues.accent_color}
          />
        </div>
      </div>
    </div>
  )
}

