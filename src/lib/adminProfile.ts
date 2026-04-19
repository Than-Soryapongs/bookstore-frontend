import { authenticatedApiRequest } from './auth'
import type { ApiEnvelope, AdminUser } from './auth'

export interface AdminProfile extends AdminUser {
  avatarUrl?: string
  updatedAt: string
}

export async function fetchAdminProfile() {
  return authenticatedApiRequest<ApiEnvelope<AdminProfile>>('/users/me')
}