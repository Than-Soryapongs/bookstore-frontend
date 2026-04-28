import { authenticatedApiRequest } from './auth'

export interface CheckoutRequest {
  customerEmail: string
  recipientName: string
  recipientPhone: string
  shippingAddress: string
  paymentMethod: string
  note?: string
}

export interface CheckoutOrderItem {
  bookId: number
  title: string
  slug: string
  unitPrice: number
  quantity: number
  lineTotal: number
  coverImageUrl: string
}

export interface CheckoutOrder {
  id: number
  orderNumber: string
  status: string
  paymentMethod: string
  recipientName: string
  recipientPhone: string
  shippingAddress: string
  note?: string
  itemCount: number
  subtotal: number
  shippingFee: number
  totalAmount: number
  items: CheckoutOrderItem[]
  createdAt: string
  updatedAt: string
}

export interface ApiEnvelope<T> {
  timestamp: string
  status: number
  message: string
  data: T
  path: string
}

export async function submitCheckoutOrder(input: CheckoutRequest) {
  return authenticatedApiRequest<ApiEnvelope<CheckoutOrder>>('/users/orders/checkout', {
    method: 'POST',
    body: input,
  })
}