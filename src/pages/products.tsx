import { useState } from 'react'
import { toast } from 'sonner'
import { Package } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { CategoryList } from '@/components/products/category-list'
import { CategoryForm } from '@/components/products/category-form'
import { ProductList } from '@/components/products/product-list'
import { ProductForm } from '@/components/products/product-form'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '@/hooks/use-categories'
import {
  useCreateProduct,
  useUpdateProduct,
} from '@/hooks/use-products'
import type { Category, Product, CategoryInsert, ProductInsert } from '@/types/database'

type ModalState =
  | { type: 'none' }
  | { type: 'create-category' }
  | { type: 'edit-category'; category: Category }
  | { type: 'create-product'; categoryId: string }
  | { type: 'edit-product'; product: Product }

export function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  const { data: categories } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId)

  function closeModal() {
    setModal({ type: 'none' })
  }

  async function handleCreateCategory(data: CategoryInsert) {
    try {
      const newCategory = await createCategory.mutateAsync(data)
      toast.success('Categoria criada com sucesso')
      closeModal()
      setSelectedCategoryId(newCategory.id)
    } catch {
      toast.error('Erro ao criar categoria')
    }
  }

  async function handleUpdateCategory(data: CategoryInsert) {
    if (modal.type !== 'edit-category') return

    try {
      await updateCategory.mutateAsync({ id: modal.category.id, ...data })
      toast.success('Categoria atualizada com sucesso')
      closeModal()
    } catch {
      toast.error('Erro ao atualizar categoria')
    }
  }

  async function handleCreateProduct(data: ProductInsert) {
    try {
      await createProduct.mutateAsync(data)
      toast.success('Produto criado com sucesso')
      closeModal()
    } catch {
      toast.error('Erro ao criar produto')
    }
  }

  async function handleUpdateProduct(data: ProductInsert) {
    if (modal.type !== 'edit-product') return

    try {
      await updateProduct.mutateAsync({ id: modal.product.id, ...data })
      toast.success('Produto atualizado com sucesso')
      closeModal()
    } catch {
      toast.error('Erro ao atualizar produto')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <p className="text-text-secondary mt-1">
          Gerencie suas categorias e produtos
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories Panel */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-background border border-border rounded-lg p-4 sticky top-4">
            <CategoryList
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onEditCategory={(category) =>
                setModal({ type: 'edit-category', category })
              }
              onCreateCategory={() => setModal({ type: 'create-category' })}
            />
          </div>
        </div>

        {/* Products Panel */}
        <div className="lg:col-span-8 xl:col-span-9">
          {selectedCategory ? (
            <ProductList
              categoryId={selectedCategory.id}
              categoryName={selectedCategory.name}
              onEditProduct={(product) =>
                setModal({ type: 'edit-product', product })
              }
              onCreateProduct={() =>
                setModal({ type: 'create-product', categoryId: selectedCategory.id })
              }
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-background border border-border rounded-lg">
              <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4">
                <Package size={32} className="text-text-secondary" />
              </div>
              <p className="text-text-secondary text-center">
                Selecione uma categoria para ver os produtos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={modal.type === 'create-category'}
        onClose={closeModal}
        title="Nova categoria"
      >
        <CategoryForm
          onSubmit={handleCreateCategory}
          onCancel={closeModal}
          isLoading={createCategory.isPending}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'edit-category'}
        onClose={closeModal}
        title="Editar categoria"
      >
        {modal.type === 'edit-category' && (
          <CategoryForm
            category={modal.category}
            onSubmit={handleUpdateCategory}
            onCancel={closeModal}
            isLoading={updateCategory.isPending}
          />
        )}
      </Modal>

      <Modal
        isOpen={modal.type === 'create-product'}
        onClose={closeModal}
        title="Novo produto"
        size="lg"
      >
        {modal.type === 'create-product' && (
          <ProductForm
            categoryId={modal.categoryId}
            onSubmit={handleCreateProduct}
            onCancel={closeModal}
            isLoading={createProduct.isPending}
          />
        )}
      </Modal>

      <Modal
        isOpen={modal.type === 'edit-product'}
        onClose={closeModal}
        title="Editar produto"
        size="lg"
      >
        {modal.type === 'edit-product' && (
          <ProductForm
            product={modal.product}
            categoryId={modal.product.category_id}
            onSubmit={handleUpdateProduct}
            onCancel={closeModal}
            isLoading={updateProduct.isPending}
          />
        )}
      </Modal>
    </div>
  )
}

