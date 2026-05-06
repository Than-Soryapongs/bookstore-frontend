import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react'
import QRCode from 'qrcode'

import { Button } from '../../../components/ui/button'
import {
  generateKhqrPayment,
  cancelOrder,
  checkKhqrStatus,
  type KhqrPaymentResponse,
} from '../../shared/khqr'

const khqr_logo_img = '/img/KHQR Logo.png'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(value)
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { phase: 'loading' }
  | { phase: 'ready'; khqr: KhqrPaymentResponse; qrDataUrl: string }
  | { phase: 'cancelling' }
  | { phase: 'expired'; orderNumber: string }
  | { phase: 'paid' }
  | { phase: 'error'; message: string }

// ── KHQR Card ─────────────────────────────────────────────────────────────────

interface KhqrCardProps {
  receiverName: string
  amount: number
  currency: string
  qrDataUrl: string
  remainingMs: number
  shortLink?: string
  onCancel: () => void
}

function KhqrCard({
  receiverName,
  amount,
  currency,
  qrDataUrl,
  remainingMs,
  shortLink,
  onCancel,
}: KhqrCardProps) {
  const countdownColor =
    remainingMs < 30_000
      ? '#E1232E'
      : remainingMs < 60_000
      ? '#f59e0b'
      : '#f59e0b'

  // --- Strict Dimension Rules (20:29 Ratio) ---
  const cardW = 340
  const cardH = cardW * (29 / 20) // 493px
  
  // Margins & Heights relative to Card Height
  const headerH = cardH * 0.12         // ~59px
  const tailH = 30                   // Refined: Shorter tail height
  const tailW = 32                   // Refined: Wider tail base
  const sideMargin = cardH * 0.10      // ~49px
  const tbMargin = cardH * 0.08        // ~39px
  
  // Typography
  const receiverFs = 15 
  const amountFs = 32
  
  // Symbols
  const isUSD = currency === 'USD'
  const currencySymbol = isUSD ? '$' : '៛'
  const displayAmount = formatAmount(amount, currency)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        fontFamily: '"Nunito Sans", sans-serif',
      }}
    >
      {/* ── KHQR Card ── */}
      <div
        style={{
          width: cardW,
          height: cardH,
          borderRadius: 16,
          background: '#FFFFFF',
          boxShadow: '0 0 16px rgba(0, 0, 0, 0.10)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header - Speech Bubble Shape */}
        <div
            style={{
                flexShrink: 0,
                height: headerH + tailH,
                background: '#E1232E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                clipPath: `polygon(0 0, 100% 0, 100% 100%, calc(100% - ${tailW}px) calc(100% - ${tailH}px), 0 calc(100% - ${tailH}px))`,
                marginBottom: -tailH, 
                paddingBottom: tailH, 
                boxSizing: 'border-box',
                zIndex: 10,
            }}
        >
        <img
            src={khqr_logo_img}
            alt="KHQR Logo"
            style={{ height: headerH * 0.4, width: 'auto', display: 'block' }}
        />
        </div>

        {/* Text Area */}
        <div 
          style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            padding: `0 ${sideMargin}px`
          }}
        >
          <div
            style={{
              fontSize: receiverFs,
              color: '#000000',
              fontWeight: 500,
              lineHeight: 'normal',
              marginBottom: 4,
            }}
          >
            {receiverName}
          </div>
          <div
            style={{
              fontSize: amountFs,
              fontWeight: 700,
              color: '#000000',
              lineHeight: 'normal',
              display: 'flex',
              alignItems: 'baseline',
              gap: 4
            }}
          >
            <span style={{ 
                fontFamily: isUSD ? '"Roboto", sans-serif' : 'inherit', 
                fontWeight: 900,
                fontSize: isUSD ? amountFs * 0.95 : 'inherit',
                letterSpacing: isUSD ? '-0.02em' : 'normal'
            }}>
                {currencySymbol}
            </span>
            <span>{displayAmount}</span>
          </div>
        </div>

        {/* Wide Dashed Divider */}
        <div
          style={{
            width: '100%',
            height: 1,
            backgroundImage: 'repeating-linear-gradient(to right, #9ca3af 0, #9ca3af 8px, transparent 8px, transparent 16px)'
          }}
        />

        {/* QR Code Area */}
        <div
          style={{
            padding: `${tbMargin}px ${sideMargin}px`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
            <img
              src={qrDataUrl}
              alt="KHQR payment code"
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
            {/* Center Logo Overlay with Roboto symbol */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#000000',
                border: '3px solid #FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <span
                style={{
                  color: '#FFFFFF',
                  fontSize: 20,
                  fontWeight: 900,
                  fontFamily: isUSD ? '"Roboto", sans-serif' : 'inherit',
                  lineHeight: 1,
                }}
              >
                {currencySymbol}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Below-card elements ── */}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            fontFamily: '"Nunito Sans", sans-serif',
            fontSize: 24,
            fontWeight: 800,
            color: countdownColor,
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}
        >
          {formatCountdown(remainingMs)}
        </span>
        <span style={{ fontSize: 12, color: '#9ca3af', fontFamily: '"Nunito Sans", sans-serif' }}>
          Session expires automatically when the timer ends
        </span>
      </div>

      {shortLink && (
        <a
          href={shortLink}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#555',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            fontFamily: '"Nunito Sans", sans-serif'
          }}
        >
          Open in Bakong app
        </a>
      )}

      <button
        type="button"
        onClick={onCancel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: '#9ca3af',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          fontFamily: '"Nunito Sans", sans-serif'
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = '#E1232E'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'
        }}
      >
        <XCircle size={15} />
        Cancel order
      </button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface KhqrPaymentModalProps {
  orderId: number
  orderNumber: string
  onClose: () => void
  onPaid: () => void
  onGoToCart: () => void
  onViewOrders: () => void
}

export function KhqrPaymentModal({
  orderId,
  orderNumber,
  onClose,
  onPaid,
  onGoToCart,
  onViewOrders,
}: KhqrPaymentModalProps) {
  const [state, setState] = useState<ModalState>({ phase: 'loading' })
  const [remainingMs, setRemainingMs] = useState(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const clearAllTimers = useCallback(() => {
    clearCountdown()
    clearPolling()
  }, [clearCountdown, clearPolling])

  const startCountdown = useCallback(
    (expiresAt: number, currentOrderNumber: string) => {
      countdownRef.current = setInterval(() => {
        const remaining = expiresAt - Date.now()
        setRemainingMs(remaining)

        if (remaining <= 0) {
          clearCountdown()
          clearPolling()
          setState((prev) =>
            prev.phase === 'ready'
              ? { phase: 'expired', orderNumber: currentOrderNumber }
              : prev
          )
        }
      }, 500)
    },
    [clearCountdown, clearPolling]
  )

  const startPolling = useCallback(
    (md5: string, expiresAt: number) => {
      pollRef.current = setInterval(async () => {
        if (Date.now() >= expiresAt) {
          clearPolling()
          return
        }

        try {
          const response = await checkKhqrStatus(orderId, md5)
          if (response.data === true) {
            clearAllTimers()
            setState({ phase: 'paid' })
            setTimeout(() => onPaid(), 2000)
          }
        } catch {
          // ignore transient network errors
        }
      }, 5000)
    },
    [orderId, clearPolling, clearAllTimers, onPaid]
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      setState({ phase: 'loading' })
      clearAllTimers()

      try {
        const response = await generateKhqrPayment(orderId)
        const khqr = response.data

        if (cancelled) return

        const cardW = 340
        const cardH = cardW * (29 / 20)
        const sideMargin = cardH * 0.10
        const dynamicQrSize = Math.floor(cardW - (sideMargin * 2))

        const qrDataUrl = await QRCode.toDataURL(khqr.qr, {
          width: dynamicQrSize,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' }, 
          errorCorrectionLevel: 'H',
        })

        if (cancelled) return

        setRemainingMs(khqr.expiresAt - Date.now())
        setState({ phase: 'ready', khqr, qrDataUrl })
        startCountdown(khqr.expiresAt, khqr.orderNumber)
        startPolling(khqr.md5, khqr.expiresAt)
      } catch (error) {
        if (cancelled) return
        setState({
          phase: 'error',
          message:
            error instanceof Error ? error.message : 'Failed to generate KHQR code.',
        })
      }
    }

    void run()

    return () => {
      cancelled = true
      clearAllTimers()
    }
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancelOrder() {
    clearAllTimers()
    setState({ phase: 'cancelling' })
    try {
      await cancelOrder(orderId)
    } catch {
      // Treat as locally cancelled
    }
    setState({ phase: 'expired', orderNumber })
  }

  const isTerminal = state.phase === 'expired' || state.phase === 'paid'

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !isTerminal) onClose()
  }

  const isCardPhase =
    state.phase === 'ready' ||
    state.phase === 'loading' ||
    state.phase === 'cancelling'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        style={{ maxWidth: isCardPhase ? 420 : 384 }}
        className="relative w-full rounded-[2rem] border border-zinc-200/80 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.22)] dark:border-zinc-800 dark:bg-zinc-900"
      >
        {!isTerminal && state.phase !== 'cancelling' && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="size-4" />
          </button>
        )}

        <div className="p-6 flex justify-center">
          {state.phase === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-10 w-full">
              <Loader2 className="size-10 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-500">Generating QR code…</p>
            </div>
          )}

          {state.phase === 'ready' && (
            <KhqrCard
              receiverName={state.khqr.receiverName ?? 'Receiver'}
              amount={state.khqr.amount}
              currency={state.khqr.currency ?? 'USD'}
              qrDataUrl={state.qrDataUrl}
              remainingMs={remainingMs}
              shortLink={state.khqr.shortLink}
              onCancel={() => void handleCancelOrder()}
            />
          )}

          {state.phase === 'cancelling' && (
            <div className="flex flex-col items-center gap-4 py-10 w-full">
              <Loader2 className="size-10 animate-spin text-zinc-400" />
              <p className="text-sm text-zinc-500">Cancelling order…</p>
            </div>
          )}

          {state.phase === 'expired' && (
            <div className="flex flex-col items-center gap-4 pb-2 w-full">
              <div className="flex size-14 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40">
                <AlertCircle className="size-7 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  QR code expired
                </p>
                <p className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                  This order has been cancelled.<br />Please place a new order to try again.
                </p>
              </div>
              <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                Order {state.orderNumber} · Cancelled
              </div>
              <div className="flex w-full flex-col gap-2">
                <Button className="w-full rounded-full bg-zinc-900 text-white" onClick={onGoToCart}>
                  Place new order
                </Button>
                <Button variant="outline" className="w-full rounded-full border-zinc-300" onClick={onViewOrders}>
                  View my orders
                </Button>
              </div>
            </div>
          )}

          {state.phase === 'paid' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center w-full">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Payment confirmed!
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Redirecting to your order…
              </p>
            </div>
          )}

          {state.phase === 'error' && (
            <div className="flex flex-col items-center gap-4 pb-2 w-full">
              <div className="flex size-14 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40">
                <AlertCircle className="size-7 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Something went wrong
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {state.message}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <Button variant="outline" className="w-full rounded-full border-zinc-300" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default KhqrPaymentModal