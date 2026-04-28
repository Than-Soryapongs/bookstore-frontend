import { authenticatedApiRequest } from './auth'

export interface CartItem {
  bookId?: number
  quantity?: number
  unitPrice?: number
  currentStock?: number
  available?: boolean
  lineTotal?: number
  coverImageUrl?: string
  unavailableReason?: string
  title?: string
  slug?: string
  book?: {
    id: number
    title: string
    slug: string
    price: number
    stock: number
    coverImageUrl?: string
    authors: Array<{ id?: number; name: string }>
    categoryId?: number
    category?: { id?: number; name: string }
  }
}

export interface CartData {
  cartId?: number
  items: CartItem[]
  totalItems?: number
  totalQuantity?: number
  subtotal?: number
  createdAt?: string
  updatedAt?: string
}

export interface ApiEnvelope<T> {
  timestamp: string
  status: number
  message: string
  data: T
  path: string
}

export async function fetchCart() {
  return authenticatedApiRequest<ApiEnvelope<CartData>>('/users/cart', {
    method: 'GET',
  })
}

export async function addBookToCart(bookId: number, quantity = 1) {
  return authenticatedApiRequest<ApiEnvelope<CartData>>('/users/cart/items', {
    method: 'POST',
    body: {
      bookId,
      quantity,
    },
  })
}

export async function updateCartItemQuantity(bookId: number, quantity: number) {
  return authenticatedApiRequest<ApiEnvelope<CartData>>(`/users/cart/items/${bookId}`, {
    method: 'PUT',
    body: {
      quantity,
    },
  })
}

export async function deleteCartItem(bookId: number) {
  return authenticatedApiRequest<ApiEnvelope<CartData>>(`/users/cart/items/${bookId}`, {
    method: 'DELETE',
  })
}

export async function clearCart() {
  return authenticatedApiRequest<ApiEnvelope<CartData>>('/users/cart', {
    method: 'DELETE',
  })
}