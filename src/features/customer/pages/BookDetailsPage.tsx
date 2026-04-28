import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, Calendar, Hash, Heart, Loader2, ShoppingCart, Star, Tag } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Skeleton } from '../../../components/ui/skeleton'
import { addBookToCart } from '../../shared/cart'
import { loadAuthSession, logout } from '../../shared/auth'
import {
  fetchCatalogBookById,
  fetchCatalogCategories,
  type CatalogBook,
  type CatalogCategory,
} from '../../shared/catalog'
import { addBookToWishlist, fetchWishlist } from '../../shared/wishlist'
import { fetchBookRating, submitBookRating } from '../../shared/bookRating'
import CustomerAccountMenu from '../components/CustomerAccountMenu'

/* ─── Constants ────────────────────────────────────────────────────── */

const BOOK_COVER_PLACEHOLDER = '/img/bookstore-img.jpg'

/* ─── Helpers ───────────────────────────────────────────────────────── */

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function getPrimaryAuthor(book: CatalogBook) {
  return book.authors[0]?.name ?? 'Unknown Author'
}

function resolveCoverImageSrc(coverImageUrl?: string | null) {
  if (!coverImageUrl || coverImageUrl.trim().length === 0) return BOOK_COVER_PLACEHOLDER
  if (/^https?:\/\//i.test(coverImageUrl)) return coverImageUrl
  return coverImageUrl.startsWith('/') ? coverImageUrl : `/${coverImageUrl}`
}

/* ─── Skeleton ──────────────────────────────────────────────────────── */

function BookDetailSkeleton() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
        <div className="space-y-6 pt-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3 pt-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 flex-1 rounded-xl" />)}
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────────── */

export function BookDetailsPage() {
  const navigate = useNavigate()
  const session = loadAuthSession()
  const params = useParams<{ bookId: string }>()
  const bookId = Number(params.bookId)

  const [book, setBook] = useState<CatalogBook | null>(null)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [wishlistIds, setWishlistIds] = useState<number[]>([])
  const [wishlistActionLoading, setWishlistActionLoading] = useState(false)
  const [cartActionLoading, setCartActionLoading] = useState(false)
  const [selectedRating, setSelectedRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false)
  const [ratingMessage, setRatingMessage] = useState<string | null>(null)
  const [cartMessage, setCartMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [imgSrc, setImgSrc] = useState(BOOK_COVER_PLACEHOLDER)

  /* ── Load book ── */
  useEffect(() => {
    if (!Number.isFinite(bookId) || bookId <= 0) {
      setErrorMessage('Invalid book ID.')
      setIsLoading(false)
      return
    }
    let active = true
    async function run() {
      setIsLoading(true); setErrorMessage(null)
      try {
        const res = await fetchCatalogBookById(bookId)
        if (!active) return
        setBook(res.data)
        setImgSrc(resolveCoverImageSrc(res.data.coverImageUrl))
      } catch (e) {
        if (!active) return
        setBook(null)
        setErrorMessage(e instanceof Error ? e.message : 'Unable to load book details.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void run()
    return () => { active = false }
  }, [bookId])

  /* ── Load wishlist ── */
  useEffect(() => {
    let active = true
    async function run() {
      if (!session?.accessToken) { setWishlistIds([]); return }
      try { const res = await fetchWishlist(); if (active) setWishlistIds(res.data.items.map((i) => i.book.id)) }
      catch { if (active) setWishlistIds([]) }
    }
    void run()
    return () => { active = false }
  }, [session?.accessToken])

  /* ── Load rating ── */
  useEffect(() => {
    let active = true
    async function run() {
      if (!session?.accessToken || !Number.isFinite(bookId) || bookId <= 0) { setSelectedRating(0); return }
      try { const res = await fetchBookRating(bookId); if (active) setSelectedRating(res.data.rating) }
      catch { if (active) setSelectedRating(0) }
    }
    void run()
    return () => { active = false }
  }, [bookId, session?.accessToken])

  /* ── Load categories ── */
  useEffect(() => {
    let active = true
    async function run() {
      if (!session?.accessToken) return
      try { const res = await fetchCatalogCategories({ page: 0, size: 200, sortBy: 'name', sortDirection: 'asc' }); if (active) setCategories(res.data.content) }
      catch { if (active) setCategories([]) }
    }
    void run()
    return () => { active = false }
  }, [session?.accessToken])

  const isAvailable = useMemo(() => (book ? book.stock > 0 : false), [book])
  const isSavedToWishlist = useMemo(() => (book ? wishlistIds.includes(book.id) : false), [book, wishlistIds])
  const categoryNameById = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id: number) => map.get(id) ?? `Category #${id}`
  }, [categories])

  /* ── Handlers ── */
  async function handleLogout() { await logout(); navigate('/', { replace: true }) }

  async function handleAddToWishlist() {
    if (!book || !session?.accessToken) { navigate('/login'); return }
    if (wishlistActionLoading || isSavedToWishlist) return
    setWishlistActionLoading(true)
    try { const res = await addBookToWishlist(book.id); setWishlistIds(res.data.items.map((i) => i.book.id)) }
    catch { /* empty */ }
    finally { setWishlistActionLoading(false) }
  }

  async function handleRateBook(value: number) {
    if (!book) return
    if (!session?.accessToken) { navigate('/login'); return }
    if (value < 1 || value > 5 || isRatingSubmitting) return
    setSelectedRating(value); setIsRatingSubmitting(true); setRatingMessage(null)
    try {
      const res = await submitBookRating(book.id, value)
      setSelectedRating(res.data.rating)
      setBook((b) => b ? { ...b, ratingCount: res.data.ratingCount, averageRating: res.data.averageRating } : b)
      setRatingMessage('Rating saved.')
    } catch (e) { setRatingMessage(e instanceof Error ? e.message : 'Unable to save rating.') }
    finally { setIsRatingSubmitting(false) }
  }

  async function handleAddToCart() {
    if (!book) return
    if (!session?.accessToken) { navigate('/login'); return }
    if (cartActionLoading) return
    setCartActionLoading(true); setCartMessage(null)
    try { await addBookToCart(book.id); setCartMessage({ type: 'success', text: 'Added to cart.' }) }
    catch (e) { setCartMessage({ type: 'error', text: e instanceof Error ? e.message : 'Unable to add to cart.' }) }
    finally { setCartActionLoading(false) }
  }

  /* ── Shared header ── */
  const Header = (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 dark:border-stone-800 bg-[#FAFAF8]/95 dark:bg-[#0E0E0C]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:block">Back to catalog</span>
        </Link>

        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex size-8 items-center justify-center rounded-lg bg-stone-900 dark:bg-stone-100 transition-transform group-hover:scale-105">
            <BookOpen className="size-4 text-stone-100 dark:text-stone-900" />
          </div>
          <span className="font-serif text-base font-semibold tracking-tight">Bookstore</span>
        </Link>

        <div className="flex items-center gap-2">
          {session?.accessToken ? (
            <>
              <Link to="/cart" aria-label="Cart"
                className="flex size-9 items-center justify-center rounded-full text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <ShoppingCart className="size-4" />
              </Link>
              <CustomerAccountMenu onLogout={() => void handleLogout()} />
            </>
          ) : (
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0E0E0C] text-stone-900 dark:text-stone-100">
        {Header}
        <BookDetailSkeleton />
      </div>
    )
  }

  /* ── Error state ── */
  if (errorMessage || !book) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0E0E0C] text-stone-900 dark:text-stone-100">
        {Header}
        <div className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 text-center">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 mb-6">
            <BookOpen className="size-7 text-stone-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Book not found</h2>
          <p className="text-stone-500 dark:text-stone-400 mb-8 text-sm">{errorMessage || 'This book could not be found.'}</p>
          <Link to="/"
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 dark:bg-stone-100 px-6 py-2.5 text-sm font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors">
            <ArrowLeft className="size-3.5" /> Back to catalog
          </Link>
        </div>
      </div>
    )
  }

  /* ── Display stars ── */
  const displayRating = hoveredRating || selectedRating

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0E0E0C] text-stone-900 dark:text-stone-100">
      {Header}

      {/* ── Slim breadcrumb ── */}
      <div className="border-b border-stone-100 dark:border-stone-800/60 bg-white dark:bg-stone-950">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-10 text-xs text-stone-400">
            <Link to="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Catalog</Link>
            <span>/</span>
            <span className="text-stone-600 dark:text-stone-300 truncate max-w-[220px]">{book.title}</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[360px_1fr] lg:gap-16">

          {/* ── Left: Cover + CTA ── */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">

            {/* Book cover */}
            <div className="relative overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-800 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
              <div className="aspect-[3/4]">
                <img
                  src={imgSrc}
                  alt={book.title}
                  onError={() => setImgSrc(BOOK_COVER_PLACEHOLDER)}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Overlay badges */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                  isAvailable
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-red-50 text-red-600 ring-1 ring-red-200'
                }`}>
                  {isAvailable ? 'In Stock' : 'Sold Out'}
                </span>
                <span className="inline-flex items-center rounded-md bg-stone-950/80 px-2.5 py-1 text-sm font-bold text-white backdrop-blur">
                  {formatPrice(book.price)}
                </span>
              </div>
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => void handleAddToCart()}
              disabled={cartActionLoading || !isAvailable}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 dark:bg-stone-100 px-5 py-3 text-sm font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cartActionLoading ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
              {cartActionLoading ? 'Adding…' : isAvailable ? 'Add to cart' : 'Out of stock'}
            </button>

            {/* Wishlist CTA */}
            <button
              onClick={() => void handleAddToWishlist()}
              disabled={wishlistActionLoading || isSavedToWishlist}
              className={`flex w-full items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-medium transition-colors ${
                isSavedToWishlist
                  ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400 cursor-default'
                  : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              {wishlistActionLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Heart className={`size-4 ${isSavedToWishlist ? 'fill-current' : ''}`} />
              )}
              {isSavedToWishlist ? 'Saved to wishlist' : 'Save to wishlist'}
            </button>

            {/* Cart feedback */}
            {cartMessage && (
              <p className={`text-center text-xs font-medium ${cartMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {cartMessage.text}
              </p>
            )}
          </div>

          {/* ── Right: Book info ── */}
          <div className="space-y-8 min-w-0">

            {/* Title block */}
            <div className="border-b border-stone-100 dark:border-stone-800 pb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400 mb-3">
                {categoryNameById(book.categoryId)}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-50 mb-3">
                {book.title}
              </h1>
              <p className="text-base text-stone-500 dark:text-stone-400">
                By <span className="font-medium text-stone-700 dark:text-stone-300">{getPrimaryAuthor(book)}</span>
              </p>

              {/* Star rating display */}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${i < Math.round(book.averageRating) ? 'fill-amber-500 text-amber-500' : 'fill-stone-200 text-stone-200 dark:fill-stone-700 dark:text-stone-700'}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-stone-700 dark:text-stone-300 tabular-nums">{book.averageRating.toFixed(1)}</span>
                <span className="text-sm text-stone-400">·</span>
                <span className="text-sm text-stone-500 dark:text-stone-400">{book.ratingCount.toLocaleString()} ratings</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 divide-x divide-stone-100 dark:divide-stone-800 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
              {[
                { label: 'Avg. rating', value: book.averageRating.toFixed(1) },
                { label: 'Total ratings', value: book.ratingCount.toLocaleString() },
                { label: 'In stock', value: book.stock.toLocaleString() },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center justify-center gap-0.5 py-4 px-3">
                  <span className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">{stat.value}</span>
                  <span className="text-[11px] uppercase tracking-widest text-stone-400 font-medium text-center">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">About this book</h2>
              <p className="text-sm leading-7 text-stone-600 dark:text-stone-400">
                {book.description || 'No description is available for this book yet.'}
              </p>
            </div>

            {/* Metadata grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">Publication</h2>
                <div className="space-y-2.5">
                  {book.isbn && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Hash className="size-3.5 text-stone-400 shrink-0" />
                      <span className="text-stone-500 dark:text-stone-400 shrink-0">ISBN</span>
                      <span className="font-medium text-stone-700 dark:text-stone-300 tabular-nums ml-auto">{book.isbn}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm">
                    <Tag className="size-3.5 text-stone-400 shrink-0" />
                    <span className="text-stone-500 dark:text-stone-400 shrink-0">Genre</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300 ml-auto">{categoryNameById(book.categoryId)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <BookOpen className="size-3.5 text-stone-400 shrink-0" />
                    <span className="text-stone-500 dark:text-stone-400 shrink-0">Status</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300 capitalize ml-auto">{book.status}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">Catalog dates</h2>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar className="size-3.5 text-stone-400 shrink-0" />
                    <span className="text-stone-500 dark:text-stone-400 shrink-0">Added</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300 ml-auto">{formatDate(book.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar className="size-3.5 text-stone-400 shrink-0" />
                    <span className="text-stone-500 dark:text-stone-400 shrink-0">Updated</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300 ml-auto">{formatDate(book.updatedAt)}</span>
                  </div>
                  {book.likeCount !== undefined && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Heart className="size-3.5 text-stone-400 shrink-0" />
                      <span className="text-stone-500 dark:text-stone-400 shrink-0">Likes</span>
                      <span className="font-medium text-stone-700 dark:text-stone-300 ml-auto tabular-nums">{book.likeCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rate this book */}
            <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">Your rating</h2>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  {session?.accessToken ? 'Tap a star to rate this book.' : 'Sign in to leave a rating.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => {
                  const value = i + 1
                  const filled = value <= displayRating

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => void handleRateBook(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      disabled={isRatingSubmitting || !session?.accessToken}
                      aria-label={`${value} star${value !== 1 ? 's' : ''}`}
                      aria-pressed={value <= selectedRating}
                      className={`size-10 flex items-center justify-center rounded-full border transition-all duration-150 ${
                        filled
                          ? 'border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-400 scale-110'
                          : 'border-stone-200 dark:border-stone-700 text-stone-300 dark:text-stone-600 hover:border-amber-300 hover:text-amber-400 hover:scale-110'
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <Star className={`size-4 ${filled ? 'fill-current' : ''}`} />
                    </button>
                  )
                })}

                {isRatingSubmitting && <Loader2 className="size-4 animate-spin text-stone-400 ml-1" />}

                {selectedRating > 0 && !isRatingSubmitting && (
                  <span className="ml-1 text-xs text-stone-500 dark:text-stone-400">
                    {selectedRating} / 5
                  </span>
                )}
              </div>

              {ratingMessage && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{ratingMessage}</p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 mt-16">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-stone-900 dark:bg-stone-100">
                <BookOpen className="size-3.5 text-white dark:text-stone-900" />
              </div>
              <span className="font-serif text-sm font-semibold">Bookstore</span>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              © {new Date().getFullYear()} Bookstore. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-xs text-stone-400 dark:text-stone-500">
              <a href="#" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Privacy</a>
              <a href="#" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Terms</a>
              <a href="#" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default BookDetailsPage