import { NavLink } from 'react-router-dom'
import { LayoutDashboard, LogOut, Package } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      <div className="lg:hidden fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 hidden peer-checked:block" />
      
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-50 h-screen w-64 bg-background border-r border-border flex flex-col transform -translate-x-full lg:translate-x-0 transition-transform duration-200 ease-in-out peer-checked:translate-x-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">DeliveryDK</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
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
      </aside>
    </>
  )
}

