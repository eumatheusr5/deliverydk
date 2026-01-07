import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Package,
  Search,
  Plus,
  Check,
  X,
  DollarSign,
  TrendingUp,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Modal } from '@/components/ui/modal'
import { getAccessToken } from '@/lib/supabase'
import { usePartnerStore } from '@/stores/partner-store'
import { formatCurrency } from '@/lib/format'
import type { Product, PartnerProduct } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Hook para buscar todos os produtos disponíveis via fetch direto
function useAllProducts() {
  return useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/products?select=*,categories(name)&is_active=eq.true&order=category_id.asc`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos')
      }
      
      const data = await response.json()
      return data as (Product & { categories: { name: string } | null })[]
    },
  })
}

// Hook para buscar produtos configurados pelo parceiro via fetch direto
function usePartnerProducts(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-products', partnerId],
    queryFn: async () => {
      if (!partnerId) return []

      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/partner_products?partner_id=eq.${partnerId}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })
      
      if (!response.ok) {
        throw new Error('Erro ao carregar produtos do parceiro')
      }
      
      const data = await response.json()
      return data as PartnerProduct[]
    },
    enabled: !!partnerId,
  })
}

// Hook para criar/atualizar preço do parceiro via fetch direto
function useUpsertPartnerProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      partner_id: string
      product_id: string
      selling_price: number
      is_active?: boolean
    }) => {
      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/partner_products`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : '',
          'Prefer': 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao salvar preço')
      }
      
      const result = await response.json()
      return result[0]
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner-products', variables.partner_id] })
    },
  })
}

// Hook para remover produto do cardápio via fetch direto
function useDeletePartnerProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, partnerId }: { id: string; partnerId: string }) => {
      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/partner_products?id=eq.${id}`
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : '',
        },
      })
      
      if (!response.ok) {
        throw new Error('Erro ao remover produto')
      }
      
      return { partnerId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner-products', data.partnerId] })
    },
  })
}

type ProductWithConfig = Product & {
  categories: { name: string } | null
  partnerConfig?: PartnerProduct
  margin?: number
  marginPercent?: number
}

// Modal para definir preço
function SetPriceModal({
  product,
  partnerConfig,
  partnerId,
  isOpen,
  onClose,
}: {
  product: Product | null
  partnerConfig?: PartnerProduct
  partnerId: string
  isOpen: boolean
  onClose: () => void
}) {
  const [price, setPrice] = useState(partnerConfig?.selling_price?.toString() || '')
  const upsertProduct = useUpsertPartnerProduct()

  const costPrice = product?.price || 0
  const sellingPrice = parseFloat(price) || 0
  const margin = sellingPrice - costPrice
  const marginPercent = costPrice > 0 ? (margin / costPrice) * 100 : 0

  const handleSave = async () => {
    if (!product) return

    if (sellingPrice <= costPrice) {
      toast.error('O preço de venda deve ser maior que o preço de custo!')
      return
    }

    try {
      await upsertProduct.mutateAsync({
        partner_id: partnerId,
        product_id: product.id,
        selling_price: sellingPrice,
        is_active: true,
      })
      toast.success('Preço definido com sucesso!')
      onClose()
    } catch {
      toast.error('Erro ao definir preço')
    }
  }

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Definir Preço de Venda" size="md">
      <div className="space-y-4">
        {/* Produto */}
        <div className="flex items-center gap-4 p-4 bg-surface rounded-lg">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center">
              <Package size={24} className="text-text-secondary" />
            </div>
          )}
          <div>
            <h3 className="font-medium">{product.name}</h3>
            <p className="text-sm text-text-secondary">
              Preço de custo: <span className="font-medium text-primary">{formatCurrency(costPrice)}</span>
            </p>
          </div>
        </div>

        {/* Campo de preço */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Preço de Venda (R$)</label>
          <Input
            type="number"
            step="0.01"
            min={costPrice + 0.01}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`Mínimo: ${formatCurrency(costPrice + 0.01)}`}
          />
        </div>

        {/* Preview da margem */}
        {sellingPrice > 0 && (
          <div className={`p-4 rounded-lg ${margin > 0 ? 'bg-success/10' : 'bg-error/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sua Margem:</span>
              <span className={`font-bold ${margin > 0 ? 'text-success' : 'text-error'}`}>
                {formatCurrency(margin)} ({marginPercent.toFixed(1)}%)
              </span>
            </div>
            {margin <= 0 && (
              <p className="text-xs text-error mt-2">
                ⚠️ O preço deve ser maior que o custo para ter lucro!
              </p>
            )}
          </div>
        )}

        {/* Dica */}
        <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg text-sm">
          <Info size={16} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-accent">
            O produto só aparecerá no seu cardápio após definir um preço de venda acima do custo.
          </p>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={sellingPrice <= costPrice || upsertProduct.isPending}
            className="flex-1"
          >
            {upsertProduct.isPending ? <Spinner size={16} className="mr-2" /> : <Check size={16} className="mr-2" />}
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function PartnerProductsPage() {
  const { partner } = usePartnerStore()
  const { data: allProducts, isLoading: productsLoading } = useAllProducts()
  const { data: partnerProducts, isLoading: configLoading } = usePartnerProducts(partner?.id)
  const deleteProduct = useDeletePartnerProduct()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'configured' | 'not-configured'>('all')
  const [selectedProduct, setSelectedProduct] = useState<ProductWithConfig | null>(null)

  const isLoading = productsLoading || configLoading

  // Combinar produtos com configurações do parceiro
  const productsWithConfig: ProductWithConfig[] = (allProducts ?? []).map((product) => {
    const config = partnerProducts?.find((pp) => pp.product_id === product.id)
    const margin = config ? config.selling_price - product.price : undefined
    const marginPercent = config && product.price > 0 ? (margin! / product.price) * 100 : undefined

    return {
      ...product,
      partnerConfig: config,
      margin,
      marginPercent,
    }
  })

  // Filtrar produtos
  const filteredProducts = productsWithConfig.filter((product) => {
    // Filtro por busca
    if (search) {
      const searchLower = search.toLowerCase()
      if (!product.name.toLowerCase().includes(searchLower)) return false
    }

    // Filtro por configuração
    if (filter === 'configured' && !product.partnerConfig) return false
    if (filter === 'not-configured' && product.partnerConfig) return false

    return true
  })

  // Agrupar por categoria
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const categoryName = product.categories?.name || 'Sem Categoria'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(product)
    return acc
  }, {} as Record<string, ProductWithConfig[]>)

  const handleToggleActive = async (product: ProductWithConfig) => {
    if (!product.partnerConfig || !partner) return

    try {
      const token = getAccessToken()
      const url = `${supabaseUrl}/rest/v1/partner_products?id=eq.${product.partnerConfig.id}`
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ is_active: !product.partnerConfig.is_active }),
      })
      
      if (!response.ok) throw new Error('Erro ao atualizar')
      
      toast.success(product.partnerConfig.is_active ? 'Produto ocultado' : 'Produto visível')
    } catch {
      toast.error('Erro ao atualizar produto')
    }
  }

  const handleRemoveFromMenu = async (product: ProductWithConfig) => {
    if (!product.partnerConfig || !partner) return

    try {
      await deleteProduct.mutateAsync({
        id: product.partnerConfig.id,
        partnerId: partner.id,
      })
      toast.success('Produto removido do cardápio')
    } catch {
      toast.error('Erro ao remover produto')
    }
  }

  const configuredCount = productsWithConfig.filter((p) => p.partnerConfig).length
  const totalProducts = productsWithConfig.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Produtos & Preços</h1>
        <p className="text-text-secondary mt-1">
          Defina os preços de venda dos produtos no seu cardápio
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-sm text-text-secondary">Produtos Disponíveis</p>
          <p className="text-2xl font-bold mt-1">{totalProducts}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4">
          <p className="text-sm text-text-secondary">No Seu Cardápio</p>
          <p className="text-2xl font-bold mt-1 text-success">{configuredCount}</p>
        </div>
        <div className="bg-background border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-sm text-text-secondary">Pendentes</p>
          <p className="text-2xl font-bold mt-1 text-warning">{totalProducts - configuredCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg transition-colors placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'configured', 'not-configured'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              {f === 'all' && 'Todos'}
              {f === 'configured' && 'Configurados'}
              {f === 'not-configured' && 'Pendentes'}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      ) : Object.keys(productsByCategory).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-background border border-border rounded-xl">
          <Package size={48} className="text-text-secondary/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum produto encontrado</h3>
          <p className="text-text-secondary">Tente mudar os filtros de busca</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(productsByCategory).map(([category, products]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`bg-background border rounded-xl p-4 transition-colors ${
                      product.partnerConfig
                        ? 'border-success/30'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Imagem */}
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                          <Package size={24} className="text-text-secondary" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{product.name}</h4>
                        <p className="text-sm text-text-secondary mt-0.5">
                          Custo: {formatCurrency(product.price)}
                        </p>

                        {product.partnerConfig ? (
                          <div className="mt-2">
                            <p className="text-sm">
                              Venda: <span className="font-semibold text-primary">{formatCurrency(product.partnerConfig.selling_price)}</span>
                            </p>
                            <p className="text-xs text-success flex items-center gap-1">
                              <TrendingUp size={12} />
                              Margem: {formatCurrency(product.margin || 0)} ({product.marginPercent?.toFixed(0)}%)
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-warning mt-2">
                            ⚠️ Preço não definido
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                      {product.partnerConfig ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedProduct(product)}
                            className="flex-1"
                          >
                            <DollarSign size={14} className="mr-1" />
                            Editar Preço
                          </Button>
                          <button
                            onClick={() => handleToggleActive(product)}
                            className={`p-2 rounded-lg transition-colors ${
                              product.partnerConfig.is_active
                                ? 'bg-surface text-text-secondary hover:text-warning'
                                : 'bg-warning/10 text-warning'
                            }`}
                            title={product.partnerConfig.is_active ? 'Ocultar' : 'Mostrar'}
                          >
                            {product.partnerConfig.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => handleRemoveFromMenu(product)}
                            className="p-2 rounded-lg bg-surface text-text-secondary hover:text-error transition-colors"
                            title="Remover do cardápio"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <Button
                          onClick={() => setSelectedProduct(product)}
                          className="w-full"
                        >
                          <Plus size={16} className="mr-2" />
                          Definir Preço
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Set Price Modal */}
      <SetPriceModal
        product={selectedProduct}
        partnerConfig={selectedProduct?.partnerConfig}
        partnerId={partner?.id || ''}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  )
}

