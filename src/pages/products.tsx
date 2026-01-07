import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, GripVertical, ImageIcon, Tag, ChevronDown } from 'lucide-react'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { CategoryForm } from '@/components/products/category-form'
import { ProductForm } from '@/components/products/product-form'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
  useToggleCategoryStatus,
} from '@/hooks/use-categories'
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useReorderProducts,
  useToggleProductStatus,
} from '@/hooks/use-products'
import { formatCurrency } from '@/lib/format'
import type { Category, Product, CategoryInsert, ProductInsert } from '@/types/database'

type ModalState =
  | { type: 'none' }
  | { type: 'create-category' }
  | { type: 'edit-category'; category: Category }
  | { type: 'create-product'; categoryId: string }
  | { type: 'edit-product'; product: Product }

// Sortable Product Row
function SortableProductRow({ 
  product, 
  onEdit, 
  onDelete,
  onToggleStatus 
}: { 
  product: Product
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-4 p-4 bg-background border border-border rounded-lg hover:shadow-sm transition-shadow
        ${!product.is_active ? 'opacity-50' : ''}
      `}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="p-1 text-text-secondary hover:text-text-primary cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      {/* Image */}
      <div className="w-14 h-14 rounded-lg bg-surface border border-border overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={20} className="text-text-secondary/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{product.name}</h4>
          {product.promotional_price && (
            <span className="px-1.5 py-0.5 bg-success/10 text-success text-xs font-medium rounded">
              <Tag size={10} className="inline mr-1" />
              Promo
            </span>
          )}
        </div>
        {product.description && (
          <p className="text-sm text-text-secondary truncate mt-0.5">{product.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        {product.promotional_price ? (
          <>
            <p className="text-xs text-text-secondary line-through">{formatCurrency(product.price)}</p>
            <p className="font-semibold text-success">{formatCurrency(product.promotional_price)}</p>
          </>
        ) : (
          <p className="font-semibold">{formatCurrency(product.price)}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Switch checked={product.is_active} onChange={onToggleStatus} />
        <button onClick={onEdit} className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg">
          <Pencil size={16} />
        </button>
        <button onClick={onDelete} className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// Category Accordion Item
function CategoryAccordion({
  category,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleProductStatus,
  dragHandleProps,
}: {
  category: Category
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
  onAddProduct: () => void
  onEditProduct: (product: Product) => void
  onDeleteProduct: (product: Product) => void
  onToggleProductStatus: (product: Product) => void
  dragHandleProps: { attributes: ReturnType<typeof useSortable>['attributes']; listeners: ReturnType<typeof useSortable>['listeners'] }
}) {
  const { data: products, isLoading } = useProducts(category.id)
  const reorderProducts = useReorderProducts()
  const [localProducts, setLocalProducts] = useState<Product[]>([])
  
  const displayProducts = localProducts.length > 0 ? localProducts : products ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleProductDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = displayProducts.findIndex((p) => p.id === active.id)
      const newIndex = displayProducts.findIndex((p) => p.id === over.id)
      const newOrder = arrayMove(displayProducts, oldIndex, newIndex)
      setLocalProducts(newOrder)

      const updates = newOrder.map((prod, index) => ({ id: prod.id, sort_order: index }))
      reorderProducts.mutate(updates, {
        onSuccess: () => setLocalProducts([]),
        onError: () => {
          setLocalProducts([])
          toast.error('Erro ao reordenar produtos')
        },
      })
    }
  }

  return (
    <div className={`border border-border rounded-xl overflow-hidden ${!category.is_active ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div 
        className="flex items-center gap-3 px-4 py-4 bg-background cursor-pointer hover:bg-surface/50 transition-colors"
        onClick={onToggle}
      >
        {/* Drag Handle */}
        <button
          type="button"
          className="p-1 text-text-secondary hover:text-text-primary cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical size={18} />
        </button>

        {/* Category Image */}
        <div className="w-12 h-12 rounded-lg bg-surface border border-border overflow-hidden flex-shrink-0">
          {category.image_url ? (
            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={18} className="text-text-secondary/40" />
            </div>
          )}
        </div>

        {/* Category Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-text-secondary truncate">{category.description}</p>
          )}
          <p className="text-xs text-text-secondary mt-1">
            {displayProducts.length} produto{displayProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch checked={category.is_active} onChange={onToggleStatus} />
          <button onClick={onEdit} className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg">
            <Pencil size={16} />
          </button>
          <button onClick={onDelete} className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg">
            <Trash2 size={16} />
          </button>
        </div>

        {/* Expand Icon */}
        <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={20} className="text-text-secondary" />
        </div>
      </div>

      {/* Products */}
      {isExpanded && (
        <div className="border-t border-border bg-surface/30">
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size={24} />
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary mb-3">Nenhum produto cadastrado</p>
                <Button variant="secondary" onClick={onAddProduct}>
                  <Plus size={16} />
                  Adicionar produto
                </Button>
              </div>
            ) : (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProductDragEnd}>
                  <SortableContext items={displayProducts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    {displayProducts.map((product) => (
                      <SortableProductRow
                        key={product.id}
                        product={product}
                        onEdit={() => onEditProduct(product)}
                        onDelete={() => onDeleteProduct(product)}
                        onToggleStatus={() => onToggleProductStatus(product)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                
                <button
                  onClick={onAddProduct}
                  className="w-full py-3 border-2 border-dashed border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-text-secondary/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Adicionar produto
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Sortable Category Wrapper
function SortableCategoryItem({
  category,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleProductStatus,
}: {
  category: Category
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
  onAddProduct: () => void
  onEditProduct: (product: Product) => void
  onDeleteProduct: (product: Product) => void
  onToggleProductStatus: (product: Product) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <CategoryAccordion
        category={category}
        isExpanded={isExpanded}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
        onAddProduct={onAddProduct}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onToggleProductStatus={onToggleProductStatus}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  )
}

export function ProductsPage() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [localCategories, setLocalCategories] = useState<Category[]>([])

  const { data: categories, isLoading: loadingCategories } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()
  const toggleCategoryStatus = useToggleCategoryStatus()

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const toggleProductStatus = useToggleProductStatus()

  const displayCategories = localCategories.length > 0 ? localCategories : categories ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function closeModal() {
    setModal({ type: 'none' })
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  // Category handlers
  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = displayCategories.findIndex((c) => c.id === active.id)
      const newIndex = displayCategories.findIndex((c) => c.id === over.id)
      const newOrder = arrayMove(displayCategories, oldIndex, newIndex)
      setLocalCategories(newOrder)

      const updates = newOrder.map((cat, index) => ({ id: cat.id, sort_order: index }))
      reorderCategories.mutate(updates, {
        onSuccess: () => setLocalCategories([]),
        onError: () => {
          setLocalCategories([])
          toast.error('Erro ao reordenar categorias')
        },
      })
    }
  }

  function handleDeleteCategory(category: Category) {
    if (!confirm(`Excluir "${category.name}"? Todos os produtos serão excluídos.`)) return
    deleteCategory.mutate(category.id, {
      onSuccess: () => toast.success('Categoria excluída'),
      onError: () => toast.error('Erro ao excluir categoria'),
    })
  }

  function handleToggleCategoryStatus(category: Category) {
    toggleCategoryStatus.mutate(
      { id: category.id, is_active: !category.is_active },
      {
        onSuccess: () => toast.success(category.is_active ? 'Categoria desativada' : 'Categoria ativada'),
        onError: () => toast.error('Erro ao alterar status'),
      }
    )
  }

  async function handleCreateCategory(data: CategoryInsert) {
    try {
      const newCategory = await createCategory.mutateAsync(data)
      toast.success('Categoria criada')
      closeModal()
      setExpandedCategories(prev => new Set(prev).add(newCategory.id))
    } catch {
      toast.error('Erro ao criar categoria')
    }
  }

  async function handleUpdateCategory(data: CategoryInsert) {
    if (modal.type !== 'edit-category') return
    try {
      await updateCategory.mutateAsync({ id: modal.category.id, ...data })
      toast.success('Categoria atualizada')
      closeModal()
    } catch {
      toast.error('Erro ao atualizar categoria')
    }
  }

  // Product handlers
  function handleDeleteProduct(product: Product) {
    if (!confirm(`Excluir "${product.name}"?`)) return
    deleteProduct.mutate(product.id, {
      onSuccess: () => toast.success('Produto excluído'),
      onError: () => toast.error('Erro ao excluir produto'),
    })
  }

  function handleToggleProductStatus(product: Product) {
    toggleProductStatus.mutate(
      { id: product.id, is_active: !product.is_active },
      {
        onSuccess: () => toast.success(product.is_active ? 'Produto desativado' : 'Produto ativado'),
        onError: () => toast.error('Erro ao alterar status'),
      }
    )
  }

  async function handleCreateProduct(data: ProductInsert) {
    try {
      await createProduct.mutateAsync(data)
      toast.success('Produto criado')
      closeModal()
    } catch {
      toast.error('Erro ao criar produto')
    }
  }

  async function handleUpdateProduct(data: ProductInsert) {
    if (modal.type !== 'edit-product') return
    try {
      await updateProduct.mutateAsync({ id: modal.product.id, ...data })
      toast.success('Produto atualizado')
      closeModal()
    } catch {
      toast.error('Erro ao atualizar produto')
    }
  }

  if (loadingCategories) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cardápio</h1>
          <p className="text-text-secondary mt-1">Gerencie categorias e produtos</p>
        </div>
        <Button onClick={() => setModal({ type: 'create-category' })}>
          <Plus size={16} />
          Nova categoria
        </Button>
      </div>

      {/* Categories Accordion */}
      {displayCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background border border-border rounded-xl">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4">
            <ImageIcon size={40} className="text-text-secondary/30" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhuma categoria</h3>
          <p className="text-text-secondary text-center max-w-md mb-4">
            Comece criando sua primeira categoria para organizar os produtos do cardápio
          </p>
          <Button onClick={() => setModal({ type: 'create-category' })}>
            <Plus size={16} />
            Criar categoria
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
          <SortableContext items={displayCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {displayCategories.map((category) => (
                <SortableCategoryItem
                  key={category.id}
                  category={category}
                  isExpanded={expandedCategories.has(category.id)}
                  onToggle={() => toggleCategory(category.id)}
                  onEdit={() => setModal({ type: 'edit-category', category })}
                  onDelete={() => handleDeleteCategory(category)}
                  onToggleStatus={() => handleToggleCategoryStatus(category)}
                  onAddProduct={() => {
                    setExpandedCategories(prev => new Set(prev).add(category.id))
                    setModal({ type: 'create-product', categoryId: category.id })
                  }}
                  onEditProduct={(product) => setModal({ type: 'edit-product', product })}
                  onDeleteProduct={handleDeleteProduct}
                  onToggleProductStatus={handleToggleProductStatus}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Modals */}
      <Modal isOpen={modal.type === 'create-category'} onClose={closeModal} title="Nova categoria">
        <CategoryForm onSubmit={handleCreateCategory} onCancel={closeModal} isLoading={createCategory.isPending} />
      </Modal>

      <Modal isOpen={modal.type === 'edit-category'} onClose={closeModal} title="Editar categoria">
        {modal.type === 'edit-category' && (
          <CategoryForm category={modal.category} onSubmit={handleUpdateCategory} onCancel={closeModal} isLoading={updateCategory.isPending} />
        )}
      </Modal>

      <Modal isOpen={modal.type === 'create-product'} onClose={closeModal} title="Novo produto" size="lg">
        {modal.type === 'create-product' && (
          <ProductForm categoryId={modal.categoryId} onSubmit={handleCreateProduct} onCancel={closeModal} isLoading={createProduct.isPending} />
        )}
      </Modal>

      <Modal isOpen={modal.type === 'edit-product'} onClose={closeModal} title="Editar produto" size="lg">
        {modal.type === 'edit-product' && (
          <ProductForm product={modal.product} categoryId={modal.product.category_id} onSubmit={handleUpdateProduct} onCancel={closeModal} isLoading={updateProduct.isPending} />
        )}
      </Modal>
    </div>
  )
}
