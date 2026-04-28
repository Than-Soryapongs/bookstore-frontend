import { authenticatedApiRequest } from '../../shared/auth'

export interface Category {
  id: number
  name: string
  slug: string
  description: string
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

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface CreateCategoryInput {
  name: string
  slug: string
  description: string
}

export interface UpdateCategoryInput extends CreateCategoryInput {
  id: number
}

export interface FetchAdminCategoriesParams {
  page?: number
  size?: number
  keyword?: string
  sortBy?: 'name' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
  createdFrom?: string
  createdTo?: string
}

export async function fetchAdminCategories(params: FetchAdminCategoriesParams = {}) {
  const query = new URLSearchParams()

  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))

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

  return authenticatedApiRequest<ApiEnvelope<PaginatedResponse<Category>>>(`/admin/categories?${query.toString()}`, {
    method: 'GET',
  })
}

export async function createAdminCategory(input: CreateCategoryInput) {
  return authenticatedApiRequest<ApiEnvelope<Category>>('/admin/categories', {
    method: 'POST',
    body: input,
  })
}

export async function updateAdminCategory(input: UpdateCategoryInput) {
  return authenticatedApiRequest<ApiEnvelope<Category>>(`/admin/categories/${input.id}`, {
    method: 'PUT',
    body: {
      name: input.name,
      slug: input.slug,
      description: input.description,
    },
  })
}

export async function deleteAdminCategory(id: number) {
  return authenticatedApiRequest<ApiEnvelope<string>>(`/admin/categories/${id}`, {
    method: 'DELETE',
  })
}