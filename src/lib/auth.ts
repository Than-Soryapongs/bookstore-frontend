import { ApiError, apiRequest } from './api'

export interface AdminUser {
  id: number
  username: string
  fullName: string
  avatarUrl?: string
  email: string
  role: string
  emailVerified: boolean
  enabled: boolean
  createdAt: string
  updatedAt?: string
}

export interface LoginRequest {
  identifier: string
  password: string
}

export interface LoginResponseData {
  tokenType: string
  accessToken: string
  user: AdminUser
  authenticated: boolean
}

export interface ApiEnvelope<T> {
  timestamp: string
  status: number
  message: string
  data: T
  path: string
}

export interface AuthSession {
  accessToken: string
  user: AdminUser
}

const AUTH_STORAGE_KEY = 'bookstore.admin.auth'

export function loadAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.sessionStorage.getItem(AUTH_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as AuthSession
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function saveAuthSession(session: LoginResponseData) {
  if (typeof window === 'undefined') {
    return
  }

  const storedSession: AuthSession = {
    accessToken: session.accessToken,
    user: session.user,
  }

  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedSession))
}

export function clearAuthSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
}

export function hasAuthSession() {
  const session = loadAuthSession()
  return Boolean(session?.accessToken)
}

export function getAuthToken() {
  return loadAuthSession()?.accessToken ?? null
}

export async function refreshAuthSession() {
  try {
    const response = await apiRequest<ApiEnvelope<LoginResponseData>>('/auth/refresh-token', {
      method: 'POST',
    })

    saveAuthSession(response.data)

    return response.data
  } catch (error) {
    clearAuthSession()

    if (error instanceof ApiError) {
      return null
    }

    throw error
  }
}

export async function authenticatedApiRequest<T>(path: string, options: Parameters<typeof apiRequest<T>>[1] = {}) {
  const authToken = options.authToken ?? getAuthToken()

  try {
    return await apiRequest<T>(path, {
      ...options,
      authToken,
    })
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error
    }

    const refreshedSession = await refreshAuthSession()

    if (!refreshedSession) {
      throw error
    }

    return apiRequest<T>(path, {
      ...options,
      authToken: refreshedSession.accessToken,
    })
  }
}

export async function loginAdmin(credentials: LoginRequest) {
  const response = await apiRequest<ApiEnvelope<LoginResponseData>>('/auth/login', {
    method: 'POST',
    body: credentials,
  })

  saveAuthSession(response.data)

  return response.data
}

export async function logoutAdmin() {
  return authenticatedApiRequest<ApiEnvelope<null>>('/auth/logout', {
    method: 'POST',
  })
}