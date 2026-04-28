import { authenticatedApiRequest } from '../../shared/auth'

export interface BookAuthor {
  id: number
  name: string
  slug: string
  biography: string
  createdAt: string
  updatedAt: string
}

export interface Book {
  id: number
  categoryId: number
  authors: BookAuthor[]
  title: string
  slug: string
  description: string
  isbn: string
  price: number
  stock: number
  likeCount: number
  averageRating: number
  coverImageUrl: string
  status: string
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

export interface PaginatedBooksResponse {
  content: Book[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface CreateBookInput {
  categoryId: number
  authorIds: number[]
  title: string
  slug: string
  description: string
  isbn: string
  price: number
  stock: number
  coverImageUrl: string
  status: string
  coverFile?: File | null
}

export interface UpdateBookInput extends CreateBookInput {
  id: number
}

export interface UpdateBookStatusInput {
  id: number
  status: string
}

export interface FetchAdminBooksParams {
  page?: number
  size?: number
  keyword?: string
  sortBy?: 'name' | 'updatedAt' | 'averageRating'
  sortDirection?: 'asc' | 'desc'
  createdFrom?: string
  createdTo?: string
}

export async function fetchAdminBooks(params: FetchAdminBooksParams = {}) {
  const query = new URLSearchParams()

  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 10))

  if (params.keyword && params.keyword.trim().length > 0) {
    query.set('keyword', params.keyword.trim())
  }

  if (params.sortBy) {
    query.set('sortBy', params.sortBy)
  }

  if (params.sortDirection) {
    query.set('sortDirection', params.sortDirection)
  }

  if (params.createdFrom && params.createdFrom.trim().length > 0) {
    query.set('createdFrom', params.createdFrom.trim())
  }

  if (params.createdTo && params.createdTo.trim().length > 0) {
    query.set('createdTo', params.createdTo.trim())
  }

  return authenticatedApiRequest<ApiEnvelope<PaginatedBooksResponse>>(`/admin/books?${query.toString()}`, {
    method: 'GET',
  })
}

export async function fetchAdminBook(id: number) {
  return authenticatedApiRequest<ApiEnvelope<Book>>(`/admin/books/${id}`, {
    method: 'GET',
  })
}

export async function createAdminBook(input: CreateBookInput) {
  const formData = new FormData()

  formData.set('categoryId', String(input.categoryId))
  input.authorIds.forEach((authorId) => {
    formData.append('authorIds', String(authorId))
  })
  formData.set('title', input.title)
  formData.set('slug', input.slug)
  formData.set('description', input.description)
  formData.set('isbn', input.isbn)
  formData.set('price', String(input.price))
  formData.set('stock', String(input.stock))
  formData.set('coverImageUrl', input.coverImageUrl)
  formData.set('status', input.status)

  if (input.coverFile) {
    formData.set('coverFile', input.coverFile)
  }

  return authenticatedApiRequest<ApiEnvelope<Book>>('/admin/books', {
    method: 'POST',
    body: formData,
  })
}

export async function updateAdminBook(input: UpdateBookInput) {
  const formData = new FormData()

  formData.set('categoryId', String(input.categoryId))
  input.authorIds.forEach((authorId) => {
    formData.append('authorIds', String(authorId))
  })
  formData.set('title', input.title)
  formData.set('slug', input.slug)
  formData.set('description', input.description)
  formData.set('isbn', input.isbn)
  formData.set('price', String(input.price))
  formData.set('stock', String(input.stock))
  formData.set('coverImageUrl', input.coverImageUrl)
  formData.set('status', input.status)

  if (input.coverFile) {
    formData.set('coverFile', input.coverFile)
  }

  return authenticatedApiRequest<ApiEnvelope<Book>>(`/admin/books/${input.id}`, {
    method: 'PUT',
    body: formData,
  })
}

export async function deleteAdminBook(id: number) {
  return authenticatedApiRequest<ApiEnvelope<string>>(`/admin/books/${id}`, {
    method: 'DELETE',
  })
}

export async function patchAdminBookStatus(input: UpdateBookStatusInput) {
  return authenticatedApiRequest<ApiEnvelope<Book>>(`/admin/books/${input.id}/status`, {
    method: 'PATCH',
    body: {
      status: input.status,
    },
  })
}
