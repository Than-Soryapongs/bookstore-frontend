import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import {
  FileSpreadsheet,
  FileText,
  Loader2,
  Menu,
  PencilLine,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import AdminSidebar from '../components/admin/AdminSidebar'
import { createAdminCategory, deleteAdminCategory, fetchAdminCategories, updateAdminCategory } from '../lib/adminCategories'
import type { Category } from '../lib/adminCategories'
import { clearAuthSession, loadAuthSession, logoutAdmin } from '../lib/auth'
import { exportRowsToExcel, exportRowsToPdf, type ExportColumn } from '../lib/exportTable'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeCategories(value: unknown): Category[] {
  return Array.isArray(value) ? (value as Category[]) : []
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

type CategoryPageMeta = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

const defaultCategoryPageMeta: CategoryPageMeta = {
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 20,
  hasNext: false,
  hasPrevious: false,
}

export function AdminCategoriesPage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryPageMeta, setCategoryPageMeta] = useState<CategoryPageMeta>(defaultCategoryPageMeta)
  const [page, setPage] = useState(0)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [successToastVisible, setSuccessToastVisible] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const sortLabel = `${sortBy === 'name' ? 'Name' : 'Updated at'} ${sortDirection.toUpperCase()}`
  const pageSize = 10
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<Category | null>(null)
  const editFormRef = useRef<HTMLDivElement | null>(null)
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

  const loadCategories = useCallback(
    async (nextPage = page, nextKeyword = keyword) => {
      setIsLoadingCategories(true)
      setErrorMessage(null)

      try {
        const response = await fetchAdminCategories({
          page: nextPage,
          size: pageSize,
          keyword: nextKeyword,
          sortBy,
          sortDirection,
          createdFrom,
          createdTo,
        })

        setCategories(normalizeCategories(response.data.content))
        setCategoryPageMeta({
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          page: response.data.page,
          size: response.data.size,
          hasNext: response.data.hasNext,
          hasPrevious: response.data.hasPrevious,
        })
        setPage(response.data.page)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load categories.'
        setErrorMessage(message)
      } finally {
        setIsLoadingCategories(false)
      }
    }, [createdFrom, createdTo, keyword, page, sortBy, sortDirection],
  )

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    void loadCategories(page, keyword)
  }, [createdFrom, createdTo, keyword, page, session?.accessToken, loadCategories, sortBy, sortDirection])

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

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  async function handleRefresh() {
    setIsRefreshing(true)

    try {
      await loadCategories(page, keyword)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load categories.'
      setErrorMessage(message)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function getCategoriesForExport() {
    const response = await fetchAdminCategories({
      page: 0,
      size: Math.max(categoryPageMeta.totalElements, categories.length, 1),
      keyword,
      sortBy,
      sortDirection,
      createdFrom,
      createdTo,
    })

    return normalizeCategories(response.data.content)
  }

  async function handleExportExcel() {
    setIsExportingExcel(true)
    setErrorMessage(null)

    try {
      const rows = await getCategoriesForExport()
      const columns: ExportColumn<Category>[] = [
        { header: 'ID', value: (row) => row.id },
        { header: 'Name', value: (row) => row.name },
        { header: 'Slug', value: (row) => row.slug },
        { header: 'Description', value: (row) => row.description || '' },
        { header: 'Created at', value: (row) => formatDateTime(row.createdAt) },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToExcel(rows, columns, 'categories.xlsx', 'Categories')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export categories to Excel.'
      setErrorMessage(message)
    } finally {
      setIsExportingExcel(false)
    }
  }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    setErrorMessage(null)

    try {
      const rows = await getCategoriesForExport()
      const columns: ExportColumn<Category>[] = [
        { header: 'ID', value: (row) => row.id },
        { header: 'Name', value: (row) => row.name },
        { header: 'Slug', value: (row) => row.slug },
        { header: 'Description', value: (row) => row.description || '' },
        { header: 'Created at', value: (row) => formatDateTime(row.createdAt) },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToPdf(rows, columns, 'Categories export', 'categories.pdf')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export categories to PDF.'
      setErrorMessage(message)
    } finally {
      setIsExportingPdf(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setSuccessToastVisible(false)
    setIsSaving(true)

    try {
      const categoryInput = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        description: description.trim(),
      }

      if (editingCategoryId !== null) {
        const response = await updateAdminCategory({
          id: editingCategoryId,
          ...categoryInput,
        })

        setSuccessMessage(`Category "${response.data.name}" updated.`)
      } else {
        const response = await createAdminCategory(categoryInput)
        setSuccessMessage(`Category "${response.data.name}" created.`)
      }

      setEditingCategoryId(null)
      setName('')
      setSlug('')
      setDescription('')
      await loadCategories(0, keyword)
    } catch (error) {
      const message = error instanceof Error ? error.message : editingCategoryId !== null ? 'Failed to update category.' : 'Failed to create category.'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  function requestDeleteCategory(category: Category) {
    setPendingDeleteCategory(category)
  }

  async function confirmDeleteCategory(category: Category) {
    setErrorMessage(null)
    setSuccessMessage(null)
    setSuccessToastVisible(false)
    setIsSaving(true)
    setPendingDeleteCategory(null)

    try {
      await deleteAdminCategory(category.id)

      if (selectedCategoryId === category.id) {
        setSelectedCategoryId(null)
      }

      if (editingCategoryId === category.id) {
        setEditingCategoryId(null)
        setName('')
        setSlug('')
        setDescription('')
      }

      setSuccessMessage(`Category "${category.name}" deleted.`)
      await loadCategories(page, keyword)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete category.'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
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

  function handleStartEdit(category: Category) {
    setEditingCategoryId(category.id)
    setName(category.name)
    setSlug(category.slug)
    setDescription(category.description ?? '')
    setErrorMessage(null)
    setSuccessMessage(null)
    window.requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleCancelEdit() {
    setEditingCategoryId(null)
    setName('')
    setSlug('')
    setDescription('')
    setErrorMessage(null)
    setSuccessMessage(null)
    setSuccessToastVisible(false)
  }

  function handleSelectCategory(category: Category) {
    setSelectedCategoryId(category.id)
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

  const currentPageMeta = categoryPageMeta ?? defaultCategoryPageMeta
  const displayedPage = currentPageMeta.page + 1
  const visibleCategoryCount = categories.length
  const hasDateFilters = Boolean(createdFrom || createdTo)
  const activeFilterLabel = keyword || hasDateFilters ? 'Filtered categories' : 'All categories'
  const startItem = currentPageMeta.totalElements === 0 ? 0 : currentPageMeta.page * currentPageMeta.size + 1
  const endItem = Math.min(currentPageMeta.totalElements, currentPageMeta.page * currentPageMeta.size + visibleCategoryCount)
  const categoryCardSkeletons = Array.from({ length: 10 }, (_, index) => index)
  const isEditingCategory = editingCategoryId !== null
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/categories"
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
                    Admin categories
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Categories</CardTitle>
                <CardDescription>Dedicated workspace for category management only.</CardDescription>
              </div>

            </CardHeader>

            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-border/70 bg-card/80 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardDescription>Total categories</CardDescription>
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
                      <CardTitle>{isEditingCategory ? 'Edit category' : 'Create category'}</CardTitle>
                      <CardDescription>
                        {isEditingCategory ? 'Update the name, slug, or description.' : 'Use a short name, slug, and optional description.'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-5">
                      {errorMessage ? (
                        <Alert variant="destructive">
                          <AlertTitle>Something went wrong</AlertTitle>
                          <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                      ) : null}

                      <form className="space-y-4" onSubmit={handleSubmit}>
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
                            placeholder="Fiction"
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
                            placeholder="fiction"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="description" className="text-sm font-medium">
                            Description
                          </label>
                          <textarea
                            id="description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="Optional category description"
                            className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={!canSubmit || isSaving}>
                          {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                          {isSaving ? 'Saving...' : isEditingCategory ? 'Update category' : 'Create category'}
                        </Button>

                        {isEditingCategory ? (
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
                            placeholder="Search categories"
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
                          {visibleCategoryCount} visible {visibleCategoryCount === 1 ? 'category' : 'categories'}
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

                      {isLoadingCategories ? (
                        <div className="space-y-3">
                          {categoryCardSkeletons.map((item) => (
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
                      ) : categories.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                          No categories match your current search.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {categories.map((category) => (
                            <div
                              key={category.id}
                              onClick={() => handleSelectCategory(category)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  handleSelectCategory(category)
                                }
                              }}
                              className="w-full cursor-pointer rounded-2xl border border-border/70 bg-background p-4 text-left shadow-sm transition-colors hover:bg-muted/20"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-base font-semibold">{category.name}</h3>
                                    <Badge variant="outline">{category.slug}</Badge>
                                  </div>
                                  <p className="text-sm leading-6 text-muted-foreground">{category.description || 'No description provided.'}</p>
                                  <p className="text-xs text-muted-foreground">Last updated {formatDateTime(category.updatedAt)}</p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="size-9 rounded-xl"
                                    aria-label={`Edit ${category.name}`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleStartEdit(category)
                                    }}
                                  >
                                    <PencilLine className="size-4" />
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="size-9 rounded-xl"
                                    aria-label={`Delete ${category.name}`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      requestDeleteCategory(category)
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
                        <span>{currentPageMeta.totalElements} total categories </span>
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

      {selectedCategory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" role="dialog" aria-modal="true" aria-label="Category details">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close modal backdrop"
            onClick={() => setSelectedCategoryId(null)}
          />

          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b bg-muted/20 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Category details</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{selectedCategory.name}</h2>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCategoryId(null)}>
                Close
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">ID {selectedCategory.id}</Badge>
                <Badge variant="outline">Slug: {selectedCategory.slug}</Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm leading-6">{selectedCategory.description || 'No description provided.'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Created</p>
                  <p className="mt-2 text-sm">{formatDateTime(selectedCategory.createdAt)}</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Updated</p>
                  <p className="mt-2 text-sm">{formatDateTime(selectedCategory.updatedAt)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => requestDeleteCategory(selectedCategory)}
                  disabled={isSaving}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete category
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleStartEdit(selectedCategory)
                    setSelectedCategoryId(null)
                  }}
                >
                  <PencilLine className="mr-2 size-4" />
                  Edit category
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteCategory ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Delete category confirmation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close delete confirmation backdrop"
            onClick={() => setPendingDeleteCategory(null)}
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl">
            <div className="border-b bg-muted/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Delete category</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Are you sure?</h2>
            </div>

            <div className="space-y-5 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                This will permanently delete <span className="font-semibold text-foreground">{pendingDeleteCategory.name}</span>. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteCategory(null)} disabled={isSaving}>
                  Cancel
                </Button>

                <Button type="button" variant="destructive" onClick={() => void confirmDeleteCategory(pendingDeleteCategory)} disabled={isSaving}>
                  {isSaving ? 'Deleting...' : 'Delete category'}
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

export default AdminCategoriesPage