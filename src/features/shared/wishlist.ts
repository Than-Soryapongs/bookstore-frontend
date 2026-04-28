import { authenticatedApiRequest } from './auth'

export interface WishlistBookAuthor {
  id: number
  name: string
  slug: string
  biography: string
  createdAt: string
  updatedAt: string
}

export interface WishlistBookCategory {
  id: number
  name: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
}

export interface WishlistBook {
  id: number
  categoryId: number
  category: WishlistBookCategory
  authors: WishlistBookAuthor[]
  title: string
  slug: string
  description: string
  isbn: string
  price: number
  stock: number
  likeCount: number
  ratingCount: number
  averageRating: number
  coverImageUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface WishlistItem {
  book: WishlistBook
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

export interface WishlistResponseData {
  items: WishlistItem[]
  totalItems: number
}

export async function fetchWishlist() {
  return authenticatedApiRequest<ApiEnvelope<WishlistResponseData>>('/users/wishlist', {
    method: 'GET',
  })
}

export async function addBookToWishlist(bookId: number) {
  return authenticatedApiRequest<ApiEnvelope<WishlistResponseData>>(`/users/wishlist/items/${bookId}`, {
    method: 'POST',
  })
}

export async function removeBookFromWishlist(bookId: number) {
  return authenticatedApiRequest<ApiEnvelope<WishlistResponseData>>(`/users/wishlist/items/${bookId}`, {
    method: 'DELETE',
  })
}