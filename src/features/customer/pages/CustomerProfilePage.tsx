import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Calendar,
  Camera,
  Check,
  Loader2,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'

import { Skeleton } from '../../../components/ui/skeleton'
import CustomerAccountMenu from '../components/CustomerAccountMenu'
import {
  fetchCurrentUser,
  loadAuthSession,
  logout,
  saveAuthSession,
  updateCurrentUserName,
  updateCurrentUserUsername,
  uploadCustomerAvatar,
} from '../../shared/auth'

/* ─── Types ─────────────────────────────────────────────────────────── */

type CustomerProfile = {
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

/* ─── Helpers ────────────────────────────────────────────────────────── */

function formatDate(value?: string) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-stone-100 dark:border-stone-800 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="shrink-0 text-stone-400">{icon}</span>}
        <span className="text-xs uppercase tracking-widest font-medium text-stone-400 dark:text-stone-500 shrink-0">{label}</span>
      </div>
      <span className="text-sm font-medium text-stone-800 dark:text-stone-200 text-right truncate">{value}</span>
    </div>
  )
}

function FieldForm({
  label,
  description,
  inputId,
  value,
  onChange,
  onSubmit,
  isLoading,
  error,
  successMessage,
  placeholder,
  autoComplete,
}: {
  label: string
  description: string
  inputId: string
  value: string
  onChange: (v: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  error: string | null
  successMessage: string | null
  placeholder: string
  autoComplete?: string
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 p-4">
      <div>
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{label}</p>
        <p className="mt-0.5 text-[11px] text-stone-400 dark:text-stone-500">{description}</p>
      </div>
      <input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none focus:border-stone-400 dark:focus:border-stone-500 transition-colors"
      />
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <X className="size-3 shrink-0" /> {error}
        </p>
      )}
      {successMessage && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="size-3 shrink-0" /> {successMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 dark:bg-stone-100 px-4 py-2.5 text-xs font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {isLoading ? 'Saving…' : `Update ${label.toLowerCase()}`}
      </button>
    </form>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────── */

export function CustomerProfilePage() {
  const session = loadAuthSession()

  const [profile, setProfile] = useState<CustomerProfile | null>(session?.user ?? null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [usernameInput, setUsernameInput] = useState(() => session?.user.username ?? '')
  const [fullNameInput, setFullNameInput] = useState(() => session?.user.fullName ?? '')
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)
  const [isUpdatingFullName, setIsUpdatingFullName] = useState(false)
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [fullNameMessage, setFullNameMessage] = useState<string | null>(null)
  const [fullNameError, setFullNameError] = useState<string | null>(null)

  /* ── Load profile ── */
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!session?.accessToken) { setIsLoadingProfile(false); return }
      setIsLoadingProfile(true); setProfileError(null)
      try {
        const res = await fetchCurrentUser()
        if (cancelled) return
        const user = res.data
        setProfile(user); setUsernameInput(user.username); setFullNameInput(user.fullName)
        saveAuthSession({ accessToken: session.accessToken, user })
      } catch {
        if (!cancelled) setProfileError('Showing cached data — live profile could not be loaded.')
      } finally {
        if (!cancelled) setIsLoadingProfile(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [session?.accessToken])

  async function readFileAsDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Unable to read file.'))
      reader.readAsDataURL(file)
    })
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedAvatarFile(file)
    setAvatarMessage(null)
    setAvatarError(null)
    if (file) {
      void readFileAsDataUrl(file).then(setAvatarPreview)
    } else {
      setAvatarPreview(null)
    }
  }

  async function handleLogout() { await logout() }

  async function handleFullNameUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next = fullNameInput.trim()
    if (!next) { setFullNameError('Full name cannot be empty.'); return }
    if (next === displayedProfile.fullName) { setFullNameMessage('Already up to date.'); setFullNameError(null); return }
    setFullNameError(null); setFullNameMessage(null); setIsUpdatingFullName(true)
    try {
      const res = await updateCurrentUserName(next)
      const user = res.data
      setProfile(user); setFullNameInput(user.fullName)
      if (session?.accessToken) saveAuthSession({ accessToken: session.accessToken, user })
      setFullNameMessage(res.message || 'Full name updated.')
    } catch (err) { setFullNameError(err instanceof Error ? err.message : 'Unable to update.') }
    finally { setIsUpdatingFullName(false) }
  }

  async function handleUsernameUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next = usernameInput.trim()
    if (!next) { setUsernameError('Username cannot be empty.'); return }
    if (next === displayedProfile.username) { setUsernameMessage('Already up to date.'); setUsernameError(null); return }
    setUsernameError(null); setUsernameMessage(null); setIsUpdatingUsername(true)
    try {
      const res = await updateCurrentUserUsername(next)
      const user = res.data
      setProfile(user); setUsernameInput(user.username)
      if (session?.accessToken) saveAuthSession({ accessToken: session.accessToken, user })
      setUsernameMessage(res.message || 'Username updated.')
    } catch (err) { setUsernameError(err instanceof Error ? err.message : 'Unable to update.') }
    finally { setIsUpdatingUsername(false) }
  }

  async function handleAvatarUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedAvatarFile) { setAvatarError('Select an image file first.'); return }
    setAvatarError(null); setAvatarMessage(null); setIsUploadingAvatar(true)
    try {
      const previewUrl = await readFileAsDataUrl(selectedAvatarFile)
      const res = await uploadCustomerAvatar(selectedAvatarFile)
      const nextAvatarUrl = res.data.avatarUrl ?? previewUrl
      const nextUser = { ...res.data, avatarUrl: nextAvatarUrl }
      if (session?.accessToken) saveAuthSession({ accessToken: session.accessToken, user: nextUser })
      setProfile(nextUser); setSelectedAvatarFile(null); setAvatarPreview(null)
      setAvatarMessage('Avatar updated successfully.')
    } catch (err) { setAvatarError(err instanceof Error ? err.message : 'Unable to upload avatar.') }
    finally { setIsUploadingAvatar(false) }
  }

  if (!session?.accessToken) return <Navigate replace to="/login" />

  const displayedProfile = profile ?? session.user
  const avatarSrc = avatarPreview ?? displayedProfile.avatarUrl ?? null
  const initials = getInitials(displayedProfile.fullName)

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#0E0E0C] text-stone-900 dark:text-stone-100">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-stone-200/80 dark:border-stone-800 bg-[#FAFAF8]/95 dark:bg-[#0E0E0C]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:block">Catalog</span>
          </Link>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-stone-900 dark:bg-stone-100 transition-transform group-hover:scale-105">
              <BookOpen className="size-4 text-stone-100 dark:text-stone-900" />
            </div>
            <span className="font-serif text-base font-semibold tracking-tight">Bookstore</span>
          </Link>

          <CustomerAccountMenu onLogout={() => void handleLogout()} />
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <div className="border-b border-stone-100 dark:border-stone-800/60 bg-white dark:bg-stone-950">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 h-10 text-xs text-stone-400">
            <Link to="/" className="hover:text-stone-600 dark:hover:text-stone-300 transition-colors">Catalog</Link>
            <span>/</span>
            <span className="text-stone-600 dark:text-stone-300">Profile</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* ── Profile hero card ── */}
          <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">

            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-stone-200 via-stone-400 to-stone-200 dark:from-stone-800 dark:via-stone-600 dark:to-stone-800" />

            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 sm:items-center">

                {/* Avatar */}
                <div className="relative shrink-0 self-start">
                  <div className="size-24 overflow-hidden rounded-2xl border-2 border-stone-100 dark:border-stone-800 bg-gradient-to-br from-stone-800 to-stone-600 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={displayedProfile.fullName} className="size-full object-cover" />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <span className="font-serif text-2xl font-bold text-white">{initials}</span>
                      </div>
                    )}
                  </div>
                  {avatarPreview && (
                    <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-500 shadow-md">
                      <Camera className="size-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400 mb-1">Account</p>
                  {isLoadingProfile ? (
                    <div className="space-y-2">
                      <Skeleton className="h-7 w-48" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                  ) : (
                    <>
                      <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50 truncate">
                        {displayedProfile.fullName}
                      </h1>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                        <Mail className="size-3.5 shrink-0" />
                        {displayedProfile.email}
                      </p>
                    </>
                  )}

                  {/* Status chips */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2.5 py-1 text-[11px] font-medium text-stone-600 dark:text-stone-300">
                      <ShieldCheck className="size-3 text-stone-400" />
                      {displayedProfile.role}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      displayedProfile.emailVerified
                        ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        : 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                    }`}>
                      <BadgeCheck className="size-3" />
                      {displayedProfile.emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      displayedProfile.enabled
                        ? 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                        : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                    }`}>
                      {displayedProfile.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  {profileError && (
                    <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">{profileError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* ── Left col: Account info + avatar ── */}
            <div className="space-y-6">

              {/* Account details */}
              <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
                <div className="border-b border-stone-100 dark:border-stone-800 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">Account details</p>
                </div>
                <div className="px-5">
                  {isLoadingProfile ? (
                    <div className="space-y-3 py-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex justify-between">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Username" value={displayedProfile.username} icon={<UserRound className="size-3.5" />} />
                      <InfoRow label="Email" value={displayedProfile.email} icon={<Mail className="size-3.5" />} />
                      <InfoRow label="Role" value={displayedProfile.role} icon={<ShieldCheck className="size-3.5" />} />
                      <InfoRow label="Member since" value={formatDate(displayedProfile.createdAt)} icon={<Calendar className="size-3.5" />} />
                      <InfoRow label="Last updated" value={formatDate(displayedProfile.updatedAt ?? displayedProfile.createdAt)} icon={<Calendar className="size-3.5" />} />
                      <InfoRow label="Status" value={displayedProfile.enabled ? 'Active' : 'Disabled'} />
                    </>
                  )}
                </div>
              </div>

              {/* Avatar upload */}
              <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
                <div className="border-b border-stone-100 dark:border-stone-800 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">Profile photo</p>
                </div>
                <form onSubmit={handleAvatarUpload} className="p-5 space-y-4">
                  {/* File selector */}
                  <label
                    htmlFor="avatar-file"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/60 p-6 text-center transition-colors hover:border-stone-400 dark:hover:border-stone-500"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800">
                      <Camera className="size-5 text-stone-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                        {selectedAvatarFile ? selectedAvatarFile.name : 'Choose a photo'}
                      </p>
                      <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">PNG, JPG, WebP or GIF</p>
                    </div>
                    <input
                      id="avatar-file"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarFileChange}
                    />
                  </label>

                  {avatarError && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      <X className="size-3 shrink-0" /> {avatarError}
                    </p>
                  )}
                  {avatarMessage && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="size-3 shrink-0" /> {avatarMessage}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isUploadingAvatar || !selectedAvatarFile}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 dark:bg-stone-100 px-4 py-2.5 text-xs font-medium text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isUploadingAvatar ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                    {isUploadingAvatar ? 'Uploading…' : 'Upload photo'}
                  </button>
                </form>
              </div>
            </div>

            {/* ── Right col: Edit forms ── */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
                <div className="border-b border-stone-100 dark:border-stone-800 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">Edit profile</p>
                </div>
                <div className="p-5 space-y-4">
                  <FieldForm
                    label="Full name"
                    description="Your display name shown across the app."
                    inputId="fullName"
                    value={fullNameInput}
                    onChange={setFullNameInput}
                    onSubmit={handleFullNameUpdate}
                    isLoading={isUpdatingFullName}
                    error={fullNameError}
                    successMessage={fullNameMessage}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                  <FieldForm
                    label="Username"
                    description="Your handle used for login and profile display."
                    inputId="username"
                    value={usernameInput}
                    onChange={setUsernameInput}
                    onSubmit={handleUsernameUpdate}
                    isLoading={isUpdatingUsername}
                    error={usernameError}
                    successMessage={usernameMessage}
                    placeholder="Enter your username"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Security info tile */}
              <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
                <div className="border-b border-stone-100 dark:border-stone-800 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-400">Security</p>
                </div>
                <div className="px-5 py-1">
                  <InfoRow
                    label="Email"
                    value={displayedProfile.emailVerified ? 'Verified' : 'Not verified'}
                    icon={<BadgeCheck className="size-3.5" />}
                  />
                  <InfoRow
                    label="Account"
                    value={displayedProfile.enabled ? 'Active' : 'Disabled'}
                    icon={<ShieldCheck className="size-3.5" />}
                  />
                </div>
                <div className="px-5 pb-5 pt-2">
                  <p className="text-[11px] leading-5 text-stone-400 dark:text-stone-500">
                    To change your email or password, contact support. Account security settings are managed by your administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 mt-16">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-stone-900 dark:bg-stone-100">
                <BookOpen className="size-3.5 text-white dark:text-stone-900" />
              </div>
              <span className="font-serif text-sm font-semibold">Bookstore</span>
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              © {new Date().getFullYear()} Bookstore. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-xs text-stone-400 dark:text-stone-500">
              <a href="#" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Privacy</a>
              <a href="#" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Terms</a>
              <a href="#" className="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CustomerProfilePage