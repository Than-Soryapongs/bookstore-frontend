import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, PackageSearch, ShoppingBag } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { loadAuthSession } from '../../shared/auth'
import { fetchUserOrders, type UserOrderSummary } from '../../shared/orders'
import CustomerAccountMenu from '../components/CustomerAccountMenu'

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

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-[1.5rem] border border-zinc-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function OrdersPage() {
  const navigate = useNavigate()
  const session = loadAuthSession()
  const [orders, setOrders] = useState<UserOrderSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    let active = true

    async function loadOrders() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetchUserOrders({ page: 0, size: 20, sortBy: 'createdAt', sortDirection: 'desc' })

        if (!active) {
          return
        }

        setOrders(response.data.content)
      } catch (error) {
        if (!active) {
          return
        }

        setOrders([])
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load orders.')
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadOrders()

    return () => {
      active = false
    }
  }, [session?.accessToken])

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
            <Link to="/">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>

          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-zinc-900 shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:bg-white">
              <ShoppingBag className="size-4 text-white dark:text-zinc-900" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">Orders</span>
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
        <div className="mb-8 space-y-3">
          <Badge variant="secondary" className="w-fit border border-zinc-200/80 bg-white/90 text-[10px] uppercase tracking-[0.22em] text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Purchase history
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your orders</h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Review past checkout orders and open any order to see shipping, items, and totals.
          </p>
        </div>

        {isLoading ? (
          <OrdersSkeleton />
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {errorMessage}
          </div>
        ) : orders.length > 0 ? (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="rounded-[1.5rem] border-zinc-200/80 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{order.orderNumber}</h2>
                      <Badge className={`text-[10px] uppercase tracking-[0.18em] ${getOrderStatusBadgeClassName(order.status)}`}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {order.paymentMethod} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Total</p>
                      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatPrice(order.totalAmount)}</p>
                    </div>
                    <Button asChild className="rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                      <Link to={`/orders/${order.id}`}>
                        View order
                        <ExternalLink className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-zinc-300 bg-white/70 px-6 py-20 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-950/40">
            <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100 shadow-sm dark:bg-zinc-800">
              <PackageSearch className="size-6 text-zinc-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">No orders yet</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Place a checkout order to see it in your history.</p>
            </div>
            <Button asChild className="rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
              <Link to="/cart">Go to cart</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

export default OrdersPage