import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Menu, ShieldCheck } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import AdminSidebar from '../components/AdminSidebar'
import { loadAuthSession, logout } from '../../shared/auth'

export function AdminDashboardPage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/dashboard/overview"
          isOpen={isMobileSidebarOpen}
          isDesktopOpen={isDesktopSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onToggleDesktop={() => setIsDesktopSidebarOpen((current) => !current)}
          onLogout={() => void handleLogout()}
          isLoggingOut={isLoggingOut}
        />

        <section className="space-y-6 px-4 py-5 sm:px-6 lg:px-6 lg:py-8 lg:pl-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-col gap-4 border-b bg-gradient-to-r from-muted/20 via-background to-background sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setIsMobileSidebarOpen(true)}>
                    <Menu className="size-4" />
                  </Button>
                  <Badge className="w-fit gap-2">
                    <ShieldCheck className="size-3.5" />
                    Admin dashboard
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Dashboard</CardTitle>
                <CardDescription>Overview only. Categories are managed on their own dedicated page.</CardDescription>
              </div>

            </CardHeader>

            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Catalog</CardTitle>
                    <CardDescription>Categories, authors, and books.</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Operations</CardTitle>
                    <CardDescription>Orders and customers.</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardTitle>Next step</CardTitle>
                    <CardDescription>Open categories to manage category records.</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default AdminDashboardPage
