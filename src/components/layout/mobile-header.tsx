import { Menu, Package, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, LogOut, ShoppingBag, ClipboardList } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Pedidos', href: '/pedidos', icon: ClipboardList },
  { name: 'Produtos', href: '/produtos', icon: ShoppingBag },
]

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { profile, signOut } = useAuth()

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">DeliveryDK</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-md transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 pt-16"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-background w-72 h-full ml-auto border-l border-border flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-surface text-primary'
                        : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`
                  }
                >
                  <item.icon size={20} />
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* User section */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-9 h-9 bg-surface rounded-full flex items-center justify-center text-sm font-medium text-text-secondary">
                  {profile?.full_name?.charAt(0).toUpperCase() ?? profile?.email?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.full_name ?? 'Usuário'}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {profile?.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
