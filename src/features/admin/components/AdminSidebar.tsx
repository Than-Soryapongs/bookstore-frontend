import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, BookOpen, ChevronRight, ChevronUp, CircleUserRound, CreditCard, LayoutDashboard, LibraryBig, Loader2, LockKeyhole, LogOut, Menu, ShoppingCart, Tags, Users, UserRound, X, type LucideIcon } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { fetchAdminProfile, subscribeAdminProfileUpdates, type AdminProfile } from '../lib/adminProfile'
import { loadAuthSession } from '../../shared/auth'

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

type SidebarAdminProfile = Pick<AdminProfile, 'avatarUrl' | 'email' | 'fullName' | 'role' | 'username'>

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
  {
    title: 'Tools',
    items: [
      { label: 'AI Assistance', icon: Bot, href: '/admin/dashboard/ai-assistance' },
      { label: 'POS', icon: CreditCard, href: '/admin/dashboard/pos' },
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
  const session = loadAuthSession()
  const sessionAccessToken = session?.accessToken
  const sessionAvatarUrl = session?.user.avatarUrl
  const sessionEmail = session?.user.email
  const sessionFullName = session?.user.fullName
  const sessionRole = session?.user.role
  const sessionUsername = session?.user.username
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [adminProfile, setAdminProfile] = useState<SidebarAdminProfile | null>(() =>
    session?.user
      ? {
          avatarUrl: session.user.avatarUrl,
          email: session.user.email,
          fullName: session.user.fullName,
          role: session.user.role,
          username: session.user.username,
        }
      : null,
  )

  useEffect(() => {
    let isActive = true

    fetchAdminProfile()
      .then((response) => {
        if (isActive) {
          setAdminProfile(response.data)
        }
      })
      .catch(() => {
        if (isActive && sessionAccessToken) {
          setAdminProfile({
            avatarUrl: sessionAvatarUrl,
            email: sessionEmail as string,
            fullName: sessionFullName as string,
            role: sessionRole as string,
            username: sessionUsername as string,
          })
        }
      })

    return () => {
      isActive = false
    }
  }, [sessionAccessToken, sessionAvatarUrl, sessionEmail, sessionFullName, sessionRole, sessionUsername])

  useEffect(() => {
    return subscribeAdminProfileUpdates((updatedProfile) => {
      setAdminProfile(
        updatedProfile
          ? {
              avatarUrl: updatedProfile.avatarUrl,
              email: updatedProfile.email,
              fullName: updatedProfile.fullName,
              role: updatedProfile.role,
              username: updatedProfile.username,
            }
          : session?.user
            ? {
                avatarUrl: session.user.avatarUrl,
                email: session.user.email,
                fullName: session.user.fullName,
                role: session.user.role,
                username: session.user.username,
              }
            : null,
      )
    })
  }, [session])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    if (!isProfileMenuOpen) {
      return undefined
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isProfileMenuOpen])

  const adminInitials = useMemo(() => {
    const name = adminProfile?.fullName?.trim() || adminProfile?.username?.trim() || 'A'
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }, [adminProfile?.fullName, adminProfile?.username])

  function closeProfileMenu() {
    setIsProfileMenuOpen(false)
  }

  function handleLogoutClick() {
    closeProfileMenu()
    onLogout()
  }

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
          'fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-border/70 bg-background px-4 py-5 shadow-xl transition-transform duration-200',
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

        <nav className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
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

        <div ref={profileMenuRef} className="relative mt-6 pb-1">
          {isProfileMenuOpen ? (
            <div className="absolute bottom-full left-0 right-0 z-20 mb-3 rounded-3xl border border-border/70 bg-background p-2 shadow-2xl shadow-black/10">
              <div className="space-y-1">
                <Button asChild variant="ghost" className="h-11 w-full justify-start gap-3 rounded-2xl px-3" onClick={closeProfileMenu}>
                  <Link to="/admin/profile">
                    <CircleUserRound className="size-4" />
                    <span>Profile</span>
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="h-11 w-full justify-start gap-3 rounded-2xl px-3" onClick={closeProfileMenu}>
                  <Link to="/admin/security">
                    <LockKeyhole className="size-4" />
                    <span>Security</span>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  className="h-11 w-full justify-start gap-3 rounded-2xl px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleLogoutClick}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </Button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-3xl border border-border/70 bg-muted/20 p-3 text-left shadow-sm transition-colors hover:bg-muted/40"
            onClick={() => setIsProfileMenuOpen((current) => !current)}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
          >
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-sm font-semibold text-white shadow-sm">
              {adminProfile?.avatarUrl ? (
                <img src={adminProfile.avatarUrl} alt={adminProfile.fullName} className="size-full object-cover" />
              ) : (
                <span>{adminInitials}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-5">{adminProfile?.fullName ?? 'Admin account'}</p>
              <p className="truncate text-xs text-muted-foreground">{adminProfile?.email ?? session?.user.email ?? 'Signed in account'}</p>
            </div>

            <ChevronUp className={`size-4 shrink-0 text-muted-foreground transition-transform ${isProfileMenuOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar