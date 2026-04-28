import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, PackageSearch, ShoppingBag } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { loadAuthSession } from '../../shared/auth'
import { fetchUserOrderById, type UserOrderDetail } from '../../shared/orders'
import CustomerAccountMenu from '../components/CustomerAccountMenu'

const BOOK_COVER_PLACEHOLDER = '/img/bookstore-img.jpg'

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
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function getOrderStatusBadgeClassName(status: string) {
  const normalizedStatus = status.trim().toLowerCase()

  if (normalizedStatus.includes('cancel')) {
    return 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300'
  }

  if (normalizedStatus.includes('ship') || normalizedStatus.includes('deliver') || normalizedStatus.includes('complete')) {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
  }

  if (normalizedStatus.includes('pending') || normalizedStatus.includes('process')) {
    return 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
  }

  return 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300'
}

function resolveCoverImageSrc(coverImageUrl?: string | null) {
  if (!coverImageUrl || coverImageUrl.trim().length === 0) {
    return BOOK_COVER_PLACEHOLDER
  }

  if (/^https?:\/\//i.test(coverImageUrl)) {
    return coverImageUrl
  }

  if (coverImageUrl.startsWith('/')) {
    return coverImageUrl
  }

  return `/${coverImageUrl}`
}

function OrderDetailsSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Skeleton className="h-[28rem] rounded-[1.8rem]" />
      <Skeleton className="h-[28rem] rounded-[1.8rem]" />
    </div>
  )
}

export function OrderDetailsPage() {
  const navigate = useNavigate()
  const params = useParams<{ orderId: string }>()
  const session = loadAuthSession()
  const orderId = Number(params.orderId)

  const [order, setOrder] = useState<UserOrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.accessToken || !Number.isFinite(orderId) || orderId <= 0) {
      setIsLoading(false)
      setErrorMessage('Invalid order id.')
      return
    }

    let active = true

    async function loadOrder() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetchUserOrderById(orderId)

        if (!active) {
          return
        }

        setOrder(response.data)
      } catch (error) {
        if (!active) {
          return
        }

        setOrder(null)
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load order details.')
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadOrder()

    return () => {
      active = false
    }
  }, [orderId, session?.accessToken])

  async function handleLogout() {
    const { logout: performLogout } = await import('../../shared/auth')
    await performLogout()
    navigate('/', { replace: true })
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/login" />
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#fffdf8_0%,#ffffff_35%,#f7f5ef_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#09090b_0%,#111827_40%,#020617_100%)] dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/75">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="rounded-full px-3">
            <Link to="/orders">
              <ArrowLeft className="mr-2 size-4" />
              Back to orders
            </Link>
          </Button>

          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-zinc-900 shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:bg-white">
              <ShoppingBag className="size-4 text-white dark:text-zinc-900" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">Order details</span>
          </Link>

          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="relative size-9 rounded-full">
              <Link to="/cart" aria-label="Open cart">
                <ShoppingBag className="size-4" />
              </Link>
            </Button>
            <CustomerAccountMenu onLogout={() => void handleLogout()} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        {isLoading ? (
          <OrderDetailsSkeleton />
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Order not available</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : order ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[1.8rem] border-zinc-200/80 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
              <div className="space-y-4">
                <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="size-6" />
                </div>
                <Badge className={`w-fit text-[10px] uppercase tracking-[0.22em] ${getOrderStatusBadgeClassName(order.status)}`}>
                  Order detail
                </Badge>
                <h1 className="text-3xl font-bold tracking-tight">{order.orderNumber}</h1>
                <p className="max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  <span className={`mr-2 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getOrderStatusBadgeClassName(order.status)}`}>
                    {order.status}
                  </span>
                  {order.paymentMethod} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Total amount</p>
                    <p className="mt-2 text-2xl font-semibold">{formatPrice(order.totalAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Placed</p>
                    <p className="mt-2 text-lg font-semibold">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-[1.8rem] border-zinc-200/80 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Shipping & receipt</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Order information</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Recipient</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{order.recipientName}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{order.recipientPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Shipping address</p>
                    <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{order.shippingAddress}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping fee</span>
                    <span>{formatPrice(order.shippingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                    <span>Total</span>
                    <span>{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>

                {order.note ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Note</p>
                    <p className="mt-2">{order.note}</p>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="rounded-[1.8rem] border-zinc-200/80 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900 xl:col-span-2">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Items</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Books in this order</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {order.items.map((item) => (
                    <div key={`${item.bookId}-${item.slug}`} className="flex gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="size-16 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                        <img src={resolveCoverImageSrc(item.coverImageUrl)} alt={item.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Qty {item.quantity}</p>
                        <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatPrice(item.lineTotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-zinc-300 bg-white/70 px-6 py-20 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-950/40">
            <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100 shadow-sm dark:bg-zinc-800">
              <PackageSearch className="size-6 text-zinc-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">Order not found</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">The order may not exist or you may not have access to it.</p>
            </div>
            <Button asChild className="rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
              <Link to="/orders">Back to orders</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

export default OrderDetailsPage