import { authenticatedApiRequest } from './auth'

export interface UserOrderSummary {
  id: number
  orderNumber: string
  status: string
  paymentMethod: string
  itemCount: number
  totalAmount: number
  createdAt: string
  updatedAt: string
}

export interface UserOrdersPageData {
  content: UserOrderSummary[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface UserOrderItem {
  bookId: number
  title: string
  slug: string
  unitPrice: number
  quantity: number
  lineTotal: number
  coverImageUrl: string
}

export interface UserOrderDetail {
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
  items: UserOrderItem[]
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

export async function fetchUserOrders(params: { page?: number; size?: number; status?: string; sortBy?: string; sortDirection?: string } = {}) {
  const searchParams = new URLSearchParams()

  if (params.page !== undefined) searchParams.set('page', String(params.page))
  if (params.size !== undefined) searchParams.set('size', String(params.size))
  if (params.status) searchParams.set('status', params.status)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortDirection) searchParams.set('sortDirection', params.sortDirection)

  const query = searchParams.toString()
  return authenticatedApiRequest<ApiEnvelope<UserOrdersPageData>>(`/users/orders${query ? `?${query}` : ''}`, {
    method: 'GET',
  })
}

export async function fetchUserOrderById(orderId: number) {
  return authenticatedApiRequest<ApiEnvelope<UserOrderDetail>>(`/users/orders/${orderId}`, {
    method: 'GET',
  })
}