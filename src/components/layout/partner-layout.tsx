import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  LogOut,
  Palette,
  Package,
  Menu,
  X,
  ExternalLink,
  ClipboardList,
} from 'lucide-react'
import { usePartnerStore } from '@/stores/partner-store'

const navigation = [
  { name: 'Dashboard', href: '/parceiro', icon: LayoutDashboard },
  { name: 'Meus Pedidos', href: '/parceiro/pedidos', icon: ClipboardList },
  { name: 'Produtos & Preços', href: '/parceiro/produtos', icon: Package },
  { name: 'Personalização', href: '/parceiro/personalizacao', icon: Palette },
]

function PartnerSidebar() {
  const { partner, logout } = usePartnerStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/parceiro/login')
  }

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-background border-r border-border z-30">
      {/* Logo / Partner Name */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-3">
          {partner?.logo_url ? (
            <img
              src={partner.logo_url}
              alt={partner.store_name}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: partner?.primary_color || '#0f172a' }}
            >
              {partner?.store_name?.charAt(0).toUpperCase() || 'P'}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold truncate text-sm">{partner?.store_name || 'Parceiro'}</h2>
            <p className="text-xs text-text-secondary">Portal do Parceiro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/parceiro'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`
            }
          >
            <item.icon size={20} />
            {item.name}
          </NavLink>
        ))}

        {/* Link externo para o cardápio */}
        {partner?.store_slug && (
          <a
            href={`/cardapio/${partner.store_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
          >
            <ExternalLink size={20} />
            Ver Cardápio
          </a>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-error hover:bg-surface transition-colors"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </aside>
  )
}

function PartnerMobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { partner, logout } = usePartnerStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/parceiro/login')
  }

  return (
    <>
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-background border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {partner?.logo_url ? (
            <img
              src={partner.logo_url}
              alt={partner.store_name}
              className="w-8 h-8 rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: partner?.primary_color || '#0f172a' }}
            >
              {partner?.store_name?.charAt(0).toUpperCase() || 'P'}
            </div>
          )}
          <span className="font-semibold">{partner?.store_name}</span>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-text-secondary hover:text-text-primary"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile menu */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="lg:hidden fixed top-16 right-0 bottom-0 w-64 bg-background border-l border-border z-50 overflow-y-auto">
            <nav className="p-3 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/parceiro'}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                    }`
                  }
                >
                  <item.icon size={20} />
                  {item.name}
                </NavLink>
              ))}

              {partner?.store_slug && (
                <a
                  href={`/cardapio/${partner.store_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <ExternalLink size={20} />
                  Ver Cardápio
                </a>
              )}

              <hr className="my-3 border-border" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-error hover:bg-surface transition-colors"
              >
                <LogOut size={20} />
                Sair
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  )
}

export function PartnerLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <PartnerSidebar />
      <PartnerMobileHeader />

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

