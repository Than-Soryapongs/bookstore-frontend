import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Loader2, Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Skeleton } from '../../../components/ui/skeleton'
import { loadAuthSession, logout } from '../../shared/auth'
import { clearCart, deleteCartItem, fetchCart, updateCartItemQuantity, type CartItem } from '../../shared/cart'
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

function resolveCoverImageSrc(coverImageUrl?: string | null) {
  if (!coverImageUrl || coverImageUrl.trim().length === 0) return BOOK_COVER_PLACEHOLDER
  if (/^https?:\/\//i.test(coverImageUrl)) return coverImageUrl
  return coverImageUrl.startsWith('/') ? coverImageUrl : `/${coverImageUrl}`
}

function getItemTitle(item: CartItem) {
  return item.book?.title ?? item.title ?? 'Untitled book'
}

function getItemAuthor(item: CartItem) {
  return item.book?.authors?.[0]?.name ?? null
}

function getItemPrice(item: CartItem) {
  return item.unitPrice ?? item.book?.price ?? 0
}

function getItemQuantity(item: CartItem) {
  return item.quantity ?? 1
}

function getItemSubtotal(item: CartItem) {
  return item.lineTotal ?? getItemPrice(item) * getItemQuantity(item)
}

function getBookId(item: CartItem) {
  return item.book?.id ?? item.bookId ?? 0
}

/* ─── Skeleton ───────────────────────────────────────────────────────── */

function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <Skeleton className="size-20 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  )
}

/* ─── Cart Item Row ──────────────────────────────────────────────────── */

function CartRow({
  item,
  isActing,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem
  isActing: boolean
  onUpdateQuantity: (bookId: number, qty: number) => void
  onRemove: (bookId: number) => void
}) {
  const [imgSrc, setImgSrc] = useState(resolveCoverImageSrc(item.coverImageUrl ?? item.book?.coverImageUrl))
  const bookId = getBookId(item)
  const title = getItemTitle(item)
  const author = getItemAuthor(item)
  const quantity = getItemQuantity(item)
  const price = getItemPrice(item)
  const subtotal = getItemSubtotal(item)

  return (
    <div className={`flex gap-4 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 transition-all duration-200 hover:border-stone-200 dark:hover:border-stone-700 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${isActing ? 'opacity-50 pointer-events-none' : ''}`}>

      {/* Cover */}
      <Link to={`/books/${bookId}`} className="shrink-0">
        <div className="size-20 sm:size-24 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800 shadow-sm">
          <img
            src={imgSrc}
            alt={title}
            onError={() => setImgSrc(BOOK_COVER_PLACEHOLDER)}
            className="h-full w-full object-cover"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div>
          <Link to={`/books/${bookId}`}>
            <h2 className="font-serif text-sm font-semibold leading-snug text-stone-900 dark:text-stone-100 line-clamp-2 hover:text-stone-600 dark:hover:text-stone-400 transition-colors">
              {title}
            </h2>
          </Link>
          {author && (
            <p className="mt-0.5 text-[11px] uppercase tracking-wide font-medium text-stone-400 dark:text-stone-500">
              {author}
            </p>
          )}
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">
          {formatPrice(price)} each
        </p>

        {/* Quantity controls */}
        <div className="flex items-center gap-2 mt-auto">
          <div className="flex items-center gap-1 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-1">
            <button
              type="button"
              onClick={() => onUpdateQuantity(bookId, quantity - 1)}
              disabled={quantity <= 1 || isActing}
              aria-label="Decrease quantity"
              className="flex size-6 items-center justify-center rounded-full text-stone-500 hover:bg-white dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="size-3" />
            </button>
            <span className="min-w-[1.5rem] text-center text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-200">
              {isActing ? <Loader2 className="size-3 animate-spin inline" /> : quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(bookId, quantity + 1)}
              disabled={isActing}
              aria-label="Increase quantity"
              className="flex size-6 items-center justify-center rounded-full text-stone-500 hover:bg-white dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="size-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(bookId)}
            disabled={isActing}
            aria-label={`Remove ${title}`}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="size-3" />
            Remove
          </button>
        </div>
      </div>

      {/* Subtotal */}
      <div className="shrink-0 text-right flex flex-col items-end justify-between">
        <span className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 tabular-nums">
          {formatPrice(subtotal)}
        </span>
        {quantity > 1 && (
          <span className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
            {quantity} × {formatPrice(price)}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export function CartPage() {
  const navigate = useNavigate()
  const session = loadAuthSession()

  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionBookId, setActionBookId] = useState<number | null>(null)
  const [isClearingCart, setIsClearingCart] = useState(false)

  /* ── Load cart ── */
  useEffect(() => {
    if (!session?.accessToken) return
    let active = true
    async function run() {
      setIsLoading(true); setErrorMessage(null)
      try {
        const res = await fetchCart()
        if (active) setItems(res.data.items)
      } catch (e) {
        if (active) { setItems([]); setErrorMessage(e instanceof Error ? e.message : 'Unable to load cart.') }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void run()
    return () => { active = false }
  }, [session?.accessToken])

  const summary = useMemo(() => {
    const totalQuantity = items.reduce((sum, item) => sum + getItemQuantity(item), 0)
    const subtotal = items.reduce((sum, item) => sum + getItemSubtotal(item), 0)
    return { totalQuantity, subtotal }
  }, [items])

  /* ── Handlers ── */
  async function handleLogout() { await logout(); navigate('/', { replace: true }) }

  async function handleUpdateQuantity(bookId: number, quantity: number) {
    if (quantity < 1 || actionBookId === bookId) return
    setActionBookId(bookId); setErrorMessage(null)
    try { const res = await updateCartItemQuantity(bookId, quantity); setItems(res.data.items) }
    catch (e) { setErrorMessage(e instanceof Error ? e.message : 'Unable to update quantity.') }
    finally { setActionBookId(null) }
  }

  async function handleRemoveItem(bookId: number) {
    if (actionBookId === bookId) return
    setActionBookId(bookId); setErrorMessage(null)
    try { const res = await deleteCartItem(bookId); setItems(res.data.items) }
    catch (e) { setErrorMessage(e instanceof Error ? e.message : 'Unable to remove item.') }
    finally { setActionBookId(null) }
  }

  async function handleClearCart() {
    if (isClearingCart) return
    setIsClearingCart(true); setErrorMessage(null)
    try { const res = await clearCart(); setItems(res.data.items) }
    catch (e) { setErrorMessage(e instanceof Error ? e.message : 'Unable to clear cart.') }
    finally { setIsClearingCart(false) }
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
              className="relative flex size-9 items-center justify-center rounded-full text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
              <ShoppingCart className="size-4" />
              {items.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-100 text-[9px] font-bold text-white dark:text-stone-900">
                  {summary.totalQuantity}
                </span>
              )}
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
            <span className="text-stone-600 dark:text-stone-300">Cart</span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Page heading */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400 mb-2">
              Shopping bag
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
              Your cart
            </h1>
            {!isLoading && items.length > 0 && (
              <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                {summary.totalQuantity} item{summary.totalQuantity !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {!isLoading && items.length > 0 && (
            <button
              onClick={() => void handleClearCart()}
              disabled={isClearingCart}
              className="shrink-0 flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 px-3.5 py-2 text-xs font-medium text-stone-500 dark:text-stone-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {isClearingCart ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              {isClearingCart ? 'Clearing…' : 'Clear cart'}
            </button>
          )}
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="shrink-0 text-red-400 hover:text-red-600 transition-colors">
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* States */}
        {isLoading ? (
          <CartSkeleton />
        ) : items.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] items-start">

            {/* ── Item list ── */}
            <div className="space-y-2.5">
              {items.map((item) => {
                const bookId = getBookId(item)
                return (
                  <CartRow
                    key={`${bookId}-${getItemTitle(item)}`}
                    item={item}
                    isActing={actionBookId === bookId}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                  />
                )
              })}
            </div>

            {/* ── Order summary ── */}
            <div className="lg:sticky lg:top-24 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">

              {/* Header strip */}
              <div className="border-b border-stone-100 dark:border-stone-800 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">Order summary</p>
              </div>

              <div className="p-5 space-y-4">

                {/* Line items */}
                <div className="space-y-2.5 text-sm">
                  {items.map((item) => (
                    <div key={getBookId(item)} className="flex items-start justify-between gap-3">
                      <span className="text-stone-500 dark:text-stone-400 line-clamp-1 min-w-0 flex-1">
                        {getItemTitle(item)}
                        {getItemQuantity(item) > 1 && (
                          <span className="ml-1 text-stone-400 tabular-nums">×{getItemQuantity(item)}</span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-stone-700 dark:text-stone-300">
                        {formatPrice(getItemSubtotal(item))}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-stone-100 dark:border-stone-800 pt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500 dark:text-stone-400">Subtotal</span>
                    <span className="font-medium text-stone-700 dark:text-stone-300 tabular-nums">{formatPrice(summary.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500 dark:text-stone-400">Shipping</span>
                    <span className="text-stone-400 dark:text-stone-500 text-xs">
                      {summary.subtotal >= 50 ? 'Free' : 'Calculated at checkout'}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-stone-200 dark:border-stone-700 pt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">Total</span>
                  <span className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatPrice(summary.subtotal)}
                  </span>
                </div>

                {/* Free shipping nudge */}
                {summary.subtotal < 50 && (
                  <p className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                    Add {formatPrice(50 - summary.subtotal)} more for free shipping.
                  </p>
                )}

                {/* CTA */}
                <Link
                  to="/checkout"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 dark:bg-stone-100 px-5 py-3 text-sm font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
                >
                  Checkout <ArrowRight className="size-3.5" />
                </Link>

                <Link
                  to="/"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 px-5 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-8 py-24 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
              <ShoppingCart className="size-6 text-stone-400" />
            </div>
            <div>
              <p className="font-serif text-lg font-semibold text-stone-800 dark:text-stone-200">Your cart is empty</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 max-w-xs">
                Browse the catalog and add books you'd like to purchase.
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

export default CartPage