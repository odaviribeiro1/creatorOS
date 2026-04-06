import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/profiles': 'Perfis',
  '/analysis': 'Análises',
  '/voice-profile': 'Voice Profile',
  '/scripts': 'Roteiros',
  '/scripts/new': 'Novo Roteiro',
  '/settings': 'Configurações',
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname]

  // Pattern matches
  if (/^\/profiles\/[^/]+\/reels$/.test(pathname)) return 'Reels do Perfil'
  if (/^\/scripts\/[^/]+$/.test(pathname)) return 'Roteiro'

  return 'Creator OS'
}

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const title = getPageTitle(location.pathname)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-200',
          collapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <Header title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
