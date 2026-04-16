import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { FileSpreadsheet, FileText, Loader2, Menu, PencilLine, RefreshCcw, Search, ShieldCheck, Trash2, X } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import AdminSidebar from '../components/admin/AdminSidebar'
import { clearAuthSession, loadAuthSession, logoutAdmin } from '../lib/auth'
import { createAdminAuthor, deleteAdminAuthor, fetchAdminAuthors, updateAdminAuthor, type Author } from '../lib/adminAuthors'
import { exportRowsToExcel, exportRowsToPdf, type ExportColumn } from '../lib/exportTable'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

type AuthorPageMeta = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

const defaultAuthorPageMeta: AuthorPageMeta = {
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 10,
  hasNext: false,
  hasPrevious: false,
}

function normalizeAuthors(value: unknown): Author[] {
  return Array.isArray(value) ? (value as Author[]) : []
}

export function AdminAuthorsPage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [authors, setAuthors] = useState<Author[]>([])
  const [authorPageMeta, setAuthorPageMeta] = useState<AuthorPageMeta>(defaultAuthorPageMeta)
  const [page, setPage] = useState(0)
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [successToastVisible, setSuccessToastVisible] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [biography, setBiography] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [editingAuthorId, setEditingAuthorId] = useState<number | null>(null)
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null)
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null)
  const [pendingDeleteAuthor, setPendingDeleteAuthor] = useState<Author | null>(null)
  const editFormRef = useRef<HTMLDivElement | null>(null)
  const pageSize = 10
  const isEditingAuthor = editingAuthorId !== null
  const canSubmit = name.trim().length > 0 && slug.trim().length > 0 && !isSaving

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logoutAdmin()
      clearAuthSession()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  function showSuccess(message: string) {
    setSuccessMessage(message)
    setSuccessToastVisible(false)

    window.setTimeout(() => setSuccessToastVisible(true), 20)
    window.setTimeout(() => setSuccessToastVisible(false), 2600)
    window.setTimeout(() => setSuccessMessage(null), 3200)
  }

  const loadAuthors = useCallback(
    async (nextPage = page, nextKeyword = keyword) => {
      setIsLoadingAuthors(true)
      setErrorMessage(null)

      try {
        const response = await fetchAdminAuthors({
          page: nextPage,
          size: pageSize,
          keyword: nextKeyword,
          sortBy,
          sortDirection,
          createdFrom,
          createdTo,
        })

        setAuthors(normalizeAuthors(response.data.content))
        setAuthorPageMeta({
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          page: response.data.page,
          size: response.data.size,
          hasNext: response.data.hasNext,
          hasPrevious: response.data.hasPrevious,
        })
        setPage(response.data.page)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load authors.'
        setErrorMessage(message)
      } finally {
        setIsLoadingAuthors(false)
      }
    },
    [createdFrom, createdTo, keyword, page, sortBy, sortDirection],
  )

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    void loadAuthors(page, keyword)
  }, [createdFrom, createdTo, keyword, page, session?.accessToken, loadAuthors, sortBy, sortDirection])

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    const nextKeyword = keywordInput.trim()
    const timeoutId = window.setTimeout(() => {
      setPage(0)
      setKeyword(nextKeyword)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [keywordInput, session?.accessToken])

  useEffect(() => {
    if (!successMessage) {
      setSuccessToastVisible(false)
      return
    }

    const showTimer = window.setTimeout(() => setSuccessToastVisible(true), 20)
    const hideTimer = window.setTimeout(() => setSuccessToastVisible(false), 2600)
    const clearTimer = window.setTimeout(() => setSuccessMessage(null), 3200)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
      window.clearTimeout(clearTimer)
    }
  }, [successMessage])

  async function handleCreateAuthor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setSuccessToastVisible(false)
    setIsSaving(true)

    try {
      const authorInput = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        biography: biography.trim(),
      }

      const response = isEditingAuthor && editingAuthorId !== null
        ? await updateAdminAuthor(editingAuthorId, authorInput)
        : await createAdminAuthor(authorInput)

      const savedAuthor = response.data
      setName('')
      setSlug('')
      setBiography('')
      setEditingAuthorId(null)
      showSuccess(isEditingAuthor ? `Author "${savedAuthor.name}" updated.` : `Author "${savedAuthor.name}" created.`)
      await loadAuthors(0, keyword)
    } catch (error) {
      const message = error instanceof Error ? error.message : isEditingAuthor ? 'Failed to update author.' : 'Failed to create author.'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)

    try {
      await loadAuthors(page, keyword)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function getAuthorsForExport() {
    const response = await fetchAdminAuthors({
      page: 0,
      size: Math.max(authorPageMeta.totalElements, authors.length, 1),
      keyword,
      sortBy,
      sortDirection,
      createdFrom,
      createdTo,
    })

    return normalizeAuthors(response.data.content)
  }

  async function handleExportExcel() {
    setIsExportingExcel(true)
    setErrorMessage(null)

    try {
      const rows = await getAuthorsForExport()
      const columns: ExportColumn<Author>[] = [
        { header: 'ID', value: (row) => row.id },
        { header: 'Name', value: (row) => row.name },
        { header: 'Slug', value: (row) => row.slug },
        { header: 'Biography', value: (row) => row.biography || '' },
        { header: 'Created at', value: (row) => formatDateTime(row.createdAt) },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToExcel(rows, columns, 'authors.xlsx', 'Authors')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export authors to Excel.'
      setErrorMessage(message)
    } finally {
      setIsExportingExcel(false)
    }
  }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    setErrorMessage(null)

    try {
      const rows = await getAuthorsForExport()
      const columns: ExportColumn<Author>[] = [
        { header: 'ID', value: (row) => row.id },
        { header: 'Name', value: (row) => row.name },
        { header: 'Slug', value: (row) => row.slug },
        { header: 'Biography', value: (row) => row.biography || '' },
        { header: 'Created at', value: (row) => formatDateTime(row.createdAt) },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToPdf(rows, columns, 'Authors export', 'authors.pdf')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export authors to PDF.'
      setErrorMessage(message)
    } finally {
      setIsExportingPdf(false)
    }
  }

  function handleStartEditAuthor(author: Author) {
    setEditingAuthorId(author.id)
    setName(author.name)
    setSlug(author.slug)
    setBiography(author.biography ?? '')
    setErrorMessage(null)
    setSuccessMessage(null)
    setSuccessToastVisible(false)
    closeAuthorDetails()
    window.requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleCancelEdit() {
    setEditingAuthorId(null)
    setName('')
    setSlug('')
    setBiography('')
    setErrorMessage(null)
    setSuccessMessage(null)
    setSuccessToastVisible(false)
  }

  function requestDeleteAuthor(author: Author) {
    setPendingDeleteAuthor(author)
  }

  async function confirmDeleteAuthor(author: Author) {
    setErrorMessage(null)
    setSuccessMessage(null)
    setSuccessToastVisible(false)
    setIsDeleting(true)

    try {
      await deleteAdminAuthor(author.id)
      showSuccess(`Author "${author.name}" deleted.`)

      if (selectedAuthorId === author.id) {
        setSelectedAuthor(null)
        setSelectedAuthorId(null)
      }

      setPendingDeleteAuthor(null)
      await loadAuthors(page, keyword)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete author.'
      setErrorMessage(message)
    } finally {
      setIsDeleting(false)
    }
  }

  function handlePageChange(nextPage: number) {
    setPage(Math.max(0, nextPage))
  }

  function handleClearSearch() {
    setKeywordInput('')
    setPage(0)
    setKeyword('')
    setCreatedFrom('')
    setCreatedTo('')
  }

  function handleSelectAuthor(author: Author) {
    setSelectedAuthor(author)
    setSelectedAuthorId(author.id)
  }

  function closeAuthorDetails() {
    setSelectedAuthor(null)
    setSelectedAuthorId(null)
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

  const currentPageMeta = authorPageMeta ?? defaultAuthorPageMeta
  const displayedPage = currentPageMeta.page + 1
  const visibleAuthorCount = authors.length
  const hasDateFilters = Boolean(createdFrom || createdTo)
  const activeFilterLabel = keyword || hasDateFilters ? 'Filtered authors' : 'All authors'
  const sortLabel = `${sortBy === 'name' ? 'Name' : 'Updated at'} ${sortDirection.toUpperCase()}`
  const startItem = currentPageMeta.totalElements === 0 ? 0 : currentPageMeta.page * currentPageMeta.size + 1
  const endItem = Math.min(currentPageMeta.totalElements, currentPageMeta.page * currentPageMeta.size + visibleAuthorCount)
  const authorCardSkeletons = Array.from({ length: 10 }, (_, index) => index)
  const selectedAuthorCard = selectedAuthor ? authors.find((author) => author.id === selectedAuthor.id) ?? selectedAuthor : null

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/authors"
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
                    Admin authors
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Authors</CardTitle>
                <CardDescription>Dedicated workspace for author management only.</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="space-y-5">
                {errorMessage ? (
                  <Alert variant="destructive">
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-border/70 bg-card/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardDescription>Total authors</CardDescription>
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
                      <CardDescription>Pages</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">{Math.max(currentPageMeta.totalPages, 1)}</CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="border-border/70 bg-card/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardDescription>Filter</CardDescription>
                      <CardTitle className="truncate text-lg">{activeFilterLabel}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
                  <div ref={editFormRef} className="scroll-mt-6">
                    <Card className="border-border/70 shadow-sm xl:sticky xl:top-6 xl:self-start">
                      <CardHeader className="border-b bg-muted/20">
                      <CardTitle>{isEditingAuthor ? 'Edit author' : 'Create author'}</CardTitle>
                      <CardDescription>
                        {isEditingAuthor ? 'Update the selected author, then save changes.' : 'Use a short name, slug, and optional biography.'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-5">
                      <form className="space-y-4" onSubmit={handleCreateAuthor}>
                        <div className="space-y-2">
                          <label htmlFor="name" className="text-sm font-medium">
                            Name
                          </label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(event) => {
                              const nextName = event.target.value
                              setName(nextName)

                              if (!slug || slug === slugify(name)) {
                                setSlug(slugify(nextName))
                              }
                            }}
                            placeholder="Mina Sato"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="slug" className="text-sm font-medium">
                            Slug
                          </label>
                          <Input
                            id="slug"
                            value={slug}
                            onChange={(event) => setSlug(slugify(event.target.value))}
                            placeholder="mina-sato"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="biography" className="text-sm font-medium">
                            Biography
                          </label>
                          <textarea
                            id="biography"
                            value={biography}
                            onChange={(event) => setBiography(event.target.value)}
                            placeholder="Short author biography"
                            className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={!canSubmit || isSaving}>
                          {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                          {isSaving ? 'Saving...' : isEditingAuthor ? 'Update author' : 'Create author'}
                        </Button>

                        {isEditingAuthor ? (
                          <Button type="button" variant="outline" className="w-full" onClick={handleCancelEdit} disabled={isSaving}>
                            Cancel edit
                          </Button>
                        ) : null}
                      </form>
                    </CardContent>
                    </Card>
                  </div>

                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex w-full flex-col gap-3">
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="relative w-full sm:w-72">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={keywordInput}
                            onChange={(event) => setKeywordInput(event.target.value)}
                            placeholder="Search authors"
                            className="h-9 w-full pl-9"
                          />
                        </div>

                        {keyword || keywordInput ? (
                          <Button type="button" size="sm" variant="outline" onClick={handleClearSearch}>
                            Clear
                          </Button>
                        ) : null}

                        <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={isRefreshing}>
                          <RefreshCcw className={isRefreshing ? 'mr-2 size-4 animate-spin' : 'mr-2 size-4'} />
                          Refresh
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => void handleExportExcel()} disabled={isExportingExcel}>
                          {isExportingExcel ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileSpreadsheet className="mr-2 size-4" />}
                          Excel
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => void handleExportPdf()} disabled={isExportingPdf}>
                          {isExportingPdf ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
                          PDF
                        </Button>
                      </div>

                      <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Sort by</label>
                          <select
                            value={sortBy}
                            onChange={(event) => {
                              setPage(0)
                              setSortBy(event.target.value as 'name' | 'updatedAt')
                            }}
                            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            <option value="name">Name</option>
                            <option value="updatedAt">Updated at</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Direction</label>
                          <select
                            value={sortDirection}
                            onChange={(event) => {
                              setPage(0)
                              setSortDirection(event.target.value as 'asc' | 'desc')
                            }}
                            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          >
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">From</label>
                          <Input type="date" value={createdFrom} onChange={(event) => { setPage(0); setCreatedFrom(event.target.value) }} className="h-9" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">To</label>
                          <Input type="date" value={createdTo} onChange={(event) => { setPage(0); setCreatedTo(event.target.value) }} className="h-9" />
                        </div>
                      </div>
                    </div>
                    </CardHeader>

                    <CardContent className="space-y-4 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                        <span>
                          {visibleAuthorCount} visible {visibleAuthorCount === 1 ? 'author' : 'authors'}
                        </span>
                        {keyword ? <Badge variant="outline">Keyword: {keyword}</Badge> : null}
                        <Badge variant="outline">Sort: {sortLabel}</Badge>
                        {createdFrom || createdTo ? (
                          <Badge variant="outline">
                            Created {createdFrom || '...'} - {createdTo || '...'}
                          </Badge>
                        ) : null}
                        {!keyword && !hasDateFilters ? <Badge variant="outline">No filter</Badge> : null}
                      </div>

                      {isLoadingAuthors ? (
                        <div className="space-y-3">
                          {authorCardSkeletons.map((item) => (
                            <div key={item} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                  </div>
                                  <Skeleton className="h-4 w-56" />
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : authors.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                          No authors match your current search.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {authors.map((author) => (
                            <div
                              key={author.id}
                              onClick={() => handleSelectAuthor(author)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  handleSelectAuthor(author)
                                }
                              }}
                              className="w-full cursor-pointer rounded-2xl border border-border/70 bg-background p-4 text-left shadow-sm transition-colors hover:bg-muted/20"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-base font-semibold">{author.name}</h3>
                                    <Badge variant="outline">{author.slug}</Badge>
                                  </div>
                                  <p className="text-sm leading-6 text-muted-foreground">{author.biography || 'No biography provided.'}</p>
                                  <p className="text-xs text-muted-foreground">Last updated {formatDateTime(author.updatedAt)}</p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="size-9 rounded-xl"
                                    aria-label={`Edit ${author.name}`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleStartEditAuthor(author)
                                    }}
                                  >
                                    <PencilLine className="size-4" />
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="size-9 rounded-xl"
                                    aria-label={`Delete ${author.name}`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      requestDeleteAuthor(author)
                                    }}
                                    disabled={isSaving}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4 border-t bg-muted/10 px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="space-y-1">
                        <span>{currentPageMeta.totalElements} total authors </span>
                        <span>
                          Showing {startItem} to {endItem} of {currentPageMeta.totalElements}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={!currentPageMeta.hasPrevious || page <= 0}
                        >
                          Prev
                        </Button>

                        <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-background p-1">
                          {currentPageMeta.totalPages > 0
                            ? getVisiblePageNumbers(currentPageMeta.totalPages, currentPageMeta.page).map((pageNumber, index, array) => {
                                const previousPageNumber = array[index - 1]
                                const isGap = typeof previousPageNumber === 'number' && pageNumber - previousPageNumber > 1

                                return (
                                  <span key={pageNumber} className="contents">
                                    {isGap ? <span className="px-2 text-sm text-muted-foreground">...</span> : null}
                                    <Button
                                      type="button"
                                      variant={pageNumber === displayedPage ? 'default' : 'ghost'}
                                      size="sm"
                                      className="min-w-10 rounded-xl px-3"
                                      onClick={() => handlePageChange(pageNumber - 1)}
                                    >
                                      {pageNumber}
                                    </Button>
                                  </span>
                                )
                              })
                            : null}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={!currentPageMeta.hasNext}
                        >
                          Next
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {selectedAuthorCard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true" aria-label="Author details">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close author details backdrop" onClick={closeAuthorDetails} />

          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b bg-muted/20 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Author details</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{selectedAuthorCard.name}</h2>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={closeAuthorDetails}>
                Close
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">ID {selectedAuthorCard.id}</Badge>
                <Badge variant="outline">Slug: {selectedAuthorCard.slug}</Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Biography</p>
                <p className="text-sm leading-6">{selectedAuthorCard.biography || 'No biography provided.'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Created</p>
                  <p className="mt-2 text-sm">{formatDateTime(selectedAuthorCard.createdAt)}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Updated</p>
                  <p className="mt-2 text-sm">{formatDateTime(selectedAuthorCard.updatedAt)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="destructive" onClick={() => requestDeleteAuthor(selectedAuthorCard)} disabled={isSaving}>
                  <Trash2 className="mr-2 size-4" />
                  Delete author
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleStartEditAuthor(selectedAuthorCard)
                  }}
                >
                  <PencilLine className="mr-2 size-4" />
                  Edit author
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteAuthor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true" aria-label="Delete author confirmation">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close delete confirmation backdrop"
            onClick={() => setPendingDeleteAuthor(null)}
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl">
            <div className="border-b bg-muted/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Delete author</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Are you sure?</h2>
            </div>

            <div className="space-y-5 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                This will permanently delete <span className="font-semibold text-foreground">{pendingDeleteAuthor.name}</span>. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteAuthor(null)} disabled={isDeleting}>
                  Cancel
                </Button>

                <Button type="button" variant="destructive" onClick={() => void confirmDeleteAuthor(pendingDeleteAuthor)} disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete author'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <div
          className={[
            'fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-border/70 bg-background px-4 py-3 shadow-2xl transition-all duration-500 ease-out',
            successToastVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Saved</p>
              <p className="mt-1 text-sm text-muted-foreground">{successMessage}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="-mr-1 -mt-1 size-8" onClick={() => setSuccessToastVisible(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default AdminAuthorsPage
