import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUpload } from '@/components/ui/image-upload'
import { Switch } from '@/components/ui/switch'
import { CurrencyInput } from '@/components/ui/currency-input'
import type { Product, ProductInsert } from '@/types/database'

const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  image_url: z.string().nullable().optional(),
  price: z.number().min(0.01, 'Preço deve ser maior que zero'),
  promotional_price: z.number().nullable().optional(),
  is_active: z.boolean(),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product | null
  categoryId: string
  onSubmit: (data: ProductInsert) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ProductForm({ product, categoryId, onSubmit, onCancel, isLoading }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      image_url: product?.image_url ?? null,
      price: product?.price ?? 0,
      promotional_price: product?.promotional_price ?? null,
      is_active: product?.is_active ?? true,
    },
  })

  const price = watch('price')
  const promotionalPrice = watch('promotional_price')

  async function handleFormSubmit(data: ProductFormData) {
    await onSubmit({
      category_id: categoryId,
      name: data.name,
      description: data.description || null,
      image_url: data.image_url || null,
      price: data.price,
      promotional_price: data.promotional_price || null,
      is_active: data.is_active,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Nome do produto"
        placeholder="Ex: Pizza Margherita, Coca-Cola 2L..."
        error={errors.name?.message}
        {...register('name')}
      />

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Descrição (opcional)
        </label>
        <textarea
          placeholder="Ingredientes, tamanho, etc..."
          rows={3}
          className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-md transition-colors placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
          {...register('description')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Imagem (opcional)
        </label>
        <Controller
          name="image_url"
          control={control}
          render={({ field }) => (
            <ImageUpload
              value={field.value}
              onChange={field.onChange}
              folder="products"
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="price"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              label="Preço"
              value={field.value}
              onChange={(val) => field.onChange(val ?? 0)}
              error={errors.price?.message}
            />
          )}
        />

        <Controller
          name="promotional_price"
          control={control}
          render={({ field }) => (
            <CurrencyInput
              label="Preço promocional"
              value={field.value}
              onChange={field.onChange}
              error={errors.promotional_price?.message}
            />
          )}
        />
      </div>

      {promotionalPrice !== null && promotionalPrice !== undefined && promotionalPrice > 0 && price > 0 && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
          <p className="text-sm text-success">
            Desconto de {Math.round(((price - promotionalPrice) / price) * 100)}%
          </p>
        </div>
      )}

      <Controller
        name="is_active"
        control={control}
        render={({ field }) => (
          <Switch
            checked={field.value}
            onChange={field.onChange}
            label="Produto ativo"
          />
        )}
      />

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          {product ? 'Salvar alterações' : 'Criar produto'}
        </Button>
      </div>
    </form>
  )
}
