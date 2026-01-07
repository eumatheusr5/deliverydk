import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Clock,
  ChevronRight,
  Search,
  ShoppingBag,
  Store,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Spinner } from '@/components/ui/spinner'
import { formatCurrency } from '@/lib/format'
import type { Partner, Product, Category, DeliverySettings, StoreInfo, BusinessHours } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Função para criar pedido via fetch direto
async function createOrder(data: {
  partnerId: string
  customerName: string
  customerPhone: string
  customerAddress: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
  }>
  subtotal: number
  deliveryFee: number
  total: number
}) {
  // Criar o pedido
  const orderResponse = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      partner_id: data.partnerId,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      customer_address: data.customerAddress,
      delivery_type: 'delivery',
      payment_method: 'cash',
      status: 'pending',
      subtotal: data.subtotal,
      delivery_fee: data.deliveryFee,
      total: data.total,
    }),
  })

  if (!orderResponse.ok) {
    const error = await orderResponse.json()
    throw new Error(error.message || 'Erro ao criar pedido')
  }

  const [order] = await orderResponse.json()

  // Criar os itens do pedido
  const itemsPayload = data.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.unitPrice * item.quantity,
  }))

  const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/order_items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify(itemsPayload),
  })

  if (!itemsResponse.ok) {
    const error = await itemsResponse.json()
    throw new Error(error.message || 'Erro ao criar itens do pedido')
  }

  return order
}

// Hook para buscar dados do parceiro (fetch direto - sem autenticação necessária para dados públicos)
function usePublicPartner(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-partner', slug],
    queryFn: async () => {
      if (!slug) return null

      const url = `${supabaseUrl}/rest/v1/partners?store_slug=eq.${slug}&status=eq.active&limit=1`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
      })
      
      if (!response.ok) throw new Error('Loja não encontrada')
      
      const data = await response.json()
      if (!data || data.length === 0) throw new Error('Loja não encontrada')
      
      return data[0] as Partner
    },
    enabled: !!slug,
  })
}

// Hook para buscar produtos do parceiro (com preços definidos) via fetch direto
function usePublicMenu(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['public-menu', partnerId],
    queryFn: async () => {
      if (!partnerId) return { products: [], categories: [] }

      // Buscar produtos configurados pelo parceiro
      const ppUrl = `${supabaseUrl}/rest/v1/partner_products?partner_id=eq.${partnerId}&is_active=eq.true`
      const ppResponse = await fetch(ppUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
      })
      
      if (!ppResponse.ok) throw new Error('Erro ao carregar produtos')
      
      const partnerProducts = await ppResponse.json()
      const productIds = (partnerProducts ?? []).map((pp: { product_id: string }) => pp.product_id)
      
      if (productIds.length === 0) {
        return { products: [], categories: [] }
      }

      // Buscar detalhes dos produtos (formato PostgREST: in.(id1,id2,id3) - sem aspas para UUIDs)
      const formattedIds = productIds.join(',')
      const productsUrl = `${supabaseUrl}/rest/v1/products?select=*,categories(id,name,sort_order)&id=in.(${formattedIds})&is_active=eq.true`
      const productsResponse = await fetch(productsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
      })
      
      if (!productsResponse.ok) throw new Error('Erro ao carregar produtos')
      
      const products = await productsResponse.json()

      // Combinar com preços do parceiro
      const productsWithPrices = (products ?? []).map((product: Product & { categories: Category | null }) => {
        const partnerProduct = (partnerProducts as { product_id: string; selling_price: number }[])
          .find((pp) => pp.product_id === product.id)
        return {
          ...product,
          selling_price: partnerProduct?.selling_price || product.price,
        }
      })

      // Buscar categorias únicas usando fetch direto
      const categoryIds = [...new Set(productsWithPrices.map((p: { category_id: string }) => p.category_id))]
      const formattedCategoryIds = categoryIds.join(',')
      const categoriesUrl = `${supabaseUrl}/rest/v1/categories?id=in.(${formattedCategoryIds})&is_active=eq.true&order=sort_order.asc`
      const categoriesResponse = await fetch(categoriesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
      })
      
      if (!categoriesResponse.ok) throw new Error('Erro ao carregar categorias')
      
      const categories = await categoriesResponse.json()

      return {
        products: productsWithPrices,
        categories: (categories as Category[]) ?? [],
      }
    },
    enabled: !!partnerId,
  })
}

// Hook para buscar configurações da loja usando fetch direto
function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const settingsUrl = `${supabaseUrl}/rest/v1/settings?select=*`
      const response = await fetch(settingsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
      })
      
      if (!response.ok) throw new Error('Erro ao carregar configurações')
      
      const data = await response.json()

      const settings: Record<string, unknown> = {}
      for (const s of (data ?? []) as { key: string; value: unknown }[]) {
        settings[s.key] = s.value
      }

      return settings as {
        delivery_settings?: DeliverySettings
        store_info?: StoreInfo
        business_hours?: BusinessHours
      }
    },
  })
}

type CartItem = {
  product: Product & { selling_price: number; categories: Category | null }
  quantity: number
}

// Componente do item do produto
function ProductCard({
  product,
  onAdd,
}: {
  product: Product & { selling_price: number; categories: Category | null }
  onAdd: (product: Product & { selling_price: number; categories: Category | null }) => void
}) {
  return (
    <div 
      onClick={() => onAdd(product)}
      className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={24} className="text-gray-300" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{product.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-semibold text-green-600">
            {formatCurrency(product.selling_price)}
          </span>
          <button className="w-7 h-7 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors">
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente do carrinho
function Cart({
  items,
  onUpdateQuantity,
  onCheckout,
  deliveryFee,
  primaryColor,
  secondaryColor,
}: {
  items: CartItem[]
  onUpdateQuantity: (productId: string, delta: number) => void
  onCheckout: () => void
  deliveryFee: number
  primaryColor: string
  secondaryColor: string
}) {
  const subtotal = items.reduce((acc, item) => acc + item.product.selling_price * item.quantity, 0)
  const total = subtotal + deliveryFee

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
        <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Seu carrinho está vazio</p>
        <p className="text-xs text-gray-400 mt-1">Adicione itens para continuar</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100" style={{ backgroundColor: primaryColor }}>
        <h3 className="font-semibold text-white flex items-center gap-2">
          <ShoppingCart size={18} />
          Seu Pedido
        </h3>
      </div>

      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div key={item.product.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.product.name}</p>
              <p className="text-xs text-gray-500">
                {formatCurrency(item.product.selling_price)} cada
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(item.product.id, -1)}
                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
              >
                <Minus size={12} />
              </button>
              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.product.id, 1)}
                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"
              >
                <Plus size={12} />
              </button>
            </div>
            <span className="font-semibold text-sm w-20 text-right">
              {formatCurrency(item.product.selling_price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Entrega</span>
          <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}</span>
        </div>
        <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-100">
          <span>Total</span>
          <span style={{ color: secondaryColor }}>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="p-4 pt-0">
        <button
          onClick={onCheckout}
          className="w-full py-3 rounded-xl text-white font-semibold transition-transform active:scale-[0.98]"
          style={{ backgroundColor: secondaryColor }}
        >
          Finalizar Pedido
        </button>
      </div>
    </div>
  )
}

// Página principal do cardápio
export function PublicMenuPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: partner, isLoading: partnerLoading, error: partnerError } = usePublicPartner(slug)
  const { data: menu, isLoading: menuLoading } = usePublicMenu(partner?.id)
  const { data: settings } = useStoreSettings()
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: number } | null>(null)

  const isLoading = partnerLoading || menuLoading

  const deliveryFee = settings?.delivery_settings?.delivery_fee || 0
  const storeInfo = settings?.store_info
  const businessHours = settings?.business_hours

  // Verificar se está aberto
  const isOpen = useMemo(() => {
    if (!storeInfo?.is_open) return false
    if (!businessHours) return true

    const now = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const dayIndex = now.getDay()
    const today = dayNames[dayIndex] as keyof BusinessHours
    const hours = businessHours[today]

    if (!hours?.enabled) return false

    const currentTime = now.getHours() * 60 + now.getMinutes()
    const openParts = hours.open.split(':').map(Number)
    const closeParts = hours.close.split(':').map(Number)
    const openH = openParts[0] ?? 0
    const openM = openParts[1] ?? 0
    const closeH = closeParts[0] ?? 0
    const closeM = closeParts[1] ?? 0
    
    const openTime = openH * 60 + openM
    let closeTime = closeH * 60 + closeM
    
    if (closeTime < openTime) closeTime += 24 * 60

    return currentTime >= openTime && currentTime < closeTime
  }, [storeInfo, businessHours])

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    let products = menu?.products ?? []

    if (selectedCategory) {
      products = products.filter((p: { category_id: string }) => p.category_id === selectedCategory)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      products = products.filter((p) =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
      )
    }

    return products
  }, [menu?.products, selectedCategory, search])

  // Agrupar por categoria
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, typeof filteredProducts> = {}
    
    for (const product of filteredProducts) {
      const categoryName = product.categories?.name || 'Outros'
      if (!grouped[categoryName]) {
        grouped[categoryName] = []
      }
      grouped[categoryName].push(product)
    }

    return grouped
  }, [filteredProducts])

  const handleAddToCart = (product: CartItem['product']) => {
    if (!isOpen) {
      toast.error('A loja está fechada no momento')
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    toast.success(`${product.name} adicionado!`)
  }

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    })
  }

  const handleCheckout = () => {
    setShowCheckout(true)
    setShowCart(false)
  }

  const handleSubmitOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      toast.error('Preencha todos os campos')
      return
    }

    if (!partner) return

    setIsSubmitting(true)
    try {
      const subtotal = cart.reduce((acc, item) => acc + item.product.selling_price * item.quantity, 0)
      const order = await createOrder({
        partnerId: partner.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.selling_price,
        })),
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
      })

      setOrderSuccess({ orderNumber: order.order_number })
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      toast.success('Pedido realizado com sucesso!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar pedido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const cartTotal = cart.reduce((acc, item) => acc + item.quantity, 0)

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  // Parceiro não encontrado
  if (partnerError || !partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Store size={64} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-xl font-semibold mb-2">Loja não encontrada</h1>
          <p className="text-gray-500">Esta loja não existe ou está inativa.</p>
        </div>
      </div>
    )
  }

  const primaryColor = partner.primary_color || '#0f172a'
  const secondaryColor = partner.secondary_color || '#3b82f6'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header 
        className="sticky top-0 z-40"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Banner */}
        <div className="relative h-32 overflow-hidden">
          {partner.banner_url && (
            <img
              src={partner.banner_url}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
          )}
        </div>

        {/* Logo e info */}
        <div className="px-4 pb-4 -mt-10 relative">
          <div className="flex items-end gap-3">
            {partner.logo_url ? (
              <img
                src={partner.logo_url}
                alt={partner.store_name}
                className="w-16 h-16 rounded-xl border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-xl border-4 border-white shadow-lg flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: secondaryColor }}
              >
                {partner.store_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="pb-1 flex-1">
              <h1 className="font-bold text-lg text-white">{partner.store_name}</h1>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${isOpen ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
                  {isOpen ? 'Aberto' : 'Fechado'}
                </span>
                {settings?.delivery_settings && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {settings.delivery_settings.estimated_time_min}-{settings.delivery_settings.estimated_time_max} min
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Aviso de fechado */}
      {!isOpen && (
        <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-yellow-600" />
          <p className="text-sm text-yellow-700">
            A loja está fechada no momento. Você pode ver o cardápio, mas não pode fazer pedidos.
          </p>
        </div>
      )}

      {/* Busca */}
      <div className="sticky top-0 z-30 bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar no cardápio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Categorias */}
        {menu?.categories && menu.categories.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
              style={!selectedCategory ? { backgroundColor: secondaryColor } : {}}
            >
              Todos
            </button>
            {menu.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
                style={selectedCategory === category.id ? { backgroundColor: secondaryColor } : {}}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="lg:flex lg:gap-6 lg:px-4 lg:py-6">
        {/* Produtos */}
        <main className="flex-1 p-4 lg:p-0">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {search ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(productsByCategory).map(([category, products]) => (
                <div key={category}>
                  <h2 
                    className="font-semibold text-lg mb-3 flex items-center gap-2"
                    style={{ color: primaryColor }}
                  >
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.map((product: CartItem['product']) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={handleAddToCart}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Carrinho Desktop */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-4">
            <Cart
              items={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onCheckout={handleCheckout}
              deliveryFee={deliveryFee}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          </div>
        </aside>
      </div>

      {/* Carrinho Mobile - FAB */}
      {cartTotal > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
          <button
            onClick={() => setShowCart(true)}
            className="w-full py-4 rounded-xl text-white font-semibold shadow-lg flex items-center justify-between px-4"
            style={{ backgroundColor: secondaryColor }}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={20} />
              Ver Carrinho ({cartTotal} {cartTotal === 1 ? 'item' : 'itens'})
            </span>
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Carrinho Mobile - Modal */}
      {showCart && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gray-50 rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold">Seu Pedido</h3>
              <button 
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <Cart
                items={cart}
                onUpdateQuantity={handleUpdateQuantity}
                onCheckout={handleCheckout}
                deliveryFee={deliveryFee}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
              />
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => !isSubmitting && !orderSuccess && setShowCheckout(false)}
          />
          <div className="absolute inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {orderSuccess ? (
              // Success screen
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Pedido Confirmado!</h2>
                <p className="text-gray-500 mb-4">
                  Seu pedido #{orderSuccess.orderNumber} foi recebido com sucesso.
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  Em breve você receberá atualizações sobre o status do seu pedido.
                </p>
                <button
                  onClick={() => {
                    setShowCheckout(false)
                    setOrderSuccess(null)
                  }}
                  className="w-full py-3 rounded-xl text-white font-semibold"
                  style={{ backgroundColor: secondaryColor }}
                >
                  Continuar Comprando
                </button>
              </div>
            ) : (
              // Checkout form
              <>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                  <h3 className="font-semibold text-white">Finalizar Pedido</h3>
                  <button 
                    onClick={() => setShowCheckout(false)}
                    disabled={isSubmitting}
                    className="p-2 hover:bg-white/10 rounded-lg text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                  {/* Resumo do pedido */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium mb-2 text-sm text-gray-500">Resumo do Pedido</h4>
                    <div className="space-y-1 text-sm">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex justify-between">
                          <span>{item.quantity}x {item.product.name}</span>
                          <span className="text-gray-500">{formatCurrency(item.product.selling_price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between text-gray-500">
                          <span>Subtotal</span>
                          <span>{formatCurrency(cart.reduce((acc, item) => acc + item.product.selling_price * item.quantity, 0))}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Entrega</span>
                          <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg pt-1">
                          <span>Total</span>
                          <span style={{ color: secondaryColor }}>{formatCurrency(cart.reduce((acc, item) => acc + item.product.selling_price * item.quantity, 0) + deliveryFee)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dados do cliente */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-500">Seus Dados</h4>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Nome completo"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="Telefone / WhatsApp"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-3 text-gray-400" />
                      <textarea
                        placeholder="Endereço completo para entrega"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        disabled={isSubmitting}
                        rows={3}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl text-white font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    {isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

