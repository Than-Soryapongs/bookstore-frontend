import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, LayoutDashboard, LibraryBig, Loader2, LogOut, Menu, ShoppingCart, Tags, Users, UserRound, X, type LucideIcon } from 'lucide-react'

import { Button } from '../ui/button'

export type AdminSidebarItem = {
  label: string
  icon: LucideIcon
  href: string
}

export type AdminSidebarGroup = {
  title: string
  items: AdminSidebarItem[]
}

type AdminSidebarProps = {
  activeHref: string
  isOpen: boolean
  isDesktopOpen: boolean
  onClose: () => void
  onToggleDesktop: () => void
  onLogout: () => void
  isLoggingOut?: boolean
}

const sidebarGroups: AdminSidebarGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard/overview' }],
  },
  {
    title: 'Products',
    items: [
      { label: 'Categories', icon: Tags, href: '/admin/categories' },
      { label: 'Authors', icon: UserRound, href: '/admin/authors' },
      { label: 'Books', icon: BookOpen, href: '/admin/dashboard/books' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders', icon: ShoppingCart, href: '/admin/dashboard/orders' },
      { label: 'Customers', icon: Users, href: '/admin/dashboard/customers' },
    ],
  },
]

export function AdminSidebar({
  activeHref,
  isOpen,
  isDesktopOpen,
  onClose,
  onToggleDesktop,
  onLogout,
  isLoggingOut = false,
}: AdminSidebarProps) {
  return (
    <>
      {!isDesktopOpen ? (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-4 top-5 z-50 hidden shadow-lg lg:inline-flex"
          onClick={onToggleDesktop}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <Menu className="size-4" />
        </Button>
      ) : null}

      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-border/70 bg-background px-4 py-5 shadow-xl transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isDesktopOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3 rounded-3xl border border-border/70 bg-muted/20 p-4 lg:bg-background">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <LibraryBig className="size-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Admin</p>
              <h1 className="text-lg font-semibold tracking-tight">Bookstore</h1>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={onToggleDesktop} aria-label="Collapse sidebar" title="Collapse sidebar">
            <X className="size-4" />
          </Button>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <nav className="mt-6 space-y-5">
          {sidebarGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{group.title}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.href === activeHref

                  return (
                    <Button
                      key={item.label}
                      asChild
                      variant={isActive ? 'default' : 'ghost'}
                      className="h-11 w-full justify-start gap-3 rounded-2xl px-3"
                      onClick={onClose}
                    >
                      <Link to={item.href}>
                        <Icon className="size-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {isActive ? <ChevronRight className="size-4" /> : null}
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-6 rounded-3xl border border-border/70 bg-muted/20 p-4">
          <Button variant="outline" className="w-full justify-start" onClick={onLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LogOut className="mr-2 size-4" />}
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar