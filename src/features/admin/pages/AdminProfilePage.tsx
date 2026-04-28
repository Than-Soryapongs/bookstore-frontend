import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { BadgeCheck, Mail, Menu, UserCircle2 } from 'lucide-react'

import AdminSidebar from '../components/AdminSidebar'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { loadAuthSession, logout, saveAuthSession } from '../../shared/auth'
import { fetchAdminProfile, type AdminProfile as AdminMeProfile, updateAdminName, updateAdminUsername, uploadAdminAvatar } from '../lib/adminProfile'

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
  const sessionAccessToken = session?.accessToken
  const sessionAvatarUrl = session?.user.avatarUrl
  const sessionCreatedAt = session?.user.createdAt
  const sessionEmail = session?.user.email
  const sessionEnabled = session?.user.enabled
  const sessionEmailVerified = session?.user.emailVerified
  const sessionFullName = session?.user.fullName
  const sessionId = session?.user.id
  const sessionRole = session?.user.role
  const sessionUpdatedAt = session?.user.updatedAt
  const sessionUsername = session?.user.username
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [profile, setProfile] = useState<AdminMeProfile | null>(null)
  const [usernameInput, setUsernameInput] = useState(() => session?.user.username ?? '')
  const [fullNameInput, setFullNameInput] = useState(() => session?.user.fullName ?? '')
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)
  const [isUpdatingFullName, setIsUpdatingFullName] = useState(false)
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [fullNameMessage, setFullNameMessage] = useState<string | null>(null)
  const [fullNameError, setFullNameError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    fetchAdminProfile()
      .then((response) => {
        if (isActive) {
          setProfile(response.data)
          setUsernameInput(response.data.username)
          setFullNameInput(response.data.fullName)
        }
      })
      .catch(() => {
        if (isActive && sessionAccessToken) {
          setProfile({
            id: sessionId as number,
            username: sessionUsername as string,
            fullName: sessionFullName as string,
            avatarUrl: sessionAvatarUrl,
            email: sessionEmail as string,
            role: sessionRole as string,
            emailVerified: Boolean(sessionEmailVerified),
            enabled: Boolean(sessionEnabled),
            createdAt: sessionCreatedAt as string,
            updatedAt: sessionUpdatedAt ?? (sessionCreatedAt as string),
          })
        }
      })

    return () => {
      isActive = false
    }
  }, [
    sessionAccessToken,
    sessionAvatarUrl,
    sessionCreatedAt,
    sessionEmail,
    sessionEmailVerified,
    sessionEnabled,
    sessionFullName,
    sessionId,
    sessionRole,
    sessionUpdatedAt,
    sessionUsername,
  ])

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  async function handleAvatarUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAvatarMessage(null)

    if (!selectedAvatarFile) {
      setAvatarMessage('Select an avatar image first.')
      return
    }

    setIsUploadingAvatar(true)

    try {
      const response = await uploadAdminAvatar(selectedAvatarFile, avatarUrlInput.trim() || undefined)
      setProfile(response.data)
      setUsernameInput(response.data.username)
      setFullNameInput(response.data.fullName)
      if (session?.accessToken) {
        saveAuthSession({
          accessToken: session.accessToken,
          user: response.data,
        })
      }
      setAvatarMessage('Avatar updated successfully.')
      setSelectedAvatarFile(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update avatar.'
      setAvatarMessage(message)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function handleUsernameUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextUsername = usernameInput.trim()

    if (!nextUsername) {
      setUsernameError('Username cannot be empty.')
      return
    }

    if (nextUsername === displayedProfile.username) {
      setUsernameMessage('Username is already up to date.')
      setUsernameError(null)
      return
    }

    setUsernameError(null)
    setUsernameMessage(null)
    setIsUpdatingUsername(true)

    try {
      const response = await updateAdminUsername(nextUsername)
      const nextProfile = response.data

      setProfile(nextProfile)
      setUsernameInput(nextProfile.username)
      setFullNameInput(nextProfile.fullName)

      if (session?.accessToken) {
        saveAuthSession({
          accessToken: session.accessToken,
          user: nextProfile,
        })
      }

      setUsernameMessage(response.message || 'Username updated successfully.')
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : 'Unable to update username.')
    } finally {
      setIsUpdatingUsername(false)
    }
  }

  async function handleFullNameUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextFullName = fullNameInput.trim()

    if (!nextFullName) {
      setFullNameError('Full name cannot be empty.')
      return
    }

    if (nextFullName === displayedProfile.fullName) {
      setFullNameMessage('Full name is already up to date.')
      setFullNameError(null)
      return
    }

    setFullNameError(null)
    setFullNameMessage(null)
    setIsUpdatingFullName(true)

    try {
      const response = await updateAdminName(nextFullName)
      const nextProfile = response.data

      setProfile(nextProfile)
      setUsernameInput(nextProfile.username)
      setFullNameInput(nextProfile.fullName)

      if (session?.accessToken) {
        saveAuthSession({
          accessToken: session.accessToken,
          user: nextProfile,
        })
      }

      setFullNameMessage(response.message || 'Full name updated successfully.')
    } catch (error) {
      setFullNameError(error instanceof Error ? error.message : 'Unable to update full name.')
    } finally {
      setIsUpdatingFullName(false)
    }
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  const fallbackProfile = session?.user ?? null
  const displayedProfile = profile ?? fallbackProfile

  if (!displayedProfile) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background dark:text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <Card className="w-full max-w-2xl border-border/70 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Admin profile unavailable</CardTitle>
              <CardDescription>
                The account session is missing profile details. Refresh the page or sign in again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background p-4 text-sm text-muted-foreground">
                We could not load the signed-in admin profile from memory.
              </div>
              <Button asChild>
                <Link to="/admin/login">Go to admin login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

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

                    <form className="space-y-4 rounded-2xl border border-border/70 bg-background p-4" onSubmit={handleAvatarUpload}>
                      <div className="space-y-2">
                        <label htmlFor="avatarFile" className="text-sm font-medium">
                          Avatar image
                        </label>
                        <input
                          id="avatarFile"
                          type="file"
                          accept="image/*"
                          className="block w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                          onChange={(event) => setSelectedAvatarFile(event.target.files?.[0] ?? null)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="avatarUrl" className="text-sm font-medium">
                          Avatar URL
                        </label>
                        <input
                          id="avatarUrl"
                          type="text"
                          value={avatarUrlInput}
                          onChange={(event) => setAvatarUrlInput(event.target.value)}
                          placeholder="https://... or leave blank"
                          className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                      </div>

                      {avatarMessage ? <p className="text-sm text-muted-foreground">{avatarMessage}</p> : null}

                      <Button type="submit" className="h-11" disabled={isUploadingAvatar}>
                        {isUploadingAvatar ? 'Updating avatar...' : 'Update avatar'}
                      </Button>
                    </form>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <form className="space-y-3 rounded-2xl border border-border/70 bg-background p-4" onSubmit={handleFullNameUpdate}>
                        <div>
                          <p className="text-sm font-semibold">Full name</p>
                          <p className="text-xs text-muted-foreground">Update the display name shown to customers and in admin views.</p>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="admin-fullName" className="text-sm font-medium">
                            New full name
                          </label>
                          <Input
                            id="admin-fullName"
                            value={fullNameInput}
                            onChange={(event) => setFullNameInput(event.target.value)}
                            autoComplete="name"
                            placeholder="Enter your full name"
                          />
                        </div>

                        {fullNameError ? <p className="text-sm text-destructive">{fullNameError}</p> : null}
                        {fullNameMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{fullNameMessage}</p> : null}

                        <Button type="submit" className="h-11 w-full" disabled={isUpdatingFullName}>
                          {isUpdatingFullName ? 'Updating full name...' : 'Update full name'}
                        </Button>
                      </form>

                      <form className="space-y-3 rounded-2xl border border-border/70 bg-background p-4" onSubmit={handleUsernameUpdate}>
                        <div>
                          <p className="text-sm font-semibold">Username</p>
                          <p className="text-xs text-muted-foreground">Change the handle used to sign in and identify the account.</p>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="admin-username" className="text-sm font-medium">
                            New username
                          </label>
                          <Input
                            id="admin-username"
                            value={usernameInput}
                            onChange={(event) => setUsernameInput(event.target.value)}
                            autoComplete="username"
                            placeholder="Enter your username"
                          />
                        </div>

                        {usernameError ? <p className="text-sm text-destructive">{usernameError}</p> : null}
                        {usernameMessage ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{usernameMessage}</p> : null}

                        <Button type="submit" className="h-11 w-full" disabled={isUpdatingUsername}>
                          {isUpdatingUsername ? 'Updating username...' : 'Update username'}
                        </Button>
                      </form>
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
