import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, PackageCheck, ShoppingBag } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Skeleton } from '../../../components/ui/skeleton'
import { Textarea } from '../../../components/ui/textarea'
import { loadAuthSession } from '../../shared/auth'
import { fetchCart, type CartItem } from '../../shared/cart'
import { submitCheckoutOrder, type CheckoutOrder } from '../../shared/checkout'
import CustomerAccountMenu from '../components/CustomerAccountMenu'

const BOOK_COVER_PLACEHOLDER = '/img/bookstore-img.jpg'

function formatPrice(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function parseMoney(value: string | number | undefined, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function getShippingConfig() {
  const defaultFee = parseMoney(import.meta.env.VITE_SHIPPING_DEFAULT_FEE ?? import.meta.env.VITE_APP_SHIPPING_DEFAULT_FEE, 3)
  const freeThreshold = parseMoney(import.meta.env.VITE_SHIPPING_FREE_THRESHOLD ?? import.meta.env.VITE_APP_SHIPPING_FREE_THRESHOLD, 50)
  const rawLocationRates = String(
    import.meta.env.VITE_SHIPPING_LOCATION_RATES ?? import.meta.env.VITE_APP_SHIPPING_LOCATION_RATES ?? 'phnom penh|2.00;province|3.00'
  )

  const locationRates = rawLocationRates
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [matchText, feeText] = entry.split('|').map((part) => part.trim())

      return {
        matchText: normalizeText(matchText ?? ''),
        fee: parseMoney(feeText, defaultFee),
      }
    })
    .filter((entry) => entry.matchText.length > 0)

  return {
    defaultFee,
    freeThreshold,
    locationRates,
  }
}

function estimateShippingFee(subtotal: number, shippingAddress: string) {
  const { defaultFee, freeThreshold, locationRates } = getShippingConfig()

  if (subtotal >= freeThreshold) {
    return 0
  }

  const normalizedAddress = normalizeText(shippingAddress)
  const matchedLocationRate = locationRates.find((rate) => normalizedAddress.includes(rate.matchText))

  return matchedLocationRate?.fee ?? defaultFee
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

function getItemTitle(item: CartItem) {
  return item.book?.title ?? item.title ?? 'Untitled book'
}

function getItemQuantity(item: CartItem) {
  return item.quantity ?? 1
}

function getItemSubtotal(item: CartItem) {
  return item.lineTotal ?? (item.unitPrice ?? item.book?.price ?? 0) * getItemQuantity(item)
}

type GeoPoint = {
  lat: number
  lng: number
}

type WorldLocation = {
  label: string
  address: string
  description: string
  lat: number
  lng: number
}

const WORLD_BOUNDS = {
  west: -180,
  east: 180,
  north: 85,
  south: -60,
}

const WORLD_LOCATIONS: WorldLocation[] = [
  { label: 'London', address: 'London, United Kingdom', description: 'Europe hub', lat: 51.5074, lng: -0.1278 },
  { label: 'New York', address: 'New York, United States', description: 'North America hub', lat: 40.7128, lng: -74.006 },
  { label: 'São Paulo', address: 'São Paulo, Brazil', description: 'South America hub', lat: -23.5505, lng: -46.6333 },
  { label: 'Cairo', address: 'Cairo, Egypt', description: 'Africa hub', lat: 30.0444, lng: 31.2357 },
  { label: 'Singapore', address: 'Singapore', description: 'Asia-Pacific hub', lat: 1.3521, lng: 103.8198 },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function geolocationToMapPoint(point: GeoPoint) {
  const x = ((point.lng - WORLD_BOUNDS.west) / (WORLD_BOUNDS.east - WORLD_BOUNDS.west)) * 260
  const y = ((WORLD_BOUNDS.north - point.lat) / (WORLD_BOUNDS.north - WORLD_BOUNDS.south)) * 240

  return {
    x: clamp(x, 12, 248),
    y: clamp(y, 12, 228),
  }
}

function mapPointToGeolocation(x: number, y: number): GeoPoint {
  const lng = WORLD_BOUNDS.west + (x / 260) * (WORLD_BOUNDS.east - WORLD_BOUNDS.west)
  const lat = WORLD_BOUNDS.north - (y / 240) * (WORLD_BOUNDS.north - WORLD_BOUNDS.south)

  return { lat, lng }
}

function findNearestLocation(point: GeoPoint) {
  return WORLD_LOCATIONS.reduce(
    (nearest, location) => {
      const distance = (location.lat - point.lat) ** 2 + (location.lng - point.lng) ** 2

      if (distance < nearest.distance) {
        return { location, distance }
      }

      return nearest
    },
    { location: WORLD_LOCATIONS[0], distance: Number.POSITIVE_INFINITY }
  ).location
}

function formatPinnedAddress(point: GeoPoint) {
  const nearest = findNearestLocation(point)
  return `${nearest.address} · ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
}

async function reverseGeocodeAddress(point: GeoPoint) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(point.lat))
  url.searchParams.set('lon', String(point.lng))
  url.searchParams.set('zoom', '18')
  url.searchParams.set('addressdetails', '1')

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Unable to resolve the selected address.')
  }

  const payload = (await response.json()) as {
    display_name?: string
    address?: {
      house_number?: string
      road?: string
      neighbourhood?: string
      suburb?: string
      town?: string
      city?: string
      province?: string
      state?: string
      country?: string
    }
  }

  const addressParts = [
    payload.address?.house_number,
    payload.address?.road,
    payload.address?.neighbourhood,
    payload.address?.suburb,
    payload.address?.town,
    payload.address?.city,
    payload.address?.province ?? payload.address?.state,
    payload.address?.country,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0))

  return payload.display_name ?? addressParts.join(', ')
}

function GoogleMapPicker({
  selectedPoint,
  livePoint,
  shippingAddress,
  isDetectingLocation,
  locationMessage,
  onPickPoint,
  onUseCurrentLocation,
}: {
  selectedPoint: GeoPoint | null
  livePoint: GeoPoint | null
  shippingAddress: string
  isDetectingLocation: boolean
  locationMessage: string | null
  onPickPoint: (point: GeoPoint) => void
  onUseCurrentLocation: () => void
}) {
  const selectedLocation = selectedPoint ? findNearestLocation(selectedPoint) : null
  const selectedMarker = selectedPoint ? geolocationToMapPoint(selectedPoint) : null
  const liveMarker = livePoint ? geolocationToMapPoint(livePoint) : null

  function handleMapPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 260
    const y = ((event.clientY - bounds.top) / bounds.height) * 240

    onPickPoint(mapPointToGeolocation(x, y))
  }

  const mapCenter = selectedPoint ?? livePoint ?? { lat: 20.5937, lng: 78.9629 }
  const mapZoom = selectedPoint ? 15 : livePoint ? 12 : 4
  const mapUrl = `https://www.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}&z=${mapZoom}&output=embed`

  return (
    <Card className="rounded-[1.8rem] border-zinc-200/80 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Shipping map</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight">Use live location, then pin your delivery point on Google Maps</h3>
          </div>
          <Badge variant="secondary" className="border border-zinc-200/80 bg-white text-[10px] uppercase tracking-[0.18em] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            Google Maps
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-zinc-300 dark:border-zinc-700"
            onClick={onUseCurrentLocation}
            disabled={isDetectingLocation}
          >
            {isDetectingLocation ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShoppingBag className="mr-2 size-4" />}
            {isDetectingLocation ? 'Detecting location...' : 'Use my current location'}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-100 shadow-inner dark:border-zinc-800 dark:bg-zinc-950">
            <iframe
              title="Google Maps shipping map"
              src={mapUrl}
              className="h-72 w-full rounded-[1.5rem] opacity-95"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div
              className="absolute inset-0 cursor-crosshair"
              onPointerDown={handleMapPointerDown}
              role="presentation"
              aria-hidden="true"
            />

            {liveMarker ? (
              <div
                className="pointer-events-none absolute z-10"
                style={{ left: `${(liveMarker.x / 260) * 100}%`, top: `${(liveMarker.y / 240) * 100}%`, transform: 'translate(-50%, -100%)' }}
              >
                <div className="relative">
                  <div className="size-5 rounded-full border-2 border-white bg-sky-500 shadow-[0_0_0_8px_rgba(56,189,248,0.18)] dark:border-zinc-900" />
                  <div className="absolute left-1/2 top-[84%] h-3 w-3 -translate-x-1/2 rotate-45 rounded-[3px] bg-sky-500 shadow-[0_8px_14px_rgba(56,189,248,0.18)]" />
                </div>
              </div>
            ) : null}

            {selectedMarker ? (
              <div
                className="pointer-events-none absolute z-20"
                style={{ left: `${(selectedMarker.x / 260) * 100}%`, top: `${(selectedMarker.y / 240) * 100}%`, transform: 'translate(-50%, -100%)' }}
              >
                <div className="relative">
                  <div className="size-8 rounded-full border-2 border-white bg-rose-500 shadow-[0_10px_24px_rgba(225,29,72,0.30)] dark:border-zinc-900" />
                  <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-zinc-900" />
                  <div className="absolute left-1/2 top-[84%] h-4 w-4 -translate-x-1/2 rotate-45 rounded-[4px] bg-rose-500 shadow-[0_10px_24px_rgba(225,29,72,0.30)]" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Selected destination</p>
            {selectedLocation ? (
              <>
                <div>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{selectedLocation.label}</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{selectedLocation.description}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                  {shippingAddress || selectedLocation.address}
                </div>
              </>
            ) : (
              <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                <p>Use your live location to seed Google Maps, then click anywhere on the map to pin the final shipping point.</p>
                <p>The shipping address will update automatically.</p>
              </div>
            )}

            {locationMessage ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {locationMessage}
              </div>
            ) : null}

            {livePoint ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                Live location captured: {livePoint.lat.toFixed(5)}, {livePoint.lng.toFixed(5)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <Skeleton className="h-12 w-40 rounded-full" />
        <Skeleton className="h-80 rounded-[1.8rem]" />
        <Skeleton className="h-32 rounded-[1.8rem]" />
      </div>
      <Skeleton className="h-[34rem] rounded-[1.8rem]" />
    </div>
  )
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const session = loadAuthSession()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [order, setOrder] = useState<CheckoutOrder | null>(null)
  const [customerEmail, setCustomerEmail] = useState(session?.user.email ?? '')
  const [recipientName, setRecipientName] = useState(session?.user.fullName ?? '')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery')
  const [note, setNote] = useState('')
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null)
  const [livePoint, setLivePoint] = useState<GeoPoint | null>(null)

  useEffect(() => {
    if (!session?.accessToken) {
      return
    }

    let active = true

    async function loadCart() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetchCart()

        if (!active) {
          return
        }

        setCartItems(response.data.items)
      } catch (error) {
        if (!active) {
          return
        }

        setCartItems([])
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load checkout items.')
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadCart()

    return () => {
      active = false
    }
  }, [session?.accessToken])

  async function refreshCart() {
    const response = await fetchCart()
    setCartItems(response.data.items)
  }

  useEffect(() => {
    setCustomerEmail(session?.user.email ?? '')
    setRecipientName(session?.user.fullName ?? '')
  }, [session?.user.email, session?.user.fullName])

  async function handlePinLocation(point: GeoPoint) {
    const nearestLocation = findNearestLocation(point)

    setSelectedPoint(point)
    setLocationMessage(`Pinned near ${nearestLocation.label}. Resolving real address...`)
    setErrorMessage(null)

    try {
      const realAddress = await reverseGeocodeAddress(point)
      setShippingAddress(realAddress)
      setLocationMessage(`Address resolved near ${nearestLocation.label}: ${realAddress}`)
      await refreshCart()
      return realAddress
    } catch (error) {
      const fallbackAddress = formatPinnedAddress(point)
      setShippingAddress(fallbackAddress)
      setLocationMessage(`Could not resolve a street address, so a fallback location was used.`)
      setErrorMessage(error instanceof Error ? error.message : 'Unable to refresh cart review.')
      return fallbackAddress
    }
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported in this browser.')
      return
    }

    setIsDetectingLocation(true)
    setLocationMessage(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }

      setLivePoint(point)
      const resolvedAddress = await handlePinLocation(point)
      setLocationMessage(`Live location captured near ${findNearestLocation(point).label}: ${resolvedAddress}. You can adjust the pin on the map.`)
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'Unable to access live location.')
    } finally {
      setIsDetectingLocation(false)
    }
  }

  const summary = useMemo(() => {
    const itemCount = cartItems.reduce((sum, item) => sum + getItemQuantity(item), 0)
    const subtotal = cartItems.reduce((sum, item) => sum + getItemSubtotal(item), 0)
    const shippingFee = estimateShippingFee(subtotal, shippingAddress)

    return {
      itemCount,
      subtotal,
      shippingFee,
      totalAmount: subtotal + shippingFee,
    }
  }, [cartItems, shippingAddress])

  async function handleSubmitCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting || !session?.accessToken) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await submitCheckoutOrder({
        customerEmail: customerEmail.trim(),
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
        note: note.trim(),
      })

      setOrder(response.data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to place checkout order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    const { logout: performLogout } = await import('../../shared/auth')
    await performLogout()
    navigate('/', { replace: true })
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/login" />
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#fffdf8_0%,#ffffff_35%,#f7f5ef_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#09090b_0%,#111827_40%,#020617_100%)] dark:text-zinc-100">
        <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/75">
          <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link to="/cart" className="flex items-center gap-3">
              <ArrowLeft className="size-4" />
              Back to cart
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <CheckoutSkeleton />
        </div>
      </main>
    )
  }

  if (order) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#fffdf8_0%,#ffffff_35%,#f7f5ef_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#09090b_0%,#111827_40%,#020617_100%)] dark:text-zinc-100">
        <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/75">
          <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-white">
                <BookOpen className="size-4 text-white dark:text-zinc-900" />
              </div>
              <span className="hidden text-sm font-semibold tracking-tight sm:block">Bookstore</span>
            </Link>
            <CustomerAccountMenu onLogout={() => void handleLogout()} />
          </div>
        </header>

        <div className="mx-auto grid max-w-screen-xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-12">
          <Card className="rounded-[1.8rem] border-zinc-200/80 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="space-y-4">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="size-6" />
              </div>
              <Badge variant="secondary" className="w-fit border border-zinc-200/80 bg-white/90 text-[10px] uppercase tracking-[0.22em] text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                Order confirmed
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight">Your order is placed</h1>
              <p className="max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Order {order.orderNumber} was submitted successfully. You can review the receipt and details below.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Total amount</p>
                  <p className="mt-2 text-2xl font-semibold">{formatPrice(order.totalAmount)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Payment</p>
                  <p className="mt-2 text-lg font-semibold">{order.paymentMethod}</p>
                </div>
              </div>
              <Button asChild className="rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                <Link to="/">Continue shopping</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-zinc-300 dark:border-zinc-700">
                <Link to="/orders">View my orders</Link>
              </Button>
            </div>
          </Card>

          <Card className="rounded-[1.8rem] border-zinc-200/80 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Receipt</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Order summary</h2>
              </div>

              <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                <div className="flex items-center justify-between">
                  <span>Items</span>
                  <span>{order.itemCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shippingFee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                  <span>Total</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={`${item.bookId}-${item.slug}`} className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="size-14 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <img src={resolveCoverImageSrc(item.coverImageUrl)} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatPrice(item.lineTotal)}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  const itemCount = summary.itemCount

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#fffdf8_0%,#ffffff_35%,#f7f5ef_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#09090b_0%,#111827_40%,#020617_100%)] dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/75">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="rounded-full px-3">
            <Link to="/cart">
              <ArrowLeft className="mr-2 size-4" />
              Back to cart
            </Link>
          </Button>

          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-zinc-900 shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:bg-white">
              <ShoppingBag className="size-4 text-white dark:text-zinc-900" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">Checkout</span>
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
            Secure checkout
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Complete your order</h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Fill in shipping details and place your order against the live cart.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="rounded-[1.8rem] border-zinc-200/80 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
              <form className="space-y-6" onSubmit={(event) => void handleSubmitCheckout(event)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Customer email</label>
                  <Input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Recipient name</label>
                  <Input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} required />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Recipient phone</label>
                  <Input value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} placeholder="(+855) 000 000 000" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Payment method</label>
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  >
                    <option value="Cash on Delivery">Cash on Delivery</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Shipping address</label>
                <Input value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} required />
              </div>

              <GoogleMapPicker
                selectedPoint={selectedPoint}
                livePoint={livePoint}
                shippingAddress={shippingAddress}
                isDetectingLocation={isDetectingLocation}
                locationMessage={locationMessage}
                onPickPoint={(point) => void handlePinLocation(point)}
                onUseCurrentLocation={() => void handleUseCurrentLocation()}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Note</label>
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Delivery instructions, preferred time, or anything useful." />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200" disabled={isSubmitting || itemCount === 0}>
                  {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <PackageCheck className="mr-2 size-4" />}
                  {isSubmitting ? 'Placing order...' : 'Place order'}
                </Button>
                <Button asChild variant="outline" className="rounded-full border-zinc-300 dark:border-zinc-700">
                  <Link to="/cart">Back to cart</Link>
                </Button>
              </div>
              </form>
            </Card>
          </div>

          <Card className="h-fit rounded-[1.8rem] border-zinc-200/80 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Order summary</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">Cart review</h2>
              </div>

              <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                <div className="flex items-center justify-between">
                  <span>Items</span>
                  <span>{summary.itemCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping address</span>
                  <span className="max-w-[12rem] truncate text-right">{shippingAddress || 'Select a map pin'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(summary.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span>{formatPrice(summary.shippingFee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                  <span>Total</span>
                  <span>{formatPrice(summary.totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={`${item.book?.id ?? item.bookId}-${getItemTitle(item)}`} className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="size-14 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <img src={resolveCoverImageSrc(item.coverImageUrl ?? item.book?.coverImageUrl)} alt={getItemTitle(item)} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{getItemTitle(item)}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Qty {getItemQuantity(item)}</p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatPrice(getItemSubtotal(item))}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
}

export default CheckoutPage