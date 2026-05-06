import { authenticatedApiRequest } from './auth'

export interface KhqrPaymentResponse {
  receiverName: string
  orderId: number
  orderNumber: string
  qr: string
  md5: string
  currency: string
  amount: number
  expiresAt: number
  shortLink: string | null
}

export interface ApiEnvelope<T> {
  timestamp: string
  status: number
  message: string
  data: T
  path: string
}

export async function generateKhqrPayment(orderId: number) {
  return authenticatedApiRequest<ApiEnvelope<KhqrPaymentResponse>>(
    `/users/orders/${orderId}/khqr`,
    { method: 'POST' }
  )
}

export async function cancelOrder(orderId: number) {
  return authenticatedApiRequest<ApiEnvelope<null>>(
    `/users/orders/${orderId}/cancel`,
    { method: 'PATCH' }
  )
}

export async function checkKhqrStatus(orderId: number, md5: string) {
  return authenticatedApiRequest<ApiEnvelope<boolean>>(
    `/users/orders/${orderId}/khqr/status`,
    {
      method: 'POST',
      body: { md5 },   // ← was: GET with ?md5= query param
    }
  )
}