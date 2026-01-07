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
import { Pencil, Trash2, ChevronRight, Plus, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { SortableItem } from './sortable-item'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  useCategories,
  useDeleteCategory,
  useReorderCategories,
  useToggleCategoryStatus,
} from '@/hooks/use-categories'
import type { Category } from '@/types/database'

interface CategoryListProps {
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onEditCategory: (category: Category) => void
  onCreateCategory: () => void
}

export function CategoryList({
  selectedCategoryId,
  onSelectCategory,
  onEditCategory,
  onCreateCategory,
}: CategoryListProps) {
  const { data: categories, isLoading } = useCategories()
  const deleteCategory = useDeleteCategory()
  const reorderCategories = useReorderCategories()
  const toggleStatus = useToggleCategoryStatus()

  const [localCategories, setLocalCategories] = useState<Category[]>([])

  // Sincronizar com dados do servidor
  const displayCategories = localCategories.length > 0 ? localCategories : categories ?? []

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
      const oldIndex = displayCategories.findIndex((c) => c.id === active.id)
      const newIndex = displayCategories.findIndex((c) => c.id === over.id)

      const newOrder = arrayMove(displayCategories, oldIndex, newIndex)
      setLocalCategories(newOrder)

      // Atualizar no servidor
      const updates = newOrder.map((cat, index) => ({
        id: cat.id,
        sort_order: index,
      }))

      reorderCategories.mutate(updates, {
        onSuccess: () => {
          setLocalCategories([])
        },
        onError: () => {
          setLocalCategories([])
          toast.error('Erro ao reordenar categorias')
        },
      })
    }
  }

  function handleDelete(category: Category) {
    if (!confirm(`Deseja realmente excluir a categoria "${category.name}"? Todos os produtos desta categoria também serão excluídos.`)) {
      return
    }

    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        toast.success('Categoria excluída com sucesso')
        if (selectedCategoryId === category.id) {
          onSelectCategory(null)
        }
      },
      onError: () => {
        toast.error('Erro ao excluir categoria')
      },
    })
  }

  function handleToggleStatus(category: Category) {
    toggleStatus.mutate(
      { id: category.id, is_active: !category.is_active },
      {
        onSuccess: () => {
          toast.success(
            category.is_active ? 'Categoria desativada' : 'Categoria ativada'
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
          Categorias
        </h2>
        <Button variant="ghost" onClick={onCreateCategory} className="h-8 px-2">
          <Plus size={16} />
        </Button>
      </div>

      {displayCategories.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-text-secondary mb-3">
            Nenhuma categoria cadastrada
          </p>
          <Button variant="secondary" onClick={onCreateCategory}>
            <Plus size={16} />
            Criar primeira categoria
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayCategories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {displayCategories.map((category) => (
                <SortableItem key={category.id} id={category.id}>
                  <div
                    className={`
                      group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                      ${
                        selectedCategoryId === category.id
                          ? 'bg-surface border border-border'
                          : 'hover:bg-surface/50'
                      }
                      ${!category.is_active ? 'opacity-50' : ''}
                    `}
                    onClick={() => onSelectCategory(category.id)}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-surface border border-border overflow-hidden flex-shrink-0">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={16} className="text-text-secondary" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{category.name}</p>
                      {category.description && (
                        <p className="text-xs text-text-secondary truncate">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Switch
                        checked={category.is_active}
                        onChange={() => handleToggleStatus(category)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditCategory(category)
                        }}
                        className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded-md"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(category)
                        }}
                        className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-md"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <ChevronRight
                      size={16}
                      className={`text-text-secondary transition-transform ${
                        selectedCategoryId === category.id ? 'rotate-90' : ''
                      }`}
                    />
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

