import { authenticatedApiRequest } from './auth'

export interface AdminUser {
  id: number
  username: string
  fullName: string
  avatarUrl: string
  email: string
  role: string
  emailVerified: boolean
  enabled: boolean
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

export interface PaginatedUsersResponse {
  content: AdminUser[]
  totalElements: number
  totalPages: number
  page: number
  size: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface FetchAdminUsersParams {
  page?: number
  size?: number
  keyword?: string
  role?: string
  enabled?: string
  emailVerified?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'username' | 'fullName'
  sortDirection?: 'asc' | 'desc'
}

export async function fetchAdminUsers(params: FetchAdminUsersParams = {}) {
  const query = new URLSearchParams()

  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))

  if (params.keyword && params.keyword.trim().length > 0) {
    query.set('keyword', params.keyword.trim())
  }

  if (params.role && params.role.trim().length > 0) {
    query.set('role', params.role.trim())
  }

  if (params.enabled && params.enabled.trim().length > 0) {
    query.set('enabled', params.enabled.trim())
  }

  if (params.emailVerified && params.emailVerified.trim().length > 0) {
    query.set('emailVerified', params.emailVerified.trim())
  }

  if (params.sortBy) {
    query.set('sortBy', params.sortBy)
  }

  if (params.sortDirection) {
    query.set('sortDirection', params.sortDirection)
  }

  return authenticatedApiRequest<ApiEnvelope<PaginatedUsersResponse>>(`/admin/users?${query.toString()}`, {
    method: 'GET',
  })
}

export async function fetchAdminUser(id: number) {
  return authenticatedApiRequest<ApiEnvelope<AdminUser>>(`/admin/users/${id}`, {
    method: 'GET',
  })
}

export async function patchAdminUserEnabled(id: number, enabled: boolean) {
  return authenticatedApiRequest<ApiEnvelope<AdminUser>>(`/admin/users/${id}/enabled`, {
    method: 'PATCH',
    body: {
      enabled,
    },
  })
}