import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertTriangle, LockKeyhole, Menu, ShieldCheck, ShieldEllipsis, ShieldUser, UserRoundCheck } from 'lucide-react'

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

export function AdminSecurityPage() {
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/security"
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
                    <LockKeyhole className="size-3.5" />
                    Admin security
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Security</CardTitle>
                <CardDescription>Account protection details for the signed-in admin.</CardDescription>
              </div>

              <Badge variant="outline" className="w-fit gap-2 self-start sm:self-center">
                <ShieldCheck className="size-3.5" />
                {displayedProfile.role}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-6 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardDescription>Email verification</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <UserRoundCheck className="size-5 text-primary" />
                      {displayedProfile.emailVerified ? 'Verified' : 'Pending'}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardDescription>Account access</CardDescription>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <ShieldUser className="size-5 text-primary" />
                      {displayedProfile.enabled ? 'Enabled' : 'Disabled'}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardDescription>Role</CardDescription>
                    <CardTitle className="text-xl">{displayedProfile.role}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader>
                    <CardDescription>Last updated</CardDescription>
                    <CardTitle className="text-xl">{formatDate(displayedProfile.updatedAt ?? displayedProfile.createdAt)}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle>Protection overview</CardTitle>
                    <CardDescription>What currently protects this admin account.</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-5">
                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <ShieldEllipsis className="size-4 text-muted-foreground" />
                        Session handling
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        The dashboard uses authenticated requests with token refresh so the sidebar profile and secure pages stay in sync.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <AlertTriangle className="size-4 text-muted-foreground" />
                        Password management
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Password and recovery flows can be wired here later without changing the sidebar entry point.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader className="border-b bg-muted/20">
                    <CardTitle>Account snapshot</CardTitle>
                    <CardDescription>Quick reference for the active admin account.</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-5">
                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Email</p>
                      <p className="mt-2 text-base font-semibold">{displayedProfile.email}</p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Username</p>
                      <p className="mt-2 text-base font-semibold">{displayedProfile.username}</p>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Created</p>
                      <p className="mt-2 text-base font-semibold">{formatDate(displayedProfile.createdAt)}</p>
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

export default AdminSecurityPage
