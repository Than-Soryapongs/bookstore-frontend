import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, Heart, Loader2, ShoppingCart, Star, Trash2, X } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Skeleton } from '../../../components/ui/skeleton'
import { addBookToCart } from '../../shared/cart'
import { loadAuthSession, logout } from '../../shared/auth'
import { fetchWishlist, removeBookFromWishlist, type WishlistItem } from '../../shared/wishlist'
import CustomerAccountMenu from '../components/CustomerAccountMenu'

/* ─── Constants ─────────────────────────────────────────────────────── */

const BOOK_COVER_PLACEHOLDER = '/img/bookstore-img.jpg'

/* ─── Helpers ────────────────────────────────────────────────────────── */

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

function getPrimaryAuthor(item: WishlistItem) {
  return item.book.authors[0]?.name ?? 'Unknown Author'
}

function resolveCoverImageSrc(coverImageUrl?: string | null) {
  if (!coverImageUrl || coverImageUrl.trim().length === 0) return BOOK_COVER_PLACEHOLDER
  if (/^https?:\/\//i.test(coverImageUrl)) return coverImageUrl
  return coverImageUrl.startsWith('/') ? coverImageUrl : `/${coverImageUrl}`
}

/* ─── Skeleton ───────────────────────────────────────────────────────── */

function WishlistSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-5 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <Skeleton className="size-16 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <div className="shrink-0 space-y-2 text-right">
            <Skeleton className="h-5 w-16 ml-auto" />
            <Skeleton className="h-8 w-24 rounded-full ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Wishlist Item Row ──────────────────────────────────────────────── */

function WishlistRow({
  item,
  isRemoving,
  isAddingToCart,
  onRemove,
  onAddToCart,
}: {
  item: WishlistItem
  isRemoving: boolean
  isAddingToCart: boolean
  onRemove: (bookId: number) => void
  onAddToCart: (bookId: number) => void
}) {
  const { book } = item
  const [imgSrc, setImgSrc] = useState(resolveCoverImageSrc(book.coverImageUrl))
  const isAvailable = book.stock > 0

  return (
    <div className={`group flex items-center gap-4 sm:gap-5 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 transition-all duration-200 hover:border-stone-200 dark:hover:border-stone-700 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${isRemoving ? 'opacity-40 pointer-events-none' : ''}`}>

      {/* Cover thumbnail */}
      <Link to={`/books/${book.id}`} className="shrink-0">
        <div className="size-16 sm:size-20 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800 shadow-sm">
          <img
            src={imgSrc}
            alt={book.title}
            onError={() => setImgSrc(BOOK_COVER_PLACEHOLDER)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/books/${book.id}`} className="block group/title">
          <h3 className="font-serif text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 group-hover/title:text-stone-600 dark:group-hover/title:text-stone-400 transition-colors">
            {book.title}
          </h3>
        </Link>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide font-medium text-stone-400 dark:text-stone-500">
          {getPrimaryAuthor(item)}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3 ${i < Math.round(book.averageRating) ? 'fill-amber-500 text-amber-500' : 'fill-stone-200 text-stone-200 dark:fill-stone-700 dark:text-stone-700'}`}
              />
            ))}
            <span className="ml-1 text-[10px] font-medium tabular-nums text-stone-400">{book.averageRating.toFixed(1)}</span>
          </div>

          {/* Stock */}
          <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
            isAvailable
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
          }`}>
            {isAvailable ? 'In Stock' : 'Sold Out'}
          </span>

          {/* Category */}
          {(book.category?.name ?? null) && (
            <span className="text-[10px] uppercase tracking-widest font-medium text-stone-400">
              {book.category?.name}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-[11px] text-stone-400 dark:text-stone-500">
          Saved {formatDate(item.createdAt)}
        </p>
      </div>

      {/* Price + actions */}
      <div className="shrink-0 flex flex-col items-end gap-3">
        <span className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 tabular-nums">
          {formatPrice(book.price)}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddToCart(book.id)}
            disabled={isAddingToCart || !isAvailable}
            className="flex items-center gap-1.5 rounded-full bg-stone-900 dark:bg-stone-100 px-3.5 py-2 text-[11px] font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingToCart
              ? <Loader2 className="size-3.5 animate-spin" />
              : <ShoppingCart className="size-3.5" />
            }
            <span className="hidden sm:block">Add to cart</span>
          </button>

          <button
            type="button"
            onClick={() => onRemove(book.id)}
            disabled={isRemoving}
            aria-label={`Remove ${book.title} from wishlist`}
            className="flex size-8 items-center justify-center rounded-full border border-stone-200 dark:border-stone-700 text-stone-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
          >
            {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export function WishlistPage() {
  const navigate = useNavigate()
  const session = loadAuthSession()

  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionBookId, setActionBookId] = useState<number | null>(null)
  const [cartBookId, setCartBookId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cartSuccessId, setCartSuccessId] = useState<number | null>(null)

  /* ── Load wishlist ── */
  useEffect(() => {
    if (!session?.accessToken) return
    let active = true
    async function run() {
      setIsLoading(true); setErrorMessage(null)
      try {
        const res = await fetchWishlist()
        if (active) setItems(res.data.items)
      } catch (e) {
        if (active) { setItems([]); setErrorMessage(e instanceof Error ? e.message : 'Unable to load wishlist.') }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void run()
    return () => { active = false }
  }, [session?.accessToken])

  /* ── Handlers ── */
  async function handleLogout() { await logout(); navigate('/', { replace: true }) }

  async function handleRemove(bookId: number) {
    if (actionBookId === bookId) return
    setActionBookId(bookId)
    try {
      const res = await removeBookFromWishlist(bookId)
      setItems(res.data.items)
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to update wishlist.')
    } finally {
      setActionBookId(null)
    }
  }

  async function handleAddToCart(bookId: number) {
    if (cartBookId === bookId) return
    setCartBookId(bookId)
    try {
      await addBookToCart(bookId)
      setCartSuccessId(bookId)
      setTimeout(() => setCartSuccessId(null), 2500)
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to add to cart.')
    } finally {
      setCartBookId(null)
    }
  }

  if (!session?.accessToken) return <Navigate replace to="/login" />

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0E0E0C] text-stone-900 dark:text-stone-100">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 dark:border-stone-800 bg-[#FAFAF8]/95 dark:bg-[#0E0E0C]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:block">Catalog</span>
          </Link>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-stone-900 dark:bg-stone-100 transition-transform group-hover:scale-105">
              <BookOpen className="size-4 text-stone-100 dark:text-stone-900" />
            </div>
            <span className="font-serif text-base font-semibold tracking-tight">Bookstore</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/cart" aria-label="Cart"
              className="flex size-9 items-center justify-center rounded-full text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              <ShoppingCart className="size-4" />
            </Link>
            <CustomerAccountMenu onLogout={() => void handleLogout()} />
          </div>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <div className="border-b border-stone-100 dark:border-stone-800/60 bg-white dark:bg-stone-950">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-10 text-xs text-stone-400">
            <Link to="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Catalog</Link>
            <span>/</span>
            <span className="text-stone-600 dark:text-stone-300">Wishlist</span>
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">

          {/* Page heading */}
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400 mb-2">
                Your collection
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                Wishlist
              </h1>
              {!isLoading && items.length > 0 && (
                <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                  {items.length} saved title{items.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {!isLoading && items.length > 0 && (
              <Link
                to="/"
                className="shrink-0 inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Browse more
              </Link>
            )}
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Cart success toast */}
          {cartSuccessId && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
              <ShoppingCart className="size-3.5 shrink-0" />
              Added to cart.
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <WishlistSkeleton />
          ) : items.length > 0 ? (
            <div className="space-y-2.5">
              {items.map((item) => (
                <WishlistRow
                  key={item.book.id}
                  item={item}
                  isRemoving={actionBookId === item.book.id}
                  isAddingToCart={cartBookId === item.book.id}
                  onRemove={handleRemove}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-8 py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
                <Heart className="size-6 text-stone-400" />
              </div>
              <div>
                <p className="font-serif text-lg font-semibold text-stone-800 dark:text-stone-200">Nothing saved yet</p>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 max-w-xs">
                  Browse the catalog and save books you'd like to read — they'll appear here.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 dark:bg-stone-100 px-5 py-2.5 text-sm font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
              >
                Browse catalog
              </Link>
            </div>
          )}
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

export default WishlistPage