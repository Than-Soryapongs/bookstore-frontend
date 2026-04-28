import { authenticatedApiRequest } from './auth'

export interface BookRatingResponseData {
  bookId: number
  userId: number
  rating: number
  ratingCount: number
  averageRating: number
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

export async function fetchBookRating(bookId: number) {
  return authenticatedApiRequest<ApiEnvelope<BookRatingResponseData>>(`/users/books/${bookId}/rating`, {
    method: 'GET',
  })
}

export async function submitBookRating(bookId: number, rating: number) {
  return authenticatedApiRequest<ApiEnvelope<BookRatingResponseData>>(`/users/books/${bookId}/rating`, {
    method: 'PATCH',
    body: {
      rating,
    },
  })
}