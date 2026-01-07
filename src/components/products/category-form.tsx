import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUpload } from '@/components/ui/image-upload'
import { Switch } from '@/components/ui/switch'
import type { Category, CategoryInsert } from '@/types/database'

const categorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormProps {
  category?: Category | null
  onSubmit: (data: CategoryInsert) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function CategoryForm({ category, onSubmit, onCancel, isLoading }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      image_url: category?.image_url ?? null,
      is_active: category?.is_active ?? true,
    },
  })

  async function handleFormSubmit(data: CategoryFormData) {
    await onSubmit({
      name: data.name,
      description: data.description || null,
      image_url: data.image_url || null,
      is_active: data.is_active,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Nome da categoria"
        placeholder="Ex: Pizzas, Bebidas, Sobremesas..."
        error={errors.name?.message}
        {...register('name')}
      />

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Descrição (opcional)
        </label>
        <textarea
          placeholder="Uma breve descrição da categoria..."
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
              folder="categories"
            />
          )}
        />
      </div>

      <Controller
        name="is_active"
        control={control}
        render={({ field }) => (
          <Switch
            checked={field.value}
            onChange={field.onChange}
            label="Categoria ativa"
          />
        )}
      />

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="flex-1">
          {category ? 'Salvar alterações' : 'Criar categoria'}
        </Button>
      </div>
    </form>
  )
}
