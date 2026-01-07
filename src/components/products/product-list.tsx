import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Pencil, Trash2, Plus, ImageIcon, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { SortableItem } from './sortable-item'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  useProducts,
  useDeleteProduct,
  useReorderProducts,
  useToggleProductStatus,
} from '@/hooks/use-products'
import { formatCurrency } from '@/lib/format'
import type { Product } from '@/types/database'

interface ProductListProps {
  categoryId: string
  categoryName: string
  onEditProduct: (product: Product) => void
  onCreateProduct: () => void
}

export function ProductList({
  categoryId,
  categoryName,
  onEditProduct,
  onCreateProduct,
}: ProductListProps) {
  const { data: products, isLoading } = useProducts(categoryId)
  const deleteProduct = useDeleteProduct()
  const reorderProducts = useReorderProducts()
  const toggleStatus = useToggleProductStatus()

  const [localProducts, setLocalProducts] = useState<Product[]>([])

  const displayProducts = localProducts.length > 0 ? localProducts : products ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = displayProducts.findIndex((p) => p.id === active.id)
      const newIndex = displayProducts.findIndex((p) => p.id === over.id)

      const newOrder = arrayMove(displayProducts, oldIndex, newIndex)
      setLocalProducts(newOrder)

      const updates = newOrder.map((prod, index) => ({
        id: prod.id,
        sort_order: index,
      }))

      reorderProducts.mutate(updates, {
        onSuccess: () => {
          setLocalProducts([])
        },
        onError: () => {
          setLocalProducts([])
          toast.error('Erro ao reordenar produtos')
        },
      })
    }
  }

  function handleDelete(product: Product) {
    if (!confirm(`Deseja realmente excluir o produto "${product.name}"?`)) {
      return
    }

    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        toast.success('Produto excluído com sucesso')
      },
      onError: () => {
        toast.error('Erro ao excluir produto')
      },
    })
  }

  function handleToggleStatus(product: Product) {
    toggleStatus.mutate(
      { id: product.id, is_active: !product.is_active },
      {
        onSuccess: () => {
          toast.success(
            product.is_active ? 'Produto desativado' : 'Produto ativado'
          )
        },
        onError: () => {
          toast.error('Erro ao alterar status')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{categoryName}</h2>
          <p className="text-sm text-text-secondary">
            {displayProducts.length} produto{displayProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={onCreateProduct}>
          <Plus size={16} />
          Novo produto
        </Button>
      </div>

      {displayProducts.length === 0 ? (
        <div className="text-center py-12 bg-background border border-border rounded-lg">
          <p className="text-text-secondary mb-3">
            Nenhum produto nesta categoria
          </p>
          <Button variant="secondary" onClick={onCreateProduct}>
            <Plus size={16} />
            Adicionar primeiro produto
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayProducts.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {displayProducts.map((product) => (
                <SortableItem key={product.id} id={product.id}>
                  <div
                    className={`
                      group flex items-center gap-4 p-4 bg-background border border-border rounded-lg
                      ${!product.is_active ? 'opacity-50' : ''}
                    `}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg bg-surface border border-border overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={20} className="text-text-secondary" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-text-secondary truncate">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {product.promotional_price ? (
                          <>
                            <span className="text-sm line-through text-text-secondary">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="text-sm font-medium text-success flex items-center gap-1">
                              <Tag size={12} />
                              {formatCurrency(product.promotional_price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-medium">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Switch
                        checked={product.is_active}
                        onChange={() => handleToggleStatus(product)}
                      />
                      <button
                        onClick={() => onEditProduct(product)}
                        className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-md"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-md"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

