import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { MobileHeader } from './mobile-header'

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <MobileHeader />
      
      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

