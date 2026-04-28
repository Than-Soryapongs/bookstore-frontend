import { authenticatedApiRequest } from '../../shared/auth'

export interface AdminOrder {
  id: number
  orderNumber: string
  status: string
  paymentMethod: string
  recipientName?: string
  recipientPhone?: string
  shippingAddress?: string
  note?: string
  itemCount: number
  subtotal?: number
  shippingFee?: number
  totalAmount: number
  items?: AdminOrderItem[]
  createdAt: string
  updatedAt: string
}

export interface AdminOrderItem {
  bookId: number
  title: string
  slug: string
  unitPrice: number
  quantity: number
  lineTotal: number
  coverImageUrl: string
}

export interface ApiEnvelope<T> {
  timestamp: string
  status: number
  message: string
  data: T
  path: string
}

export interface PaginatedOrdersResponse {
  content: AdminOrder[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface FetchAdminOrdersParams {
  page?: number
  size?: number
  keyword?: string
  status?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'totalAmount' | 'itemCount'
  sortDirection?: 'asc' | 'desc'
  createdFrom?: string
  createdTo?: string
}

export interface UpdateAdminOrderStatusInput {
  id: number
  status: string
}

export async function fetchAdminOrders(params: FetchAdminOrdersParams = {}) {
  const query = new URLSearchParams()

  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))

  if (params.keyword && params.keyword.trim().length > 0) {
    query.set('keyword', params.keyword.trim())
  }

  if (params.status && params.status.trim().length > 0) {
    query.set('status', params.status.trim())
  }

  if (params.createdFrom && params.createdFrom.trim().length > 0) {
    query.set('createdFrom', params.createdFrom.trim())
  }

  if (params.createdTo && params.createdTo.trim().length > 0) {
    query.set('createdTo', params.createdTo.trim())
  }

  if (params.sortBy) {
    query.set('sortBy', params.sortBy)
  }

  if (params.sortDirection) {
    query.set('sortDirection', params.sortDirection)
  }

  return authenticatedApiRequest<ApiEnvelope<PaginatedOrdersResponse>>(`/admin/orders?${query.toString()}`, {
    method: 'GET',
  })
}

export async function fetchAdminOrder(id: number) {
  return authenticatedApiRequest<ApiEnvelope<AdminOrder>>(`/admin/orders/${id}`, {
    method: 'GET',
  })
}

export async function patchAdminOrderStatus(input: UpdateAdminOrderStatusInput) {
  return authenticatedApiRequest<ApiEnvelope<AdminOrder>>(`/admin/orders/${input.id}/status`, {
    method: 'PATCH',
    body: {
      status: input.status,
    },
  })
}