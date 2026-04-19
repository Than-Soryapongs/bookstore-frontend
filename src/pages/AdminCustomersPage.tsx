import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Loader2, Menu, RefreshCcw, Search, ShieldCheck, UserRound, X } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import AdminSidebar from '../components/admin/AdminSidebar'
import { Input } from '../components/ui/input'
import { clearAuthSession, loadAuthSession, logoutAdmin } from '../lib/auth'
import { fetchAdminUser, fetchAdminUsers, patchAdminUserEnabled, type AdminUser } from '../lib/adminUsers'
import { exportRowsToExcel, exportRowsToPdf, type ExportColumn } from '../lib/exportTable'

type UserPageMeta = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

const defaultUserPageMeta: UserPageMeta = {
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 20,
  hasNext: false,
  hasPrevious: false,
}

function normalizeUsers(value: unknown): AdminUser[] {
  return Array.isArray(value) ? (value as AdminUser[]) : []
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatBoolLabel(value: boolean) {
  return value ? 'Yes' : 'No'
}

function getEnabledOptions() {
  return [
    { value: '', label: 'All' },
    { value: 'true', label: 'Enabled' },
    { value: 'false', label: 'Disabled' },
  ]
}

function getVerificationOptions() {
  return [
    { value: '', label: 'All' },
    { value: 'true', label: 'Verified' },
    { value: 'false', label: 'Unverified' },
  ]
}

export function AdminCustomersPage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userPageMeta, setUserPageMeta] = useState<UserPageMeta>(defaultUserPageMeta)
  const [page, setPage] = useState(0)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [enabled, setEnabled] = useState('')
  const [emailVerified, setEmailVerified] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'username' | 'fullName'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [selectedUserEnabled, setSelectedUserEnabled] = useState(false)
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false)
  const [userDetailErrorMessage, setUserDetailErrorMessage] = useState<string | null>(null)
  const [isUpdatingUserEnabled, setIsUpdatingUserEnabled] = useState(false)
  const pageSize = 20

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logoutAdmin()
      clearAuthSession()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  const loadUsers = useCallback(
    async (nextPage = page) => {
      setIsLoadingUsers(true)
      setPageErrorMessage(null)

      try {
        const response = await fetchAdminUsers({
          page: nextPage,
          size: pageSize,
          keyword,
          enabled,
          emailVerified,
          sortBy,
          sortDirection,
        })

        setUsers(normalizeUsers(response.data.content))
        setUserPageMeta({
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          page: response.data.page,
          size: response.data.size,
          hasNext: response.data.hasNext,
          hasPrevious: response.data.hasPrevious,
        })
        setPage(response.data.page)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load customers.'
        setPageErrorMessage(message)
      } finally {
        setIsLoadingUsers(false)
      }
    },
    [enabled, emailVerified, keyword, page, pageSize, sortBy, sortDirection],
  )

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    void loadUsers(page)
  }, [loadUsers, page, session?.accessToken])

  useEffect(() => {
    if (!selectedUser) {
      setIsLoadingUserDetails(false)
      setUserDetailErrorMessage(null)
      setIsUpdatingUserEnabled(false)
      setSelectedUserEnabled(false)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedUser(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedUser])

  async function openUserDetails(user: AdminUser) {
    setSelectedUser(user)
    setSelectedUserEnabled(user.enabled)
    setIsLoadingUserDetails(true)
    setUserDetailErrorMessage(null)
    setIsUpdatingUserEnabled(false)

    try {
      const response = await fetchAdminUser(user.id)
      setSelectedUser(response.data)
      setSelectedUserEnabled(response.data.enabled)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load customer details.'
      setUserDetailErrorMessage(message)
    } finally {
      setIsLoadingUserDetails(false)
    }
  }

  async function handleUpdateSelectedUserEnabled(nextEnabled: boolean) {
    if (!selectedUser || isLoadingUserDetails || isUpdatingUserEnabled || selectedUser.enabled === nextEnabled) {
      return
    }

    setIsUpdatingUserEnabled(true)
    setUserDetailErrorMessage(null)

    const previousUser = selectedUser
    const previousEnabled = selectedUserEnabled

    setSelectedUser({ ...selectedUser, enabled: nextEnabled })
    setSelectedUserEnabled(nextEnabled)

    try {
      const response = await patchAdminUserEnabled(selectedUser.id, nextEnabled)
      const updatedUser = response.data

      setSelectedUser(updatedUser)
      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user)))
    } catch (error) {
      setSelectedUser(previousUser)
      setSelectedUserEnabled(previousEnabled)
      const message = error instanceof Error ? error.message : 'Failed to update customer enabled state.'
      setUserDetailErrorMessage(message)
    } finally {
      setIsUpdatingUserEnabled(false)
    }
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  async function handleRefresh() {
    setIsRefreshing(true)

    try {
      await loadUsers(page)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function getUsersForExport() {
    const response = await fetchAdminUsers({
      page: 0,
      size: Math.max(currentPageMeta.totalElements, users.length, 1),
      keyword,
      enabled,
      emailVerified,
      sortBy,
      sortDirection,
    })

    return normalizeUsers(response.data.content)
  }

  async function handleExportExcel() {
    setIsExportingExcel(true)
    setPageErrorMessage(null)

    try {
      const rows = await getUsersForExport()
      const columns: ExportColumn<AdminUser>[] = [
        { header: 'ID', value: (row) => row.id },
        { header: 'Username', value: (row) => row.username },
        { header: 'Full name', value: (row) => row.fullName },
        { header: 'Email', value: (row) => row.email },
        { header: 'Role', value: (row) => row.role },
        { header: 'Email verified', value: (row) => row.emailVerified },
        { header: 'Enabled', value: (row) => row.enabled },
        { header: 'Created at', value: (row) => formatDateTime(row.createdAt) },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToExcel(rows, columns, 'customers.xlsx', 'Customers')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export customers to Excel.'
      setPageErrorMessage(message)
    } finally {
      setIsExportingExcel(false)
    }
  }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    setPageErrorMessage(null)

    try {
      const rows = await getUsersForExport()
      const columns: ExportColumn<AdminUser>[] = [
        { header: 'Username', value: (row) => row.username },
        { header: 'Full name', value: (row) => row.fullName },
        { header: 'Email', value: (row) => row.email },
        { header: 'Role', value: (row) => row.role },
        { header: 'Verified', value: (row) => row.emailVerified },
        { header: 'Enabled', value: (row) => row.enabled },
        { header: 'Created at', value: (row) => formatDateTime(row.createdAt) },
      ]

      exportRowsToPdf(rows, columns, 'Customers export', 'customers.pdf')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export customers to PDF.'
      setPageErrorMessage(message)
    } finally {
      setIsExportingPdf(false)
    }
  }

  function handleClearFilters() {
    setPage(0)
    setKeyword('')
    setEnabled('')
    setEmailVerified('')
    setSortBy('createdAt')
    setSortDirection('desc')
  }

  function handlePageChange(nextPage: number) {
    setPage(Math.max(0, nextPage))
  }

  function getVisiblePageNumbers(totalPages: number, currentPageIndex: number) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }

    const currentPageNumber = currentPageIndex + 1
    const pages = new Set<number>([1, totalPages])

    for (let offset = -1; offset <= 1; offset += 1) {
      const candidate = currentPageNumber + offset
      if (candidate > 1 && candidate < totalPages) {
        pages.add(candidate)
      }
    }

    return Array.from(pages).sort((left, right) => left - right)
  }

  const currentPageMeta = userPageMeta ?? defaultUserPageMeta
  const displayedPage = currentPageMeta.page + 1
  const visibleUserCount = users.length
  const activeFilterLabel = keyword || enabled || emailVerified ? 'Filtered customers' : 'All customers'
  const startItem = currentPageMeta.totalElements === 0 ? 0 : currentPageMeta.page * currentPageMeta.size + 1
  const endItem = Math.min(currentPageMeta.totalElements, currentPageMeta.page * currentPageMeta.size + visibleUserCount)
  const visiblePageNumbers = getVisiblePageNumbers(currentPageMeta.totalPages, currentPageMeta.page)
  const enabledCount = users.filter((user) => user.enabled).length
  const verifiedCount = users.filter((user) => user.emailVerified).length

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/dashboard/customers"
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
                    Customers
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Customers</CardTitle>
                <CardDescription>Manage user accounts, access, and verification state.</CardDescription>
              </div>

            </CardHeader>

            <CardContent className="space-y-5 p-5 sm:p-6">
              {pageErrorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription>{pageErrorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Total customers</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{currentPageMeta.totalElements}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Current page</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{displayedPage}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Enabled on page</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{enabledCount}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Verified on page</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{verifiedCount}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="space-y-4 rounded-3xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Search</span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={keyword}
                        onChange={(event) => {
                          setPage(0)
                          setKeyword(event.target.value)
                        }}
                        placeholder="Search customers"
                        className="h-10 pl-9"
                      />
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Enabled</span>
                    <select
                      value={enabled}
                      onChange={(event) => {
                        setPage(0)
                        setEnabled(event.target.value)
                      }}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {getEnabledOptions().map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Email verified</span>
                    <select
                      value={emailVerified}
                      onChange={(event) => {
                        setPage(0)
                        setEmailVerified(event.target.value)
                      }}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {getVerificationOptions().map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={handleClearFilters}>
                      Clear filters
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={() => void handleRefresh()} disabled={isRefreshing}>
                      {isRefreshing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
                      Refresh
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={() => void handleExportExcel()} disabled={isExportingExcel || isLoadingUsers}>
                      {isExportingExcel ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileSpreadsheet className="mr-2 size-4" />}
                      Excel
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={() => void handleExportPdf()} disabled={isExportingPdf || isLoadingUsers}>
                      {isExportingPdf ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
                      PDF
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.8fr_0.8fr_0.8fr]">
                  <label className="space-y-2">
                    <span className="text-sm font-medium">Sort by</span>
                    <select
                      value={sortBy}
                      onChange={(event) => {
                        setPage(0)
                        setSortBy(event.target.value as typeof sortBy)
                      }}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <option value="createdAt">Created at</option>
                      <option value="updatedAt">Updated at</option>
                      <option value="username">Username</option>
                      <option value="fullName">Full name</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium">Direction</span>
                    <select
                      value={sortDirection}
                      onChange={(event) => {
                        setPage(0)
                        setSortDirection(event.target.value as typeof sortDirection)
                      }}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </label>

                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{activeFilterLabel}</Badge>
                    {keyword ? <Badge variant="outline">Keyword: {keyword}</Badge> : null}
                    {enabled ? <Badge variant="outline">Enabled: {formatBoolLabel(enabled === 'true')}</Badge> : null}
                    {emailVerified ? <Badge variant="outline">Verified: {formatBoolLabel(emailVerified === 'true')}</Badge> : null}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Showing {startItem} to {endItem} of {currentPageMeta.totalElements} customers
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-border/70 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="bg-muted/30 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Verified</th>
                        <th className="px-4 py-3 font-semibold">Enabled</th>
                        <th className="px-4 py-3 font-semibold">Created at</th>
                        <th className="px-4 py-3 font-semibold">Updated at</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70 bg-background">
                      {isLoadingUsers ? (
                        Array.from({ length: 10 }, (_, index) => index).map((index) => (
                          <tr key={index} className="animate-pulse">
                            <td className="px-4 py-4">
                              <div className="h-4 w-40 rounded bg-muted" />
                              <div className="mt-2 h-3 w-28 rounded bg-muted" />
                            </td>
                            <td className="px-4 py-4"><div className="h-4 w-16 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-4 w-44 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-5 w-20 rounded-full bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-5 w-20 rounded-full bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-4 w-32 rounded bg-muted" /></td>
                            <td className="px-4 py-4"><div className="h-4 w-32 rounded bg-muted" /></td>
                            <td className="px-4 py-4 text-right"><div className="ml-auto h-8 w-20 rounded-full bg-muted" /></td>
                          </tr>
                        ))
                      ) : users.length > 0 ? (
                        users.map((user) => (
                          <tr
                            key={user.id}
                            className="cursor-pointer transition hover:bg-muted/30"
                            onClick={() => void openUserDetails(user)}
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/20">
                                  {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.fullName || user.username} className="size-full object-cover" loading="lazy" />
                                  ) : (
                                    <UserRound className="size-5 text-muted-foreground" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="font-medium text-foreground">{user.fullName || user.username}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">@{user.username}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">{user.role}</td>
                            <td className="px-4 py-4 text-muted-foreground">{user.email}</td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={user.emailVerified ? 'border-emerald-300/70 bg-emerald-50 text-emerald-700' : 'border-amber-300/70 bg-amber-50 text-amber-800'}>
                                {user.emailVerified ? 'Verified' : 'Unverified'}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={user.enabled ? 'border-sky-300/70 bg-sky-50 text-sky-700' : 'border-slate-300/70 bg-slate-50 text-slate-700'}>
                                {user.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{formatDateTime(user.createdAt)}</td>
                            <td className="px-4 py-4 text-muted-foreground">{formatDateTime(user.updatedAt)}</td>
                            <td className="px-4 py-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void openUserDetails(user)
                                }}
                              >
                                View
                                <ChevronRight className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">
                            No customers found for the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {startItem} to {endItem} of {currentPageMeta.totalElements} customers
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPageMeta.page - 1)}
                    disabled={!currentPageMeta.hasPrevious}
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Previous
                  </Button>

                  {visiblePageNumbers.map((pageNumber) => {
                    const isCurrent = pageNumber === currentPageMeta.page + 1

                    return (
                      <Button
                        key={pageNumber}
                        variant={isCurrent ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber - 1)}
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPageMeta.page + 1)}
                    disabled={!currentPageMeta.hasNext}
                  >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {selectedUser ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6 sm:py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-details-title"
          onClick={() => setSelectedUser(null)}
        >
          <Card
            className="flex max-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col overflow-hidden border-border/70 shadow-2xl sm:max-h-[calc(100vh-4rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b bg-muted/20">
              <div className="space-y-1">
                <Badge variant="outline" className={selectedUser.enabled ? 'border-sky-300/70 bg-sky-50 text-sky-700' : 'border-slate-300/70 bg-slate-50 text-slate-700'}>
                  {selectedUser.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <CardTitle id="customer-details-title" className="text-2xl tracking-tight">
                  {selectedUser.fullName || selectedUser.username}
                </CardTitle>
                <CardDescription>Customer profile, account state, and verification details.</CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center overflow-hidden rounded-2xl border border-border/70 bg-background p-1">
                  <button
                    type="button"
                    className={`h-10 min-w-24 rounded-xl px-4 text-sm font-medium transition ${
                      selectedUserEnabled
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                    onClick={() => void handleUpdateSelectedUserEnabled(true)}
                    disabled={isLoadingUserDetails || isUpdatingUserEnabled || selectedUserEnabled}
                    aria-pressed={selectedUserEnabled}
                  >
                    Enable
                  </button>

                  <button
                    type="button"
                    className={`h-10 min-w-24 rounded-xl px-4 text-sm font-medium transition ${
                      !selectedUserEnabled
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                    onClick={() => void handleUpdateSelectedUserEnabled(false)}
                    disabled={isLoadingUserDetails || isUpdatingUserEnabled || !selectedUserEnabled}
                    aria-pressed={!selectedUserEnabled}
                  >
                    Disable
                  </button>
                </div>

                <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)} aria-label="Close customer details">
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
              {isLoadingUserDetails ? (
                <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted" />
                    ))}
                  </div>
                </div>
              ) : null}

              {userDetailErrorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not load details</AlertTitle>
                  <AlertDescription>{userDetailErrorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Username</CardDescription>
                    <CardTitle className="text-lg">{selectedUser.username}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Role</CardDescription>
                    <CardTitle className="text-lg">{selectedUser.role}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Email verified</CardDescription>
                    <CardTitle className="text-lg">{formatBoolLabel(selectedUser.emailVerified)}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Enabled</CardDescription>
                    <CardTitle className={`text-lg ${selectedUser.enabled ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatBoolLabel(selectedUser.enabled)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-start">
                <div className="flex justify-center">
                  <div className="flex size-28 items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-muted/20">
                    {selectedUser.avatarUrl ? (
                      <img src={selectedUser.avatarUrl} alt={selectedUser.fullName || selectedUser.username} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <UserRound className="size-12 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Full name</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedUser.fullName || 'N/A'}</p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Email</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{selectedUser.email}</p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Created at</p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(selectedUser.createdAt)}</p>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Updated at</p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(selectedUser.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  )
}

export default AdminCustomersPage