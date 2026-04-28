import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleUserRound, LockKeyhole, Loader2, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../../../components/ui/button'
import { fetchCurrentUser, loadAuthSession, saveAuthSession } from '../../shared/auth'

type CustomerAccountMenuProps = {
  onLogout: () => void | Promise<void>
  isLoggingOut?: boolean
}

type CustomerProfile = {
  avatarUrl?: string
  fullName: string
  username: string
  email: string
}

function getInitials(profile: CustomerProfile | null) {
  const name = profile?.fullName?.trim() || profile?.username?.trim() || 'U'

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function CustomerAccountMenu({ onLogout, isLoggingOut = false }: CustomerAccountMenuProps) {
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const [session, setSession] = useState(() => loadAuthSession())
  const sessionAccessToken = session?.accessToken
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<CustomerProfile | null>(() =>
    session?.user
      ? {
          avatarUrl: session.user.avatarUrl,
          fullName: session.user.fullName,
          username: session.user.username,
          email: session.user.email,
        }
      : null,
  )

  useEffect(() => {
    function syncSession() {
      const nextSession = loadAuthSession()

      setSession(nextSession)
      setProfile(
        nextSession?.user
          ? {
              avatarUrl: nextSession.user.avatarUrl,
              fullName: nextSession.user.fullName,
              username: nextSession.user.username,
              email: nextSession.user.email,
            }
          : null,
      )
    }

    syncSession()

    window.addEventListener('bookstore.auth.session.changed', syncSession)

    return () => {
      window.removeEventListener('bookstore.auth.session.changed', syncSession)
    }
  }, [])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (!isOpen) {
      return undefined
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    let isCancelled = false

    async function refreshProfile() {
      if (!sessionAccessToken) {
        return
      }

      try {
        const response = await fetchCurrentUser()

        if (isCancelled) {
          return
        }

        const refreshedUser = response.data

        setProfile({
          avatarUrl: refreshedUser.avatarUrl,
          fullName: refreshedUser.fullName,
          username: refreshedUser.username,
          email: refreshedUser.email,
        })

        saveAuthSession({
          accessToken: sessionAccessToken,
          user: refreshedUser,
        })
      } catch {
        if (isCancelled) {
          return
        }

        setProfile(
          session?.user
            ? {
                avatarUrl: session.user.avatarUrl,
                fullName: session.user.fullName,
                username: session.user.username,
                email: session.user.email,
              }
            : null,
        )
      }
    }

    void refreshProfile()

    return () => {
      isCancelled = true
    }
  }, [sessionAccessToken])

  const initials = useMemo(() => getInitials(profile), [profile])

  if (!sessionAccessToken) {
    return null
  }

  return (
    <div ref={profileMenuRef} className="relative shrink-0">
      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-72 overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:border-zinc-800 dark:bg-zinc-950">
          <div className="px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-950 via-zinc-800 to-zinc-700 text-sm font-semibold text-white dark:border-zinc-700">
                {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={profile.fullName} className="size-full object-cover" /> : <span>{initials}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{profile?.fullName ?? 'Your account'}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{profile?.email ?? session?.user.email ?? 'Signed in account'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <Button asChild variant="ghost" className="h-11 w-full justify-start gap-3 rounded-2xl px-3" onClick={() => setIsOpen(false)}>
              <Link to="/profile">
                <CircleUserRound className="size-4" />
                <span>Profile</span>
              </Link>
            </Button>

            <Button asChild variant="ghost" className="h-11 w-full justify-start gap-3 rounded-2xl px-3" onClick={() => setIsOpen(false)}>
              <Link to="/security">
                <LockKeyhole className="size-4" />
                <span>Security</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              className="h-11 w-full justify-start gap-3 rounded-2xl px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-200"
              onClick={() => {
                setIsOpen(false)
                void onLogout()
              }}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
            </Button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="flex size-8 appearance-none items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0 leading-none shadow-none outline-none transition hover:scale-105"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-gradient-to-br from-zinc-950 via-zinc-800 to-zinc-700 text-[10px] font-semibold text-white">
          {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={profile.fullName} className="size-full object-cover" /> : <span>{initials}</span>}
        </div>
      </button>
    </div>
  )
}

export default CustomerAccountMenu