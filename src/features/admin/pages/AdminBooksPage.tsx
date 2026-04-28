import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { BookOpen, Check, ChevronDown, Edit3, FileSpreadsheet, FileText, Loader2, Menu, Plus, RefreshCcw, Search, ShieldCheck, Star, Trash2, Upload, X } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Skeleton } from '../../../components/ui/skeleton'
import AdminSidebar from '../components/AdminSidebar'
import { fetchAdminAuthors, type Author } from '../lib/adminAuthors'
import { fetchAdminCategories, type Category } from '../lib/adminCategories'
import { clearAuthSession, loadAuthSession, logout } from '../../shared/auth'
import { createAdminBook, deleteAdminBook, fetchAdminBook, fetchAdminBooks, patchAdminBookStatus, updateAdminBook, type Book } from '../lib/adminBooks'
import { exportRowsToExcel, exportRowsToPdf, type ExportColumn } from '../../shared/exportTable'

const MAX_BOOK_COVER_BYTES = 5 * 1024 * 1024

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kilobytes = bytes / 1024

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`
}

function formatAverageRating(value: number) {
  if (!Number.isFinite(value)) {
    return '0.0'
  }

  return value.toFixed(1)
}

function renderRatingStars(value: number) {
  const filledStars = Math.max(0, Math.min(5, Math.round(value)))

  return Array.from({ length: 5 }, (_, index) => {
    const isFilled = index < filledStars

    return (
      <Star
        key={index}
        className={[
          'size-4 shrink-0',
          isFilled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/35',
        ].join(' ')}
      />
    )
  })
}

function getStatusSelectClasses(statusValue: string) {
  switch (statusValue) {
    case 'PUBLISHED':
      return 'border-emerald-300/70 bg-emerald-50 text-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] focus-visible:border-emerald-400 focus-visible:ring-emerald-400/20'
    case 'ARCHIVED':
      return 'border-amber-300/70 bg-amber-50 text-amber-800 shadow-[0_0_0_1px_rgba(245,158,11,0.08)] focus-visible:border-amber-400 focus-visible:ring-amber-400/20'
    default:
      return 'border-sky-300/70 bg-sky-50 text-sky-700 shadow-[0_0_0_1px_rgba(14,165,233,0.08)] focus-visible:border-sky-400 focus-visible:ring-sky-400/20'
  }
}

type BookPageMeta = {
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

const defaultBookPageMeta: BookPageMeta = {
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 10,
  hasNext: false,
  hasPrevious: false,
}

type BookFormMode = 'create' | 'edit'

function normalizeBooks(value: unknown): Book[] {
  return Array.isArray(value) ? (value as Book[]) : []
}

export function AdminBooksPage() {
  const session = loadAuthSession()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [books, setBooks] = useState<Book[]>([])
  const [bookPageMeta, setBookPageMeta] = useState<BookPageMeta>(defaultBookPageMeta)
  const [page, setPage] = useState(0)
  const [isLoadingBooks, setIsLoadingBooks] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [bookFormMode, setBookFormMode] = useState<BookFormMode>('create')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeletingBookId, setIsDeletingBookId] = useState<number | null>(null)
  const [isLoadingBookDetails, setIsLoadingBookDetails] = useState(false)
  const [isUpdatingBookStatus, setIsUpdatingBookStatus] = useState(false)
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null)
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null)
  const [detailsErrorMessage, setDetailsErrorMessage] = useState<string | null>(null)
  const [statusUpdateErrorMessage, setStatusUpdateErrorMessage] = useState<string | null>(null)
  const [referenceErrorMessage, setReferenceErrorMessage] = useState<string | null>(null)
  const [isLoadingReferences, setIsLoadingReferences] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [editingBookId, setEditingBookId] = useState<number | null>(null)
  const [pendingDeleteBook, setPendingDeleteBook] = useState<Book | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [successToastVisible, setSuccessToastVisible] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt' | 'averageRating'>('averageRating')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [authorIds, setAuthorIds] = useState<number[]>([])
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [isSlugManual, setIsSlugManual] = useState(false)
  const [description, setDescription] = useState('')
  const [isbn, setIsbn] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('DRAFT')
  const coverFileInputRef = useRef<HTMLInputElement | null>(null)
  const detailsRequestIdRef = useRef(0)
  const pageSize = 10
  const categoryLookup = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const canSubmit =
    categoryId.trim().length > 0 &&
    authorIds.length > 0 &&
    title.trim().length > 0 &&
    slug.trim().length > 0 &&
    isbn.trim().length > 0 &&
    price.trim().length > 0 &&
    stock.trim().length > 0 &&
    (coverFile !== null || coverImageUrl.trim().length > 0) &&
    !isSaving

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await logout()
      clearAuthSession()
    } finally {
      window.location.assign('/admin/login')
    }
  }

  function showSuccess(message: string) {
    setSuccessMessage(message)
    setSuccessToastVisible(false)
  }

  function populateBookForm(book: Book) {
    setCategoryId(String(book.categoryId))
    setAuthorIds(book.authors.map((author) => author.id))
    setTitle(book.title)
    setSlug(book.slug)
    setIsSlugManual(true)
    setDescription(book.description)
    setIsbn(book.isbn)
    setPrice(String(book.price))
    setStock(String(book.stock))
    setCoverImageUrl(book.coverImageUrl)
    setCoverFile(null)
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = ''
    }
    setStatus(book.status)
  }

  function closeDetailsModal() {
    setIsDetailsModalOpen(false)
    setDetailsErrorMessage(null)
    setStatusUpdateErrorMessage(null)
    setSelectedBook(null)
    setIsLoadingBookDetails(false)
  }

  function resetBookForm() {
    setBookFormMode('create')
    setEditingBookId(null)
    setCategoryId('')
    setAuthorIds([])
    setTitle('')
    setSlug('')
    setIsSlugManual(false)
    setDescription('')
    setIsbn('')
    setPrice('')
    setStock('')
    setCoverImageUrl('')
    setCoverFile(null)
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = ''
    }
    setStatus('DRAFT')
    setCreateErrorMessage(null)
  }

  const loadBooks = useCallback(
    async (nextPage = page, nextKeyword = keyword) => {
      setIsLoadingBooks(true)
      setPageErrorMessage(null)

      try {
        const response = await fetchAdminBooks({
          page: nextPage,
          size: pageSize,
          keyword: nextKeyword,
          sortBy,
          sortDirection,
          createdFrom,
          createdTo,
        })

        setBooks(normalizeBooks(response.data.content))
        setBookPageMeta({
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages,
          page: response.data.page,
          size: response.data.size,
          hasNext: response.data.hasNext,
          hasPrevious: response.data.hasPrevious,
        })
        setPage(response.data.page)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load books.'
        setPageErrorMessage(message)
      } finally {
        setIsLoadingBooks(false)
      }
    },
    [createdFrom, createdTo, keyword, page, sortBy, sortDirection],
  )

  const loadReferenceData = useCallback(async () => {
    setIsLoadingReferences(true)
    setReferenceErrorMessage(null)

    try {
      const [categoriesResponse, authorsResponse] = await Promise.allSettled([
        fetchAdminCategories({ page: 0, size: 500 }),
        fetchAdminAuthors({ page: 0, size: 500 }),
      ])

      if (categoriesResponse.status === 'fulfilled') {
        setCategories(categoriesResponse.value.data.content)
      } else {
        setCategories([])
      }

      if (authorsResponse.status === 'fulfilled') {
        setAuthors(authorsResponse.value.data.content)
      } else {
        setAuthors([])
      }

      if (categoriesResponse.status === 'rejected' || authorsResponse.status === 'rejected') {
        setReferenceErrorMessage('Failed to load categories or authors for the create form.')
      }
    } finally {
      setIsLoadingReferences(false)
    }
  }, [])

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    void loadBooks(page, keyword)
  }, [createdFrom, createdTo, keyword, page, session?.accessToken, loadBooks, sortBy, sortDirection])

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    void loadReferenceData()
  }, [session?.accessToken, loadReferenceData])

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

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCreateModalOpen(false)
        setCreateErrorMessage(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCreateModalOpen])

  useEffect(() => {
    if (!isDetailsModalOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDetailsModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDetailsModalOpen])

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null)
      return
    }

    const previewUrl = URL.createObjectURL(coverFile)
    setCoverPreviewUrl(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [coverFile])

  if (!session?.accessToken) {
    return <Navigate replace to="/admin/login" />
  }

  async function handleRefresh() {
    setIsRefreshing(true)

    try {
      await loadBooks(page, keyword)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function getBooksForExport() {
    const response = await fetchAdminBooks({
      page: 0,
      size: Math.max(bookPageMeta.totalElements, books.length, 1),
      keyword,
      sortBy,
      sortDirection,
      createdFrom,
      createdTo,
    })

    return normalizeBooks(response.data.content)
  }

  async function handleExportExcel() {
    setIsExportingExcel(true)
    setPageErrorMessage(null)

    try {
      const rows = await getBooksForExport()
      const columns: ExportColumn<Book>[] = [
        { header: 'ID', value: (row) => row.id },
        { header: 'Title', value: (row) => row.title },
        { header: 'Slug', value: (row) => row.slug },
        { header: 'Category', value: (row) => categoryLookup.get(row.categoryId)?.name ?? `Category #${row.categoryId}` },
        { header: 'Authors', value: (row) => row.authors.map((author) => author.name).join(', ') || 'No authors linked' },
        { header: 'ISBN', value: (row) => row.isbn },
        { header: 'Price', value: (row) => `$${row.price.toFixed(2)}` },
        { header: 'Stock', value: (row) => row.stock },
        { header: 'Likes', value: (row) => row.likeCount },
        { header: 'Average rating', value: (row) => formatAverageRating(row.averageRating) },
        { header: 'Status', value: (row) => row.status },
        { header: 'Created at', value: (row) => formatDateTime(row.createdAt) },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToExcel(rows, columns, 'books.xlsx', 'Books')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export books to Excel.'
      setPageErrorMessage(message)
    } finally {
      setIsExportingExcel(false)
    }
  }

  async function handleExportPdf() {
    setIsExportingPdf(true)
    setPageErrorMessage(null)

    try {
      const rows = await getBooksForExport()
      const columns: ExportColumn<Book>[] = [
        { header: 'ID', value: (row) => row.id },
        { header: 'Title', value: (row) => row.title },
        { header: 'Category', value: (row) => categoryLookup.get(row.categoryId)?.name ?? `Category #${row.categoryId}` },
        { header: 'Authors', value: (row) => row.authors.map((author) => author.name).join(', ') || 'No authors linked' },
        { header: 'ISBN', value: (row) => row.isbn },
        { header: 'Price', value: (row) => `$${row.price.toFixed(2)}` },
        { header: 'Stock', value: (row) => row.stock },
        { header: 'Average rating', value: (row) => formatAverageRating(row.averageRating) },
        { header: 'Status', value: (row) => row.status },
        { header: 'Updated at', value: (row) => formatDateTime(row.updatedAt) },
      ]

      exportRowsToPdf(rows, columns, 'Books export', 'books.pdf')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export books to PDF.'
      setPageErrorMessage(message)
    } finally {
      setIsExportingPdf(false)
    }
  }

  function openCreateModal() {
    resetBookForm()
    setBookFormMode('create')
    setCreateErrorMessage(null)
    setIsCreateModalOpen(true)
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false)
    resetBookForm()
  }

  function openEditModal(book: Book) {
    setBookFormMode('edit')
    setEditingBookId(book.id)
    setCreateErrorMessage(null)
    populateBookForm(book)
    setIsDetailsModalOpen(false)
    setSelectedBook(null)
    setIsCreateModalOpen(true)
  }

  async function handleDeleteBook(book: Book) {
    setIsDeletingBookId(book.id)
    setPageErrorMessage(null)
    setPendingDeleteBook(null)

    try {
      await deleteAdminBook(book.id)

      if (selectedBook?.id === book.id) {
        closeDetailsModal()
      }

      showSuccess(`Book "${book.title}" deleted.`)
      await loadBooks(page, keyword)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete book.'
      setPageErrorMessage(message)
    } finally {
      setIsDeletingBookId(null)
    }
  }

  function requestDeleteBook(book: Book) {
    setPageErrorMessage(null)
    setPendingDeleteBook(book)
  }

  function handleAuthorToggle(authorId: number) {
    setAuthorIds((currentAuthorIds) =>
      currentAuthorIds.includes(authorId)
        ? currentAuthorIds.filter((currentAuthorId) => currentAuthorId !== authorId)
        : [...currentAuthorIds, authorId],
    )
  }

  async function openDetailsModal(bookId: number) {
    const requestId = detailsRequestIdRef.current + 1
    detailsRequestIdRef.current = requestId

    setIsDetailsModalOpen(true)
    setIsLoadingBookDetails(true)
    setDetailsErrorMessage(null)
    setStatusUpdateErrorMessage(null)
    setSelectedBook(null)

    try {
      const response = await fetchAdminBook(bookId)

      if (detailsRequestIdRef.current !== requestId) {
        return
      }

      setSelectedBook(response.data)
    } catch (error) {
      if (detailsRequestIdRef.current !== requestId) {
        return
      }

      const message = error instanceof Error ? error.message : 'Failed to load book details.'
      setDetailsErrorMessage(message)
    } finally {
      if (detailsRequestIdRef.current === requestId) {
        setIsLoadingBookDetails(false)
      }
    }
  }

  async function handleStatusChange(nextStatus: string) {
    if (!selectedBook || nextStatus === selectedBook.status || isUpdatingBookStatus) {
      return
    }

    const previousStatus = selectedBook.status
    setIsUpdatingBookStatus(true)
    setStatusUpdateErrorMessage(null)
    setSelectedBook({ ...selectedBook, status: nextStatus })

    try {
      const response = await patchAdminBookStatus({ id: selectedBook.id, status: nextStatus })
      setSelectedBook(response.data)
      setBooks((currentBooks) =>
        currentBooks.map((book) => (book.id === response.data.id ? { ...book, status: response.data.status } : book)),
      )
      showSuccess(`Book status updated to ${response.data.status}.`)
    } catch (error) {
      setSelectedBook((currentBook) => (currentBook ? { ...currentBook, status: previousStatus } : currentBook))
      const message = error instanceof Error ? error.message : 'Failed to update book status.'
      setStatusUpdateErrorMessage(message)
    } finally {
      setIsUpdatingBookStatus(false)
    }
  }

  async function handleCardStatusChange(book: Book, nextStatus: string) {
    if (nextStatus === book.status) {
      return
    }

    setPageErrorMessage(null)

    try {
      const response = await patchAdminBookStatus({ id: book.id, status: nextStatus })

      setBooks((currentBooks) =>
        currentBooks.map((currentBook) => (currentBook.id === response.data.id ? { ...currentBook, status: response.data.status } : currentBook)),
      )

      setSelectedBook((currentBook) => (currentBook?.id === response.data.id ? { ...currentBook, status: response.data.status } : currentBook))
      showSuccess(`Book status updated to ${response.data.status}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update book status.'
      setPageErrorMessage(message)
    }
  }

  function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setCoverFile(null)
      setCreateErrorMessage(null)
      return
    }

    if (file.size > MAX_BOOK_COVER_BYTES) {
      setCoverFile(null)
      setCreateErrorMessage(`Book cover must be 5 MB or smaller. Selected file is ${formatFileSize(file.size)}.`)
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = ''
      }
      event.target.value = ''
      return
    }

    setCreateErrorMessage(null)
    setCoverFile(file)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateErrorMessage(null)
    setSuccessMessage(null)
    setSuccessToastVisible(false)
    setIsSaving(true)

    if (!coverFile && coverImageUrl.trim().length === 0) {
      setCreateErrorMessage('Add a cover image URL or upload a book cover file.')
      setIsSaving(false)
      return
    }

    if (coverFile && coverFile.size > MAX_BOOK_COVER_BYTES) {
      setCreateErrorMessage(`Book cover must be 5 MB or smaller. Selected file is ${formatFileSize(coverFile.size)}.`)
      setIsSaving(false)
      return
    }

    try {
      const requestPayload = {
        categoryId: Number(categoryId),
        authorIds,
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        description: description.trim(),
        isbn: isbn.trim(),
        price: Number(price),
        stock: Number(stock),
        coverImageUrl: coverImageUrl.trim(),
        status: status.trim(),
        coverFile,
      }

      const response =
        bookFormMode === 'edit' && editingBookId !== null
          ? await updateAdminBook({ id: editingBookId, ...requestPayload })
          : await createAdminBook(requestPayload)

      closeCreateModal()
      resetBookForm()
      showSuccess(bookFormMode === 'edit' ? `Book "${response.data.title}" updated.` : `Book "${response.data.title}" created.`)
      await loadBooks(page, keyword)
    } catch (error) {
      const message = error instanceof Error ? error.message : bookFormMode === 'edit' ? 'Failed to update book.' : 'Failed to create book.'
      setCreateErrorMessage(message)
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

  const currentPageMeta = bookPageMeta ?? defaultBookPageMeta
  const displayedPage = currentPageMeta.page + 1
  const visibleBookCount = books.length
  const hasDateFilters = Boolean(createdFrom || createdTo)
  const activeFilterLabel = keyword || hasDateFilters ? 'Filtered books' : 'All books'
  const sortLabel = `${sortBy === 'name' ? 'Name' : sortBy === 'updatedAt' ? 'Updated at' : 'Average rating'} ${sortDirection.toUpperCase()}`
  const startItem = currentPageMeta.totalElements === 0 ? 0 : currentPageMeta.page * currentPageMeta.size + 1
  const endItem = Math.min(currentPageMeta.totalElements, currentPageMeta.page * currentPageMeta.size + visibleBookCount)
  const bookCardSkeletons = Array.from({ length: 8 }, (_, index) => index)
  const categoryNameById = (categoryIdValue: number) => categoryLookup.get(categoryIdValue)?.name ?? `Category #${categoryIdValue}`
  const authorNamesByBook = (book: Book) =>
    book.authors.length > 0 ? book.authors.map((author) => author.name).join(', ') : 'No authors linked'
  const coverPreviewSource = coverPreviewUrl || (!coverFile && coverImageUrl.trim().length > 0 ? coverImageUrl.trim() : '')
  const categoryCount = categories.length
  const authorCount = authors.length

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.85),transparent_34%),linear-gradient(to_bottom_right,rgba(249,250,251,1),rgba(255,255,255,1))] text-foreground dark:bg-background">
      <div className={`mx-auto min-h-screen w-full max-w-[1600px] transition-[padding] duration-200 ${isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        <AdminSidebar
          activeHref="/admin/dashboard/books"
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
                    Admin books
                  </Badge>
                </div>
                <CardTitle className="text-3xl tracking-tight">Books</CardTitle>
                <CardDescription>Dedicated workspace for book catalog management.</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="w-fit gap-2 self-start sm:self-center">
                  <BookOpen className="size-3.5" />
                </Badge>
                <Button type="button" onClick={openCreateModal} className="gap-2">
                  <Plus className="size-4" />
                  Create book
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-5 sm:p-6">
              {pageErrorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription>{pageErrorMessage}</AlertDescription>
                </Alert>
              ) : null}

              {referenceErrorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Create form data failed to load</AlertTitle>
                  <AlertDescription>{referenceErrorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Total books</CardDescription>
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
                    <CardDescription>Reference data</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{isLoadingReferences ? '...' : `${categoryCount}/${authorCount}`}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-border/70 bg-card/80 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardDescription>Filter</CardDescription>
                    <CardTitle className="truncate text-lg">{activeFilterLabel}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="flex flex-col gap-3 border-b bg-muted/20">
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="relative w-full sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={keywordInput}
                        onChange={(event) => setKeywordInput(event.target.value)}
                        placeholder="Search books"
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

                  <div className="mt-1 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Sort by</label>
                      <select
                        value={sortBy}
                        onChange={(event) => {
                          setPage(0)
                          setSortBy(event.target.value as 'name' | 'updatedAt' | 'averageRating')
                        }}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <option value="name">Name</option>
                        <option value="updatedAt">Updated at</option>
                        <option value="averageRating">Average rating</option>
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

                  <Button type="button" variant="outline" onClick={openCreateModal} className="gap-2 sm:hidden">
                    <Plus className="size-4" />
                    Create
                  </Button>
                </CardHeader>

                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    <span>
                      {visibleBookCount} visible {visibleBookCount === 1 ? 'book' : 'books'}
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

                  {isLoadingBooks ? (
                    <div className="space-y-3">
                      {bookCardSkeletons.map((item) => (
                        <div key={item} className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                          <Skeleton className="h-44 w-full rounded-none" />
                          <div className="space-y-3 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Skeleton className="h-5 w-40" />
                                  <Skeleton className="h-5 w-20 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-56" />
                                <Skeleton className="h-4 w-40" />
                              </div>
                              <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : books.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                      No books match your current search.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {books.map((book) => (
                        <div
                          key={book.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => void openDetailsModal(book.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              void openDetailsModal(book.id)
                            }
                          }}
                          aria-label={`Open details for ${book.title}`}
                          title={`Open details for ${book.title}`}
                          className="w-full cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-background text-left shadow-sm transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        >
                          <div className="grid gap-0 md:grid-cols-[10rem_1fr]">
                            <div className="bg-muted/10 p-4 md:p-4">
                              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-none bg-background">
                                {book.coverImageUrl ? (
                                  <img src={book.coverImageUrl} alt={book.title} className="absolute inset-0 h-full w-full rounded-none object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                    No cover image
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-4 p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-base font-semibold">{book.title}</h3>
                                    <div
                                      className="relative"
                                      onClick={(event) => event.stopPropagation()}
                                      onMouseDown={(event) => event.stopPropagation()}
                                    >
                                      <select
                                        aria-label={`Change status for ${book.title}`}
                                        value={book.status}
                                        onChange={(event) => void handleCardStatusChange(book, event.target.value)}
                                        className={`h-8 appearance-none rounded-full px-3 pr-8 text-xs font-semibold outline-none transition-colors ${getStatusSelectClasses(book.status)}`}
                                      >
                                        <option value="DRAFT">DRAFT</option>
                                        <option value="PUBLISHED">PUBLISHED</option>
                                        <option value="ARCHIVED">ARCHIVED</option>
                                      </select>
                                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    </div>
                                  </div>
                                  <p className="text-sm leading-6 text-muted-foreground">{book.description || 'No description provided.'}</p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>Slug: {book.slug}</span>
                                    <span>ISBN: {book.isbn}</span>
                                    <span>Category: {categoryNameById(book.categoryId)}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">Authors: {authorNamesByBook(book)}</p>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Last updated {formatDateTime(book.updatedAt)}</p>
                                    <div className="flex items-center gap-1 pt-1" aria-label={`Average rating ${formatAverageRating(book.averageRating)} out of 5`}>
                                      {renderRatingStars(book.averageRating)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  <Badge variant="outline">${book.price.toFixed(2)}</Badge>
                                  <Badge variant="outline">Stock {book.stock}</Badge>
                                </div>
                              </div>

                              <div className="mt-2 flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-9 shrink-0"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    openEditModal(book)
                                  }}
                                  aria-label={`Edit ${book.title}`}
                                  title={`Edit ${book.title}`}
                                >
                                  <Edit3 className="size-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="size-9 shrink-0"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    requestDeleteBook(book)
                                  }}
                                  aria-label={`Delete ${book.title}`}
                                  title={`Delete ${book.title}`}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-4 border-t bg-muted/10 px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="space-y-1">
                    <span>{currentPageMeta.totalElements} total books </span>
                    <span>
                      Showing {startItem} to {endItem} of {currentPageMeta.totalElements}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={!currentPageMeta.hasPrevious || page <= 0}>
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

                    <Button type="button" variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={!currentPageMeta.hasNext}>
                      Next
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </CardContent>
          </Card>
        </section>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center" onClick={closeCreateModal}>
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-book-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b bg-gradient-to-r from-muted/20 via-background to-background px-5 py-4 sm:px-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-2">
                    <Upload className="size-3.5" />
                    Book upload
                  </Badge>
                  <Badge variant="secondary" className="gap-2">
                    <Check className="size-3.5" />
                    Image limit 5 MB
                  </Badge>
                </div>
                <h2 id="create-book-title" className="text-2xl font-semibold tracking-tight">
                  {bookFormMode === 'edit' ? 'Edit book' : 'Create a new book'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select a category and authors from live data, then upload a cover or provide a cover image URL.
                </p>
              </div>

              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={closeCreateModal}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              {createErrorMessage ? (
                <Alert variant="destructive" className="mb-5">
                  <AlertTitle>{bookFormMode === 'edit' ? 'Could not update book' : 'Could not create book'}</AlertTitle>
                  <AlertDescription>{createErrorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="categoryId" className="text-sm font-medium">
                          Category
                        </label>
                        <div className="relative">
                          <select
                            id="categoryId"
                            value={categoryId}
                            onChange={(event) => setCategoryId(event.target.value)}
                            className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                            required
                          >
                            <option value="">Select a category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isLoadingReferences ? 'Loading categories...' : categories.length > 0 ? 'Choose one catalog category.' : 'No categories loaded.'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="status" className="text-sm font-medium">
                          Status
                        </label>
                        <div className="relative">
                          <select
                            id="status"
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className={`h-10 w-full appearance-none rounded-lg px-3 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground ${getStatusSelectClasses(status)}`}
                            required
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="PUBLISHED">PUBLISHED</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium">Authors</label>
                        <span className="text-xs text-muted-foreground">
                          {authorIds.length} selected
                        </span>
                      </div>

                      {isLoadingReferences ? (
                        <div className="grid gap-2">
                          {Array.from({ length: 4 }, (_, index) => (
                            <div key={index} className="h-12 rounded-xl border border-border/70 bg-muted/20" />
                          ))}
                        </div>
                      ) : authors.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                          No authors loaded.
                        </div>
                      ) : (
                        <div className="grid gap-2 rounded-2xl border border-border/70 bg-muted/10 p-3 sm:max-h-64 sm:overflow-auto">
                          {authors.map((author) => {
                            const isSelected = authorIds.includes(author.id)

                            return (
                              <button
                                key={author.id}
                                type="button"
                                onClick={() => handleAuthorToggle(author.id)}
                                className={[
                                  'flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                                  isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-background hover:bg-muted/20',
                                ].join(' ')}
                              >
                                <span
                                  className={[
                                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
                                    isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30 bg-background',
                                  ].join(' ')}
                                >
                                  {isSelected ? <Check className="size-3.5" /> : null}
                                </span>

                                <span className="min-w-0 flex-1 space-y-1">
                                  <span className="flex items-center justify-between gap-3">
                                    <span className="truncate text-sm font-medium">{author.name}</span>
                                    <span className="text-xs text-muted-foreground">#{author.id}</span>
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground">{author.slug}</span>
                                  <span className="block line-clamp-2 text-xs leading-5 text-muted-foreground">
                                    {author.biography || 'No biography provided.'}
                                  </span>
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">Pick one or more authors from the fetched admin list.</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="title" className="text-sm font-medium">
                        Title
                      </label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(event) => {
                          const nextTitle = event.target.value
                          setTitle(nextTitle)

                          if (!isSlugManual) {
                            setSlug(slugify(nextTitle))
                          }
                        }}
                        placeholder="The Book Name"
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
                        onChange={(event) => {
                          setIsSlugManual(true)
                          setSlug(slugify(event.target.value))
                        }}
                        placeholder="the-book-name"
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
                        placeholder="Short book description"
                        className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <Card className="border-border/70 bg-muted/10 shadow-sm">
                      <CardHeader className="border-b bg-background/80">
                        <CardTitle className="text-base">Cover asset</CardTitle>
                        <CardDescription>Upload a book cover image up to 5 MB or paste an external URL.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-5">
                        <div className="space-y-2">
                          <label htmlFor="coverFile" className="text-sm font-medium">
                            Upload cover image
                          </label>
                          <Input ref={coverFileInputRef} id="coverFile" type="file" accept="image/*" onChange={handleCoverFileChange} />
                          <p className="text-xs text-muted-foreground">Supported images only. Maximum size: 5 MB.</p>
                        </div>

                        {coverPreviewSource ? (
                          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                            <img src={coverPreviewSource} alt="Selected book cover preview" className="h-52 w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background text-sm text-muted-foreground">
                            No cover selected.
                          </div>
                        )}

                        {coverFile ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{coverFile.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(coverFile.size)}</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setCoverFile(null)}>
                              Clear
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <div className="space-y-2">
                      <label htmlFor="coverImageUrl" className="text-sm font-medium">
                        Cover image URL
                      </label>
                      <Input
                        id="coverImageUrl"
                        value={coverImageUrl}
                        onChange={(event) => setCoverImageUrl(event.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="isbn" className="text-sm font-medium">
                          ISBN
                        </label>
                        <Input id="isbn" value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="9780000000000" required />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="price" className="text-sm font-medium">
                          Price
                        </label>
                        <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="19.99" required />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="stock" className="text-sm font-medium">
                          Stock
                        </label>
                        <Input id="stock" type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} placeholder="12" required />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="coverFileInfo" className="text-sm font-medium">
                          Upload rule
                        </label>
                        <Input id="coverFileInfo" value="Max 5 MB" readOnly className="bg-muted/20" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={closeCreateModal}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gap-2" disabled={!canSubmit || isSaving}>
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isSaving ? 'Saving...' : bookFormMode === 'edit' ? 'Update book' : 'Create book'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isDetailsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center" onClick={closeDetailsModal}>
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b bg-gradient-to-r from-muted/20 via-background to-background px-5 py-4 sm:px-6">
              <div className="space-y-1">
                <Badge variant="outline" className="w-fit gap-2">
                  <BookOpen className="size-3.5" />
                  Book details
                </Badge>
                <h2 id="book-details-title" className="text-2xl font-semibold tracking-tight">
                  {selectedBook?.title ?? 'Loading book details'}
                </h2>
              </div>

              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={closeDetailsModal}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              {detailsErrorMessage ? (
                <Alert variant="destructive" className="mb-5">
                  <AlertTitle>Could not load book details</AlertTitle>
                  <AlertDescription>{detailsErrorMessage}</AlertDescription>
                </Alert>
              ) : null}

              {isLoadingBookDetails ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="h-72 rounded-3xl border border-border/70 bg-muted/20" />
                    <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/10 p-4">
                      <div className="h-5 w-44 rounded bg-muted/40" />
                      <div className="h-4 w-full rounded bg-muted/30" />
                      <div className="h-4 w-4/5 rounded bg-muted/30" />
                      <div className="h-4 w-3/5 rounded bg-muted/30" />
                    </div>
                  </div>
                </div>
              ) : selectedBook ? (
                <div className="space-y-5">
                  <div className="border border-border/70 bg-background p-3 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3 px-1 pt-1">
                      <p className="text-sm font-semibold">Cover preview</p>
                    </div>

                    <div className="bg-muted/10 p-4">
                      <div className="relative mx-auto aspect-[3/4] w-56 max-w-full overflow-hidden bg-background">
                        {selectedBook.coverImageUrl ? (
                          <img
                            src={selectedBook.coverImageUrl}
                            alt={selectedBook.title}
                            className="absolute inset-0 h-full w-full rounded-none object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                            No cover image available.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 rounded-3xl border border-border/70 bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="details-status" className="text-sm font-medium">
                          Status
                        </label>
                        {isUpdatingBookStatus ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                      </div>
                      <div className="relative">
                        <select
                          id="details-status"
                          value={selectedBook.status}
                          onChange={(event) => void handleStatusChange(event.target.value)}
                          className={`h-10 w-full appearance-none rounded-lg px-3 pr-10 text-sm font-semibold outline-none transition-colors ${getStatusSelectClasses(selectedBook.status)}`}
                          disabled={isUpdatingBookStatus}
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="PUBLISHED">PUBLISHED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="space-y-2 rounded-3xl border border-border/70 bg-muted/10 p-4">
                      <p className="text-sm font-medium text-muted-foreground">Summary</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Category: {categoryNameById(selectedBook.categoryId)}</Badge>
                        <Badge variant="outline">Likes {selectedBook.likeCount}</Badge>
                      </div>
                    </div>
                  </div>

                  {statusUpdateErrorMessage ? (
                    <Alert variant="destructive">
                      <AlertTitle>Could not update status</AlertTitle>
                      <AlertDescription>{statusUpdateErrorMessage}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="rounded-3xl border border-border/70 bg-muted/10 p-4">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="mt-2 text-sm leading-7">{selectedBook.description || 'No description provided.'}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">ISBN</p>
                      <p className="mt-2 text-sm font-medium">{selectedBook.isbn}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Price</p>
                      <p className="mt-2 text-sm font-medium">${selectedBook.price.toFixed(2)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stock</p>
                      <p className="mt-2 text-sm font-medium">{selectedBook.stock}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Like count</p>
                      <p className="mt-2 text-sm font-medium">{selectedBook.likeCount}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-border/70 bg-background p-4">
                      <p className="text-sm font-semibold">Metadata</p>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <p>Book ID: {selectedBook.id}</p>
                        <p>Slug: {selectedBook.slug}</p>
                        <p>Created: {formatDateTime(selectedBook.createdAt)}</p>
                        <div className="space-y-1">
                          <p>Updated: {formatDateTime(selectedBook.updatedAt)}</p>
                          <div className="flex items-center gap-1 pt-1" aria-label={`Average rating ${formatAverageRating(selectedBook.averageRating)} out of 5`}>
                            {renderRatingStars(selectedBook.averageRating)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border/70 bg-background p-4">
                      <p className="text-sm font-semibold">Authors</p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {selectedBook.authors.length > 0 ? selectedBook.authors.map((author) => author.name).join(', ') : 'No authors linked'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedBook.authors.map((author) => (
                          <Badge key={author.id} variant="outline">
                            {author.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t pt-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={closeDetailsModal}>
                      Close
                    </Button>
                    <Button type="button" onClick={() => openEditModal(selectedBook)}>
                      Edit book
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteBook ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-book-title">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close delete book dialog backdrop"
            onClick={() => setPendingDeleteBook(null)}
          />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border/70 bg-background shadow-2xl">
            <div className="border-b bg-muted/20 px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Delete book</p>
              <h2 id="delete-book-title" className="mt-1 text-2xl font-semibold tracking-tight">
                Are you sure?
              </h2>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              <p className="text-sm leading-6 text-muted-foreground">
                This will permanently delete <span className="font-semibold text-foreground">{pendingDeleteBook.title}</span>. This action cannot be undone.
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setPendingDeleteBook(null)} disabled={isDeletingBookId === pendingDeleteBook.id}>
                  Cancel
                </Button>

                <Button type="button" variant="destructive" onClick={() => void handleDeleteBook(pendingDeleteBook)} disabled={isDeletingBookId === pendingDeleteBook.id}>
                  {isDeletingBookId === pendingDeleteBook.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                  {isDeletingBookId === pendingDeleteBook.id ? 'Deleting...' : 'Delete book'}
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
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
              <BookOpen className="size-4" />
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

export default AdminBooksPage
