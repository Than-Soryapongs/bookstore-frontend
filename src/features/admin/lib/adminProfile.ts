import { authenticatedApiRequest, getAuthToken, updateCurrentUserName, updateCurrentUserUsername } from '../../shared/auth'
import type { ApiEnvelope, UserProfile } from '../../shared/auth'

export interface AdminProfile extends UserProfile {
  updatedAt: string
}

const profileResponseCache = new Map<string, ApiEnvelope<AdminProfile>>()
const profileRequestCache = new Map<string, Promise<ApiEnvelope<AdminProfile>>>()

type AdminProfileUpdateListener = (profile: AdminProfile | null) => void
const profileUpdateListeners = new Set<AdminProfileUpdateListener>()

export function subscribeAdminProfileUpdates(listener: AdminProfileUpdateListener) {
  profileUpdateListeners.add(listener)

  return () => {
    profileUpdateListeners.delete(listener)
  }
}

export function publishAdminProfileUpdate(profile: AdminProfile | null) {
  for (const listener of profileUpdateListeners) {
    listener(profile)
  }
}

export function cacheAdminProfile(authToken: string, response: ApiEnvelope<AdminProfile>) {
  profileResponseCache.set(authToken, response)
  publishAdminProfileUpdate(response.data)
}

export function clearAdminProfileCache() {
  profileResponseCache.clear()
  profileRequestCache.clear()
  publishAdminProfileUpdate(null)
}

export async function fetchAdminProfile() {
  const authToken = getAuthToken()

  if (!authToken) {
    return authenticatedApiRequest<ApiEnvelope<AdminProfile>>('/users/me')
  }

  const cachedResponse = profileResponseCache.get(authToken)
  if (cachedResponse) {
    return cachedResponse
  }

  const cachedRequest = profileRequestCache.get(authToken)
  if (cachedRequest) {
    return cachedRequest
  }

  const request = authenticatedApiRequest<ApiEnvelope<AdminProfile>>('/users/me', {
    authToken,
  })
    .then((response) => {
      profileResponseCache.set(authToken, response)
      publishAdminProfileUpdate(response.data)
      profileRequestCache.delete(authToken)
      return response
    })
    .catch((error) => {
      profileRequestCache.delete(authToken)
      throw error
    })

  profileRequestCache.set(authToken, request)

  return request
}

export async function uploadAdminAvatar(file: File, avatarUrl?: string) {
  const authToken = getAuthToken()

  if (!authToken) {
    return authenticatedApiRequest<ApiEnvelope<AdminProfile>>('/users/me/avatar', {
      method: 'PUT',
      body: (() => {
        const formData = new FormData()
        formData.append('avatarFile', file)
        return formData
      })(),
    })
  }

  const query = new URLSearchParams()

  if (avatarUrl && avatarUrl.trim().length > 0) {
    query.set('avatarUrl', avatarUrl.trim())
  }

  const formData = new FormData()
  formData.append('avatarFile', file)

  const response = await authenticatedApiRequest<ApiEnvelope<AdminProfile>>(
    `/users/me/avatar${query.toString().length > 0 ? `?${query.toString()}` : ''}`,
    {
      method: 'PUT',
      body: formData,
      authToken,
    },
  )

  cacheAdminProfile(authToken, response)

  return response
}

export async function updateAdminUsername(username: string) {
  const response = await updateCurrentUserUsername(username)
  const authToken = getAuthToken()
  const nextProfile: AdminProfile = {
    ...response.data,
    updatedAt: response.data.updatedAt ?? response.data.createdAt,
  }

  if (authToken) {
    cacheAdminProfile(authToken, {
      ...response,
      data: nextProfile,
    })
  }

  return {
    ...response,
    data: nextProfile,
  }
}

export async function updateAdminName(fullName: string) {
  const response = await updateCurrentUserName(fullName)
  const authToken = getAuthToken()
  const nextProfile: AdminProfile = {
    ...response.data,
    updatedAt: response.data.updatedAt ?? response.data.createdAt,
  }

  if (authToken) {
    cacheAdminProfile(authToken, {
      ...response,
      data: nextProfile,
    })
  }

  return {
    ...response,
    data: nextProfile,
  }
}