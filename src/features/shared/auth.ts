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

export interface UserProfile extends AdminUser {
  avatarUrl?: string
  updatedAt?: string
}

export interface LoginRequest {
  identifier: string
  password: string
}

export interface SignupRequest {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export interface SignupResponseData {
  email: string
  verificationCodeExpiresInMinutes: number
  signupSessionExpiresInMinutes: number
}

export interface VerifyEmailRequest {
  code: string
}

export interface VerifyEmailResponseData {
  tokenType: string
  accessToken: string
  user: AdminUser
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordVerifyCodeRequest {
  code: string
}

export interface ResetPasswordVerifyCodeResponseData {
  resetSessionExpiresInMinutes: number
}

export interface ResetPasswordRequest {
  newPassword: string
  confirmNewPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export interface AuthTokenResponse {
  accessToken: string
  user: UserProfile
}

export interface LoginResponseData {
  tokenType: string
  accessToken: string
  user: UserProfile
  authenticated: boolean
}

export interface LoginResult {
  timestamp: string
  status: number
  message: string
  data: LoginResponseData
  path: string
}

export interface ApiEnvelope<T> {
  timestamp: string
  status: number
  message: string
  data: T
  path: string
}

export interface CsrfTokenData {
  headerName: string
  parameterName: string
  token: string
}

export interface CsrfTokenResponse {
  timestamp: string
  status: number
  message: string
  data: CsrfTokenData
  path: string
}

export interface AuthSession {
  accessToken: string
  user: UserProfile
}

let inMemoryAuthSession: AuthSession | null = null
let authBootstrapPromise: Promise<AuthSession | null> | null = null
let currentUserPromise: Promise<ApiEnvelope<AdminUser>> | null = null
let inMemoryCsrfToken: CsrfTokenData | null = null
const LOGGED_OUT_KEY = 'bookstore.auth.loggedOut'
const AUTH_SESSION_CHANGED_EVENT = 'bookstore.auth.session.changed'

function notifyAuthSessionChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
}

function isLoggedOut() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.sessionStorage.getItem(LOGGED_OUT_KEY) === 'true'
}

function setLoggedOut(value: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  if (value) {
    window.sessionStorage.setItem(LOGGED_OUT_KEY, 'true')
    return
  }

  window.sessionStorage.removeItem(LOGGED_OUT_KEY)
}

export function loadAuthSession(): AuthSession | null {
  if (inMemoryAuthSession) {
    return inMemoryAuthSession
  }

  return null
}

export function saveAuthSession(session: AuthTokenResponse) {
  const nextSession: AuthSession = {
    accessToken: session.accessToken,
    user: session.user,
  }

  inMemoryAuthSession = nextSession

  setLoggedOut(false)
  notifyAuthSessionChanged()
}

export function clearAuthSession() {
  inMemoryAuthSession = null

  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('bookstore.auth.session')
  }

  clearCsrfToken()
  notifyAuthSessionChanged()
}

export function clearCsrfToken() {
  inMemoryCsrfToken = null
}

export function hasAuthSession() {
  const session = loadAuthSession()
  return Boolean(session?.accessToken)
}

export function isAdminRole(role?: string | null) {
  return Boolean(role && role.trim().toLowerCase().includes('admin'))
}

export function isAdminSession(session: AuthSession | null = loadAuthSession()) {
  return Boolean(session?.accessToken && isAdminRole(session.user.role))
}

export function getAuthToken() {
  return loadAuthSession()?.accessToken ?? null
}

export async function bootstrapAuthSession() {
  if (isLoggedOut()) {
    return null
  }

  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('bookstore.auth.session')
  }

  const existingSession = loadAuthSession()

  if (existingSession?.accessToken) {
    return existingSession
  }

  if (!authBootstrapPromise) {
    authBootstrapPromise = refreshAuthSession().finally(() => {
      authBootstrapPromise = null
    })
  }

  await authBootstrapPromise
  return loadAuthSession()
}

async function fetchCsrfToken() {
  if (inMemoryCsrfToken) {
    return inMemoryCsrfToken
  }

  const response = await apiRequest<CsrfTokenResponse>('/auth/csrf', {
    method: 'GET',
  })

  inMemoryCsrfToken = response.data
  return response.data
}

export async function refreshAuthSession() {
  try {
    if (isLoggedOut()) {
      return null
    }

    const csrfToken = await fetchCsrfToken()

    if (!csrfToken) {
      return null
    }

    const response = await apiRequest<ApiEnvelope<LoginResponseData>>('/auth/refresh-token', {
      method: 'POST',
      headers: {
        [csrfToken.headerName]: csrfToken.token,
      },
    })

    saveAuthSession(response.data)

    return response.data
  } catch (error) {
    clearAuthSession()
    clearCsrfToken()

    if (error instanceof ApiError) {
      return null
    }

    throw error
  }
}

export async function ensureCsrfToken() {
  return fetchCsrfToken()
}

export async function submitCustomerSignup(input: SignupRequest) {
  const csrfToken = await ensureCsrfToken()

  if (!csrfToken) {
    throw new ApiError(500, 'Unable to load CSRF token', null)
  }

  return apiRequest<ApiEnvelope<SignupResponseData>>('/auth/signup', {
    method: 'POST',
    body: input,
    headers: {
      [csrfToken.headerName]: csrfToken.token,
    },
  })
}

export async function verifyCustomerEmail(input: VerifyEmailRequest) {
  const csrfToken = await ensureCsrfToken()

  if (!csrfToken) {
    throw new ApiError(500, 'Unable to load CSRF token', null)
  }

  return apiRequest<ApiEnvelope<VerifyEmailResponseData>>('/auth/verify-email', {
    method: 'POST',
    body: input,
    headers: {
      [csrfToken.headerName]: csrfToken.token,
    },
  })
}

export async function forgotPassword(input: ForgotPasswordRequest) {
  const csrfToken = await ensureCsrfToken()

  if (!csrfToken) {
    throw new ApiError(500, 'Unable to load CSRF token', null)
  }

  return apiRequest<ApiEnvelope<null>>('/auth/forgot-password', {
    method: 'POST',
    body: input,
    headers: {
      [csrfToken.headerName]: csrfToken.token,
    },
  })
}

export async function verifyResetPasswordCode(input: ResetPasswordVerifyCodeRequest) {
  const csrfToken = await ensureCsrfToken()

  if (!csrfToken) {
    throw new ApiError(500, 'Unable to load CSRF token', null)
  }

  return apiRequest<ApiEnvelope<ResetPasswordVerifyCodeResponseData>>('/auth/reset-password/verify-code', {
    method: 'POST',
    body: input,
    headers: {
      [csrfToken.headerName]: csrfToken.token,
    },
  })
}

export async function resetPassword(input: ResetPasswordRequest) {
  const csrfToken = await ensureCsrfToken()

  if (!csrfToken) {
    throw new ApiError(500, 'Unable to load CSRF token', null)
  }

  return apiRequest<ApiEnvelope<AuthTokenResponse>>('/auth/reset-password', {
    method: 'POST',
    body: input,
    headers: {
      [csrfToken.headerName]: csrfToken.token,
    },
  })
}

export async function changePassword(input: ChangePasswordRequest) {
  const csrfToken = await ensureCsrfToken()

  if (!csrfToken) {
    throw new ApiError(500, 'Unable to load CSRF token', null)
  }

  return apiRequest<ApiEnvelope<AuthTokenResponse>>('/auth/change-password', {
    method: 'PUT',
    body: input,
    headers: {
      [csrfToken.headerName]: csrfToken.token,
    },
    authToken: getAuthToken(),
  })
}

export async function requestLogin(credentials: LoginRequest) {
  return apiRequest<ApiEnvelope<LoginResponseData>>('/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

export async function authenticatedApiRequest<T>(path: string, options: Parameters<typeof apiRequest<T>>[1] = {}) {
  if (isLoggedOut()) {
    throw new ApiError(401, 'Logged out', null)
  }

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

    if (isLoggedOut()) {
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

export async function fetchCurrentUser() {
  if (!currentUserPromise) {
    currentUserPromise = authenticatedApiRequest<ApiEnvelope<UserProfile>>('/users/me', {
      method: 'GET',
    }).finally(() => {
      currentUserPromise = null
    })
  }

  return currentUserPromise
}

async function updateCurrentUserProfile(inputPath: '/users/me/username' | '/users/me/name', body: { username?: string; fullName?: string }) {
  const csrfToken = await ensureCsrfToken()

  if (!csrfToken) {
    throw new ApiError(500, 'Unable to load CSRF token', null)
  }

  return authenticatedApiRequest<ApiEnvelope<UserProfile>>(inputPath, {
    method: 'PUT',
    body,
    headers: {
      [csrfToken.headerName]: csrfToken.token,
    },
    authToken: getAuthToken(),
  })
}

export async function updateCurrentUserUsername(username: string) {
  return updateCurrentUserProfile('/users/me/username', { username })
}

export async function updateCurrentUserName(fullName: string) {
  return updateCurrentUserProfile('/users/me/name', { fullName })
}

export async function uploadCustomerAvatar(file: File, avatarUrl?: string) {
  const query = new URLSearchParams()

  if (avatarUrl && avatarUrl.trim().length > 0) {
    query.set('avatarUrl', avatarUrl.trim())
  }

  const formData = new FormData()
  formData.append('avatarFile', file)

  return authenticatedApiRequest<ApiEnvelope<AdminUser>>(
    `/users/me/avatar${query.toString().length > 0 ? `?${query.toString()}` : ''}`,
    {
      method: 'PUT',
      body: formData,
    },
  )
}

export async function login(credentials: LoginRequest) {
  const response = await requestLogin(credentials)

  saveAuthSession(response.data)

  return response.data
}

export async function loginAdmin(credentials: LoginRequest) {
  return login(credentials)
}

export async function logout() {
  const authToken = getAuthToken()
  const csrfToken = await ensureCsrfToken()

  setLoggedOut(true)

  try {
    await apiRequest<ApiEnvelope<null>>('/auth/logout', {
      method: 'POST',
      headers: csrfToken ? { [csrfToken.headerName]: csrfToken.token } : undefined,
      authToken,
    })
  } finally {
    clearAuthSession()
  }
}

export async function logoutAdmin() {
  return logout()
}

export async function revokeAuthSession(authToken: string) {
  const csrfToken = await ensureCsrfToken()

  if (!csrfToken) {
    throw new ApiError(500, 'Unable to load CSRF token', null)
  }

  return apiRequest<ApiEnvelope<null>>('/auth/logout', {
    method: 'POST',
    headers: {
      [csrfToken.headerName]: csrfToken.token,
    },
    authToken,
  })
}