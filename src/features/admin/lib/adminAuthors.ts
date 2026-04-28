import { authenticatedApiRequest } from '../../shared/auth'

export interface Author {
  id: number
  name: string
  slug: string
  biography: string
  createdAt: string
  updatedAt: string
}

export interface AuthorPageResponse {
  content: Author[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ApiEnvelope<T> {
  timestamp: string
  status: number
  message: string
  data: T
  path: string
}

export interface CreateAuthorInput {
  name: string
  slug: string
  biography: string
}

export interface UpdateAuthorInput {
  name: string
  slug: string
  biography: string
}

export interface AuthorQuery {
  page?: number
  size?: number
  keyword?: string
  sortBy?: 'name' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
  createdFrom?: string
  createdTo?: string
}

function toSearchParams(query: AuthorQuery) {
  const params = new URLSearchParams()

  if (typeof query.page === 'number') {
    params.set('page', String(query.page))
  }

  if (typeof query.size === 'number') {
    params.set('size', String(query.size))
  }

  if (query.keyword) {
    params.set('keyword', query.keyword)
  }

  if (query.sortBy) {
    params.set('sortBy', query.sortBy)
  }

  if (query.sortDirection) {
    params.set('sortDirection', query.sortDirection)
  }

  if (query.createdFrom) {
    params.set('createdFrom', query.createdFrom)
  }

  if (query.createdTo) {
    params.set('createdTo', query.createdTo)
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

export async function createAdminAuthor(input: CreateAuthorInput) {
  return authenticatedApiRequest<ApiEnvelope<Author>>('/admin/authors', {
    method: 'POST',
    body: input,
  })
}

export async function updateAdminAuthor(id: number, input: UpdateAuthorInput) {
  return authenticatedApiRequest<ApiEnvelope<Author>>(`/admin/authors/${id}`, {
    method: 'PUT',
    body: input,
  })
}

export async function fetchAdminAuthors(query: AuthorQuery = {}) {
  return authenticatedApiRequest<ApiEnvelope<AuthorPageResponse>>(`/admin/authors${toSearchParams(query)}`, {
    method: 'GET',
  })
}

export async function fetchAdminAuthor(id: number) {
  return authenticatedApiRequest<ApiEnvelope<Author>>(`/admin/authors/${id}`, {
    method: 'GET',
  })
}

export async function deleteAdminAuthor(id: number) {
  return authenticatedApiRequest<ApiEnvelope<string>>(`/admin/authors/${id}`, {
    method: 'DELETE',
  })
}