import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BadgeCheck, Mail, Menu, UserCircle2 } from 'lucide-react'

import AdminSidebar from '../components/admin/AdminSidebar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { clearAuthSession, loadAuthSession, logoutAdmin } from '../lib/auth'
import { fetchAdminProfile, type AdminProfile as AdminMeProfile } from '../lib/adminProfile'

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function AdminProfilePage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profile, setProfile] = useState<AdminMeProfile | null>(null)

  useEffect(() => {
    let isActive = true

    fetchAdminProfile()
      .then((response) => {
        if (isActive) {
          setProfile(response.data)
        }
      })
      .catch(() => {
        if (isActive && session?.user) {
          setProfile({
            ...session.user,
            avatarUrl: session.user.avatarUrl,
            updatedAt: session.user.updatedAt ?? session.user.createdAt,
          })
        }
      })

    return () => {
      isActive = false
    }
  }, [session?.user])

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logoutAdmin()
      clearAuthSession()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  const displayedProfile = profile ?? session.user
  const initials = displayedProfile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/profile"
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
                    <UserCircle2 className="size-3.5" />
                    Admin profile
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Profile</CardTitle>
                <CardDescription>Review the signed-in admin account that powers the sidebar menu.</CardDescription>
              </div>

              <Badge variant="outline" className="w-fit gap-2 self-start sm:self-center">
                <BadgeCheck className="size-3.5" />
                {displayedProfile.role}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle>Identity</CardTitle>
                    <CardDescription>Avatar, name, and contact information.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <div className="flex items-center gap-4">
                      <div className="flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-xl font-semibold text-white shadow-sm">
                        {displayedProfile.avatarUrl ? (
                          <img src={displayedProfile.avatarUrl} alt={displayedProfile.fullName} className="size-full object-cover" />
                        ) : (
                          <span>{initials || 'A'}</span>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <h2 className="truncate text-2xl font-semibold tracking-tight">{displayedProfile.fullName}</h2>
                        <p className="truncate text-sm text-muted-foreground">@{displayedProfile.username}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="outline" className="gap-2">
                            <Mail className="size-3.5" />
                            {displayedProfile.email}
                          </Badge>
                          <Badge variant={displayedProfile.enabled ? 'default' : 'secondary'}>{displayedProfile.enabled ? 'Enabled' : 'Disabled'}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Role</p>
                        <p className="mt-2 text-base font-semibold">{displayedProfile.role}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Email verified</p>
                        <p className="mt-2 text-base font-semibold">{displayedProfile.emailVerified ? 'Verified' : 'Not verified'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle>Account details</CardTitle>
                    <CardDescription>Useful identifiers and timeline information.</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">User ID</p>
                        <p className="mt-2 text-lg font-semibold tabular-nums">{displayedProfile.id}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Username</p>
                        <p className="mt-2 text-lg font-semibold">{displayedProfile.username}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Created</p>
                        <p className="mt-2 text-sm font-semibold leading-6">{formatDate(displayedProfile.createdAt)}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Updated</p>
                        <p className="mt-2 text-sm font-semibold leading-6">{formatDate(displayedProfile.updatedAt ?? displayedProfile.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default AdminProfilePage
