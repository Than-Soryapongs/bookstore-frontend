import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  Eye,
  Heart,
  Loader2,
  Search,
  ShoppingBag,
  ShoppingCart,
  Star,
  X,
  ArrowRight,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Skeleton } from '../../../components/ui/skeleton'
import { addBookToCart, fetchCart } from '../../shared/cart'
import {
  fetchCatalogBooks,
  fetchCatalogCategories,
  fetchMostRatedCatalogBook,
  fetchTopSalesCatalogBook,
  searchCatalogBooks,
  type BookSortField,
  type CatalogBook,
  type CatalogCategory,
} from '../../shared/catalog'
import { loadAuthSession, logout } from '../../shared/auth'
import { addBookToWishlist, fetchWishlist, removeBookFromWishlist } from '../../shared/wishlist'
import CustomerAccountMenu from '../components/CustomerAccountMenu'

const ANNOUNCEMENTS = [
  { tag: 'Offer',   text: 'Free shipping on all orders over $50' },
  { tag: 'New',     text: 'Fresh arrivals added every week — explore now' },
  { tag: 'Members', text: 'Sign up for 10% off your first order' },
  { tag: 'Gift',    text: 'Gift wrapping available at checkout' },
  { tag: 'Returns', text: 'Free 30-day returns on all purchases' },
]

function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'visible' | 'exit' | 'enter'>('visible')

  function goTo(next: number) {
    setPhase('exit')
    setTimeout(() => {
      setIndex(next)
      setPhase('enter')
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('visible')))
    }, 400)
  }

  useEffect(() => {
    const id = setInterval(() => goTo((index + 1) % ANNOUNCEMENTS.length), 4500)
    return () => clearInterval(id)
  }, [index])

  const { tag, text } = ANNOUNCEMENTS[index]

  const trackStyle: React.CSSProperties =
    phase === 'exit'
      ? { transform: 'translateY(-110%)', opacity: 0, transition: 'transform 0.4s ease, opacity 0.35s ease' }
      : phase === 'enter'
      ? { transform: 'translateY(110%)', opacity: 0, transition: 'none' }
      : { transform: 'translateY(0)', opacity: 1, transition: 'transform 0.4s ease, opacity 0.35s ease' }

  return (
    <div className="flex items-center justify-center bg-stone-900 dark:bg-stone-950 h-9 overflow-hidden relative">
      <div style={trackStyle} className="flex items-center gap-2.5 text-stone-300 text-xs font-medium tracking-wide whitespace-nowrap">
        <span className="inline-flex items-center rounded-sm bg-stone-800 border border-stone-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-stone-400">
          {tag}
        </span>
        {text}
      </div>
      <div className="absolute right-4 flex items-center gap-1.5">
        {ANNOUNCEMENTS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all ${i === index ? 'w-3.5 h-1.5 bg-stone-400' : 'w-1.5 h-1.5 bg-stone-600'}`}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Types ─────────────────────────────────────────────────────────────── */

type SortOption = {
  label: string
  sortBy: BookSortField
  sortDirection: 'asc' | 'desc'
}

type FeaturedSlide = {
  id: string
  badge: string
  eyebrow: string
  title: string
  author: string
  description: string
  coverImageUrl: string | null | undefined
  rating: number
  ratingCount: number
  price: number
  bookId: number
  totalSoldLabel?: string
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest first', sortBy: 'createdAt', sortDirection: 'desc' },
  { label: 'Oldest first', sortBy: 'createdAt', sortDirection: 'asc' },
  { label: 'Title: A to Z', sortBy: 'title', sortDirection: 'asc' },
  { label: 'Price: low to high', sortBy: 'price', sortDirection: 'asc' },
  { label: 'Price: high to low', sortBy: 'price', sortDirection: 'desc' },
  { label: 'Most liked', sortBy: 'likeCount', sortDirection: 'desc' },
  { label: 'Rating: high to low', sortBy: 'averageRating', sortDirection: 'desc' },
  { label: 'Recently updated', sortBy: 'updatedAt', sortDirection: 'desc' },
]

const BOOK_COVER_PLACEHOLDER = '/img/bookstore-img.jpg'
const PRICE_SLIDER_MIN = 0
const PRICE_SLIDER_MAX = 500
const PRICE_SLIDER_STEP = 1

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatSoldCount(value: number) {
  return new Intl.NumberFormat(undefined).format(value)
}

function getPrimaryAuthor(book: CatalogBook) {
  return book.authors[0]?.name ?? 'Unknown Author'
}

function resolveCoverImageSrc(coverImageUrl?: string | null) {
  if (!coverImageUrl || coverImageUrl.trim().length === 0) return BOOK_COVER_PLACEHOLDER
  if (/^https?:\/\//i.test(coverImageUrl)) return coverImageUrl
  return coverImageUrl.startsWith('/') ? coverImageUrl : `/${coverImageUrl}`
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StarRating({ rating, compact = false }: { rating: number; compact?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${compact ? 'size-3' : 'size-3.5'} ${
            i < Math.round(rating) ? 'fill-amber-500 text-amber-500' : 'fill-stone-200 text-stone-200 dark:fill-stone-700 dark:text-stone-700'
          }`}
        />
      ))}
      <span className={`ml-1 font-medium tabular-nums text-stone-500 dark:text-stone-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

function BookCard({
  book,
  isSaved,
  isSaving,
  onAddToCart,
  onSave,
}: {
  book: CatalogBook
  isSaved: boolean
  isSaving: boolean
  onAddToCart: (bookId: number) => void
  onSave: (bookId: number) => void
}) {
  const [imgSrc, setImgSrc] = useState(resolveCoverImageSrc(book.coverImageUrl))
  const isAvailable = book.stock > 0

  return (
    <article className="group relative flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)] hover:-translate-y-0.5">
      {/* Cover image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100 dark:bg-stone-800">
        <img
          src={imgSrc}
          alt={book.title}
          onError={() => setImgSrc(BOOK_COVER_PLACEHOLDER)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />

        {/* Hover overlay actions */}
        <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <Link
            to={`/books/${book.id}`}
            aria-label={`View ${book.title}`}
            className="flex size-10 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md hover:bg-white transition-colors"
          >
            <Eye className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => onAddToCart(book.id)}
            aria-label={`Add ${book.title} to cart`}
            className="flex size-10 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-md hover:bg-white transition-colors"
          >
            <ShoppingCart className="size-4" />
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
              isAvailable
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-red-50 text-red-600 ring-1 ring-red-200'
            }`}
          >
            {isAvailable ? 'In Stock' : 'Sold Out'}
          </span>
          <span className="inline-flex items-center rounded-md bg-stone-950/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            {formatPrice(book.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <h3 className="line-clamp-2 font-serif text-sm font-semibold leading-snug text-stone-900 dark:text-stone-100">
            {book.title}
          </h3>
          <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 uppercase tracking-wide font-medium">
            {getPrimaryAuthor(book)}
          </p>
        </div>

        <StarRating rating={book.averageRating} compact />

        <p className="line-clamp-2 flex-1 text-[11px] leading-5 text-stone-500 dark:text-stone-400">
          {book.description || ''}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-3">
          <span className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
            {book.ratingCount.toLocaleString()} ratings
          </span>
          <button
            type="button"
            onClick={() => onSave(book.id)}
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
              isSaved
                ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400'
                : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800'
            }`}
          >
            {isSaving ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Heart className={`size-3 ${isSaved ? 'fill-current' : ''}`} />
            )}
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </article>
  )
}

function BookCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export function HomePage() {
  const navigate = useNavigate()
  const session = loadAuthSession()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CatalogBook[]>([])
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>(SORT_OPTIONS[0])
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [books, setBooks] = useState<CatalogBook[]>([])
  const [featuredBook, setFeaturedBook] = useState<CatalogBook | null>(null)
  const [topSalesBook, setTopSalesBook] = useState<CatalogBook | null>(null)
  const [topSalesTotalSold, setTopSalesTotalSold] = useState<number | null>(null)
  const [minPriceValue, setMinPriceValue] = useState(PRICE_SLIDER_MIN)
  const [maxPriceValue, setMaxPriceValue] = useState(PRICE_SLIDER_MAX)
  const [isLoading, setIsLoading] = useState(true)
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true)
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [wishlistIds, setWishlistIds] = useState<number[]>([])
  const [isWishlistLoading, setIsWishlistLoading] = useState(false)
  const [wishlistActionId, setWishlistActionId] = useState<number | null>(null)
  const [cartActionId, setCartActionId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [featuredSlideIndex, setFeaturedSlideIndex] = useState(0)
  const sortMenuRef = useRef<HTMLDivElement | null>(null)

  const minPrice = useMemo(() => {
    return minPriceValue > PRICE_SLIDER_MIN ? minPriceValue : undefined
  }, [minPriceValue])

  const maxPrice = useMemo(() => {
    return maxPriceValue < PRICE_SLIDER_MAX ? maxPriceValue : undefined
  }, [maxPriceValue])

  const priceRangeLabel = useMemo(() => {
    if (minPrice === undefined && maxPrice === undefined) {
      return null
    }

    const minimum = minPrice !== undefined ? formatPrice(minPrice) : 'Any'
    const maximum = maxPrice !== undefined ? formatPrice(maxPrice) : 'Any'

    return `${minimum} - ${maximum}`
  }, [maxPrice, minPrice])

  /* ── Debounce search ── */
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => window.clearTimeout(t)
  }, [searchQuery])

  /* ── Search results ── */
  useEffect(() => {
    let active = true
    async function run() {
      if (!debouncedQuery) { setSearchResults([]); setIsSearchLoading(false); return }
      setIsSearchLoading(true)
      try {
        const res = await searchCatalogBooks({ keyword: debouncedQuery, page: 0, size: 5 })
        if (active) setSearchResults(res.data.content)
      } catch { if (active) setSearchResults([]) }
      finally { if (active) setIsSearchLoading(false) }
    }
    void run()
    return () => { active = false }
  }, [debouncedQuery])

  /* ── Categories ── */
  useEffect(() => {
    let active = true
    async function run() {
      setIsCategoriesLoading(true)
      try {
        const res = await fetchCatalogCategories({ page: 0, size: 200, sortBy: 'name', sortDirection: 'asc' })
        if (active) setCategories(res.data.content)
      } catch { if (active) setCategories([]) }
      finally { if (active) setIsCategoriesLoading(false) }
    }
    void run()
    return () => { active = false }
  }, [])

  /* ── Books ── */
  useEffect(() => {
    let active = true
    async function run() {
      setIsLoading(true); setErrorMessage(null)
      try {
        const res = await fetchCatalogBooks({
          page: 0,
          size: 12,
          categoryId: activeCategoryId ?? undefined,
          minPrice,
          maxPrice,
          sortBy: sortOption.sortBy,
          sortDirection: sortOption.sortDirection,
        })
        if (active) setBooks(res.data.content)
      } catch (e) {
        if (active) { setBooks([]); setErrorMessage(e instanceof Error ? e.message : 'Unable to load books.') }
      }
      finally { if (active) setIsLoading(false) }
    }
    void run()
    return () => { active = false }
  }, [activeCategoryId, maxPrice, minPrice, sortOption.sortBy, sortOption.sortDirection])

  /* ── Click-outside sort ── */
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setIsSortOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsSortOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [])

  /* ── Wishlist ── */
  useEffect(() => {
    let active = true
    async function run() {
      if (!session?.accessToken) { setWishlistIds([]); return }
      setIsWishlistLoading(true)
      try {
        const res = await fetchWishlist()
        if (active) setWishlistIds(res.data.items.map((i) => i.book.id))
      } catch { if (active) setWishlistIds([]) }
      finally { if (active) setIsWishlistLoading(false) }
    }
    void run()
    return () => { active = false }
  }, [session?.accessToken])

  /* ── Cart + Featured ── */
  useEffect(() => {
    let active = true
    async function loadCart() {
      if (!session?.accessToken) { setCartCount(0); return }
      try {
        const res = await fetchCart()
        if (active) setCartCount(res.data.totalQuantity ?? res.data.totalItems ?? res.data.items.length)
      } catch { if (active) setCartCount(0) }
    }
    async function loadFeatured() {
      setIsFeaturedLoading(true)
      try {
        const [topRes, ratedRes] = await Promise.all([fetchTopSalesCatalogBook(), fetchMostRatedCatalogBook()])
        if (active) { setTopSalesBook(topRes.data.book); setTopSalesTotalSold(topRes.data.totalSold); setFeaturedBook(ratedRes.data) }
      } catch { if (active) { setTopSalesBook(null); setTopSalesTotalSold(null); setFeaturedBook(null) } }
      finally { if (active) setIsFeaturedLoading(false) }
    }
    void loadCart(); void loadFeatured()
    return () => { active = false }
  }, [session?.accessToken])

  /* ── Featured slides ── */
  const featuredSlides = useMemo<FeaturedSlide[]>(() => {
    const slides: FeaturedSlide[] = []
    if (topSalesBook) slides.push({ id: `top-${topSalesBook.id}`, badge: 'Bestseller', eyebrow: topSalesTotalSold !== null ? `${formatSoldCount(topSalesTotalSold)} sold` : 'Trending', title: topSalesBook.title, author: getPrimaryAuthor(topSalesBook), description: topSalesBook.description || '', coverImageUrl: topSalesBook.coverImageUrl, rating: topSalesBook.averageRating, ratingCount: topSalesBook.ratingCount, price: topSalesBook.price, bookId: topSalesBook.id, totalSoldLabel: topSalesTotalSold !== null ? `${formatSoldCount(topSalesTotalSold)} sold` : undefined })
    if (featuredBook) slides.push({ id: `rated-${featuredBook.id}`, badge: 'Top Rated', eyebrow: `${featuredBook.ratingCount.toLocaleString()} ratings`, title: featuredBook.title, author: getPrimaryAuthor(featuredBook), description: featuredBook.description || '', coverImageUrl: featuredBook.coverImageUrl, rating: featuredBook.averageRating, ratingCount: featuredBook.ratingCount, price: featuredBook.price, bookId: featuredBook.id })
    return slides
  }, [featuredBook, topSalesBook, topSalesTotalSold])

  useEffect(() => {
    if (featuredSlides.length <= 1) return
    const id = window.setInterval(() => setFeaturedSlideIndex((c) => (c + 1) % featuredSlides.length), 7000)
    return () => window.clearInterval(id)
  }, [featuredSlides.length])

  useEffect(() => { if (featuredSlideIndex >= featuredSlides.length) setFeaturedSlideIndex(0) }, [featuredSlideIndex, featuredSlides.length])

  const activeSlide = featuredSlides[featuredSlideIndex] ?? null
  const wishlistIdSet = useMemo(() => new Set(wishlistIds), [wishlistIds])
  const activeCategoryLabel = activeCategoryId !== null ? (categories.find((c) => c.id === activeCategoryId)?.name ?? `Category #${activeCategoryId}`) : null
  const showSearchDropdown = debouncedQuery.length > 0 && (isSearchLoading || searchResults.length > 0)

  /* ── Handlers ── */
  async function handleLogout() { await logout(); navigate('/', { replace: true }) }

  async function handleAddToCart(bookId: number) {
    if (!session?.accessToken) { navigate('/login'); return }
    if (cartActionId === bookId) return
    setCartActionId(bookId)
    try { const res = await addBookToCart(bookId); setCartCount(res.data.totalQuantity ?? res.data.totalItems ?? res.data.items.length) }
    catch { try { const r = await fetchCart(); setCartCount(r.data.totalQuantity ?? r.data.totalItems ?? r.data.items.length) } catch { /* empty */ } }
    finally { setCartActionId(null) }
  }

  async function handleSaveBook(bookId: number) {
    if (!session?.accessToken) { navigate('/login'); return }
    if (wishlistActionId === bookId) return
    setWishlistActionId(bookId)
    try { const res = wishlistIdSet.has(bookId) ? await removeBookFromWishlist(bookId) : await addBookToWishlist(bookId); setWishlistIds(res.data.items.map((i) => i.book.id)) }
    catch { /* empty */ }
    finally { setWishlistActionId(null) }
  }

  function handleCategorySelect(categoryId: number | null) { setActiveCategoryId(categoryId) }
  function clearSearch() { setSearchQuery(''); setSearchResults([]) }

  function applyPricePreset(minimum?: number, maximum?: number) {
    const nextMin = Math.max(PRICE_SLIDER_MIN, Math.min(minimum ?? PRICE_SLIDER_MIN, PRICE_SLIDER_MAX))
    const nextMax = Math.max(nextMin, Math.min(maximum ?? PRICE_SLIDER_MAX, PRICE_SLIDER_MAX))

    setMinPriceValue(nextMin)
    setMaxPriceValue(nextMax)
  }

  function clearPriceFilters() {
    setMinPriceValue(PRICE_SLIDER_MIN)
    setMaxPriceValue(PRICE_SLIDER_MAX)
  }

  function handleMinPriceChange(value: number) {
    const nextMin = Math.max(PRICE_SLIDER_MIN, Math.min(value, maxPriceValue))
    setMinPriceValue(nextMin)
  }

  function handleMaxPriceChange(value: number) {
    const nextMax = Math.min(PRICE_SLIDER_MAX, Math.max(value, minPriceValue))
    setMaxPriceValue(nextMax)
  }

  /* ─────────────────────────────────────────────────────────────────── JSX */
  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0E0E0C] text-stone-900 dark:text-stone-100">

      {/* ── Topbar announcement ── */}
      <AnnouncementBar />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 dark:border-stone-800 bg-[#FAFAF8]/95 dark:bg-[#0E0E0C]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-6">

            {/* Wordmark */}
            <Link to="/" className="flex shrink-0 items-center gap-2.5 group">
              <div className="flex size-8 items-center justify-center rounded-lg bg-stone-900 dark:bg-stone-100 transition-transform group-hover:scale-105">
                <BookOpen className="size-4 text-stone-100 dark:text-stone-900" />
              </div>
              <span className="font-serif text-base font-semibold tracking-tight">Bookstore</span>
            </Link>

            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                placeholder="Search titles, authors…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 pl-10 pr-9 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none ring-0 focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                  <X className="size-3.5" />
                </button>
              )}

              {/* Dropdown */}
              {showSearchDropdown && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 px-4 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
                      {isSearchLoading ? 'Searching…' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
                    </p>
                    <button onClick={clearSearch} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">Clear</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {isSearchLoading ? (
                      <div className="space-y-px p-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                            <Skeleton className="size-12 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
                          </div>
                        ))}
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="p-2">
                        {searchResults.map((book) => (
                          <Link key={book.id} to={`/books/${book.id}`} onClick={() => setSearchQuery('')}
                            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800">
                            <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800">
                              <img src={resolveCoverImageSrc(book.coverImageUrl)} alt={book.title} className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.src = BOOK_COVER_PLACEHOLDER }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{book.title}</p>
                              <p className="truncate text-xs text-stone-500 dark:text-stone-400">{getPrimaryAuthor(book)}</p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold text-stone-900 dark:text-stone-100">{formatPrice(book.price)}</p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-8 text-center text-sm text-stone-500">No results found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              <Link to="/catalog" className="hidden sm:block rounded-lg px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                Catalog
              </Link>
              <Link to="/about" className="hidden sm:block rounded-lg px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                About
              </Link>

              {session?.accessToken && (
                <Link to="/orders" className="hidden sm:block rounded-lg px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                  Orders
                </Link>
              )}

              {session?.accessToken ? (
                <Link to="/wishlist" aria-label="Wishlist"
                  className="relative ml-1 flex size-9 items-center justify-center rounded-full text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                  <Heart className="size-4" />
                  {!isWishlistLoading && wishlistIds.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                      {wishlistIds.length}
                    </span>
                  )}
                </Link>
              ) : (
                <div className="flex items-center gap-2 ml-2">
                  <Link to="/login" className="rounded-lg px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
                    Sign in
                  </Link>
                  <Link to="/signup" className="rounded-full bg-stone-900 dark:bg-stone-100 px-4 py-2 text-sm font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors">
                    Sign up
                  </Link>
                </div>
              )}

              <Link to="/cart" aria-label="Cart"
                className="relative ml-1 flex size-9 items-center justify-center rounded-full text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <ShoppingBag className="size-4" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-100 text-[9px] font-bold text-white dark:text-stone-900">
                    {cartCount}
                  </span>
                )}
              </Link>

              {session?.accessToken && <CustomerAccountMenu onLogout={() => void handleLogout()} />}
            </nav>
          </div>
        </div>
      </header>

      {/* ── Hero / Featured ── */}
      <section className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 min-h-[520px]">

            {/* Left: headline */}
            <div className="flex flex-col justify-center py-16 lg:py-20 lg:pr-16 border-b lg:border-b-0 lg:border-r border-stone-100 dark:border-stone-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400 mb-4">
                The Reading Room
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-50 mb-6">
                Books that<br />stay with you.
              </h1>
              <p className="text-base leading-relaxed text-stone-500 dark:text-stone-400 max-w-sm mb-8">
                A curated catalog of titles across every genre — with live stock, honest ratings, and no noise.
              </p>
              <div className="flex items-center gap-3">
                <a href="#catalog" className="inline-flex items-center gap-2 rounded-full bg-stone-900 dark:bg-stone-100 px-5 py-2.5 text-sm font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors">
                  Browse catalog <ArrowRight className="size-3.5" />
                </a>
                {session?.accessToken && (
                  <Link to="/wishlist" className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 px-5 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                    My wishlist
                  </Link>
                )}
              </div>
            </div>

            {/* Right: featured shelf */}
            <div className="flex flex-col justify-center py-12 lg:py-16 lg:pl-16">
              {isFeaturedLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-5">
                    <Skeleton className="aspect-[3/4] w-36 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-3 pt-1">
                      <Skeleton className="h-6 w-4/5" /><Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3.5 w-24 mt-2" /><Skeleton className="h-16 w-full mt-2" />
                      <Skeleton className="h-9 w-36 rounded-full mt-3" />
                    </div>
                  </div>
                </div>
              ) : activeSlide ? (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                        {activeSlide.badge}
                      </span>
                      <span className="text-xs text-stone-400">{activeSlide.eyebrow}</span>
                    </div>
                    {featuredSlides.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        {featuredSlides.map((s, i) => (
                          <button key={s.id} onClick={() => setFeaturedSlideIndex(i)}
                            className={`rounded-full transition-all ${i === featuredSlideIndex ? 'w-6 h-1.5 bg-stone-900 dark:bg-stone-100' : 'w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700'}`} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-6">
                    {/* Cover */}
                    <div className="relative shrink-0 w-[130px] sm:w-[150px]">
                      <div className="relative overflow-hidden rounded-xl shadow-[4px_8px_24px_rgba(0,0,0,0.15)] aspect-[3/4]">
                        <img src={resolveCoverImageSrc(activeSlide.coverImageUrl)} alt={activeSlide.title}
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.src = BOOK_COVER_PLACEHOLDER }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col justify-between flex-1 min-w-0 py-1">
                      <div className="space-y-2">
                        <h2 className="font-serif text-xl sm:text-2xl font-bold leading-tight text-stone-900 dark:text-stone-50 line-clamp-2">
                          {activeSlide.title}
                        </h2>
                        <p className="text-xs uppercase tracking-widest font-medium text-stone-400">{activeSlide.author}</p>
                        <StarRating rating={activeSlide.rating} />
                        <p className="text-xs leading-5 text-stone-500 dark:text-stone-400 line-clamp-3">
                          {activeSlide.description}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center gap-3 flex-wrap">
                        <span className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
                          {formatPrice(activeSlide.price)}
                        </span>
                        <button
                          onClick={() => void handleAddToCart(activeSlide.bookId)}
                          disabled={cartActionId === activeSlide.bookId}
                          className="inline-flex items-center gap-2 rounded-full bg-stone-900 dark:bg-stone-100 px-4 py-2 text-xs font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors disabled:opacity-60"
                        >
                          {cartActionId === activeSlide.bookId ? <Loader2 className="size-3.5 animate-spin" /> : <ShoppingCart className="size-3.5" />}
                          Add to cart
                        </button>
                        <button
                          onClick={() => void handleSaveBook(activeSlide.bookId)}
                          disabled={wishlistActionId === activeSlide.bookId}
                          className={`flex size-8 items-center justify-center rounded-full border transition-colors ${wishlistIdSet.has(activeSlide.bookId) ? 'border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-900 dark:bg-rose-950' : 'border-stone-200 dark:border-stone-700 text-stone-400 hover:text-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
                        >
                          {wishlistActionId === activeSlide.bookId ? <Loader2 className="size-3.5 animate-spin" /> : <Heart className={`size-3.5 ${wishlistIdSet.has(activeSlide.bookId) ? 'fill-current' : ''}`} />}
                        </button>
                        <Link to={`/books/${activeSlide.bookId}`}
                          className="flex size-8 items-center justify-center rounded-full border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                          <Eye className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter bar ── */}
      <div id="catalog" className="sticky top-16 z-30 border-b border-stone-200 dark:border-stone-800 bg-[#FAFAF8]/95 dark:bg-[#0E0E0C]/95 backdrop-blur-md">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3">
            <div className="flex items-center gap-4">
              {/* Category pills */}
              <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1.5 h-full">
                  <button
                    onClick={() => handleCategorySelect(null)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      activeCategoryId === null
                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    All
                  </button>
                  {isCategoriesLoading && categories.length === 0 ? (
                    <span className="shrink-0 text-xs text-stone-400 pl-2">Loading…</span>
                  ) : null}
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                        activeCategoryId === cat.id
                          ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                          : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-stone-200 dark:bg-stone-700 shrink-0" />

              {/* Sort */}
              <div className="relative shrink-0" ref={sortMenuRef}>
                <button
                  onClick={() => setIsSortOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
                >
                  Sort
                  <ChevronDown className={`size-3 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>
                {isSortOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-1.5">
                    {SORT_OPTIONS.map((opt) => {
                      const active = opt.sortBy === sortOption.sortBy && opt.sortDirection === sortOption.sortDirection
                      return (
                        <button
                          key={opt.label}
                          onClick={() => { setSortOption(opt); setIsSortOpen(false) }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                            active
                              ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                              : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                          }`}
                        >
                          {opt.label}
                          {active && <span className="text-[10px] opacity-70">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-stone-200/80 bg-white/80 p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900/70 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
                    <span className="font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">Price range</span>
                    <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 font-medium text-stone-700 shadow-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200">
                      {formatPrice(minPriceValue)} - {formatPrice(maxPriceValue)}
                    </span>
                  </div>

                  <div className="relative w-full max-w-xl px-1 py-4">
                    <div className="absolute left-1 right-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-stone-200 dark:bg-stone-700" />
                    <div
                      className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-stone-900 dark:bg-stone-100"
                      style={{
                        left: `${((minPriceValue - PRICE_SLIDER_MIN) / (PRICE_SLIDER_MAX - PRICE_SLIDER_MIN)) * 100}%`,
                        right: `${100 - ((maxPriceValue - PRICE_SLIDER_MIN) / (PRICE_SLIDER_MAX - PRICE_SLIDER_MIN)) * 100}%`,
                      }}
                    />
                    <input
                      type="range"
                      min={PRICE_SLIDER_MIN}
                      max={PRICE_SLIDER_MAX}
                      step={PRICE_SLIDER_STEP}
                      value={minPriceValue}
                      onChange={(event) => handleMinPriceChange(Number(event.target.value))}
                      className="book-price-range z-20"
                      aria-label="Minimum price"
                    />
                    <input
                      type="range"
                      min={PRICE_SLIDER_MIN}
                      max={PRICE_SLIDER_MAX}
                      step={PRICE_SLIDER_STEP}
                      value={maxPriceValue}
                      onChange={(event) => handleMaxPriceChange(Number(event.target.value))}
                      className="book-price-range z-30"
                      aria-label="Maximum price"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
                    <span>{formatPrice(PRICE_SLIDER_MIN)}</span>
                    <span>{formatPrice(PRICE_SLIDER_MAX)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    [0, 10],
                    [10, 25],
                    [25, 50],
                    [50, 100],
                  ].map(([minimum, maximum]) => (
                    <button
                      key={`${minimum}-${maximum}`}
                      type="button"
                      onClick={() => applyPricePreset(minimum, maximum)}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-medium text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-100"
                    >
                      {formatPrice(minimum)} - {formatPrice(maximum)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  {priceRangeLabel ? `Filtering by ${priceRangeLabel}` : 'Showing all price ranges'}
                </p>
                <button
                  type="button"
                  onClick={clearPriceFilters}
                  className="rounded-full border border-stone-200 px-3 py-1.5 text-[11px] font-medium text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-500 dark:hover:text-stone-100"
                >
                  Clear price filter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main catalog ── */}
      <main className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Active filter chip */}
        {activeCategoryId !== null && (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-xs text-stone-400">Filtered by:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1 text-xs text-stone-700 dark:text-stone-300">
              {activeCategoryLabel}
              <button onClick={() => setActiveCategoryId(null)} className="text-stone-400 hover:text-stone-600 transition-colors">
                <X className="size-3" />
              </button>
            </span>
          </div>
        )}

        {priceRangeLabel ? (
          <div className="mb-6 flex items-center gap-2">
            <span className="text-xs text-stone-400">Price:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1 text-xs text-stone-700 dark:text-stone-300">
              {priceRangeLabel}
              <button onClick={clearPriceFilters} className="text-stone-400 hover:text-stone-600 transition-colors">
                <X className="size-3" />
              </button>
            </span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(12)].map((_, i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50 px-6 py-5 text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        ) : books.length > 0 ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
                {books.length} title{books.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  isSaved={wishlistIdSet.has(book.id)}
                  isSaving={wishlistActionId === book.id}
                  onAddToCart={handleAddToCart}
                  onSave={handleSaveBook}
                />
              ))}
            </div>
            <div className="mt-12 flex justify-center">
              <button className="inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-8 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-500 transition-colors">
                Load more <ArrowRight className="size-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
              <BookOpen className="size-6 text-stone-400" />
            </div>
            <div>
              <p className="font-serif text-lg font-semibold text-stone-800 dark:text-stone-200">No titles found</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Try a different genre or clear the filters.</p>
            </div>
            <button onClick={clearSearch} className="mt-1 inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 px-5 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              Clear filters
            </button>
          </div>
        )}
      </main>

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
              © {new Date().getFullYear()}Bookstore. All rights reserved.
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

export default HomePage