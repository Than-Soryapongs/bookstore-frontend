import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2, LogIn, UserRound } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import {
  clearAuthSession,
  isAdminRole,
  hasAuthSession,
  isAdminSession,
  loadAuthSession,
  requestLogin,
  revokeAuthSession,
  saveAuthSession,
} from '../../shared/auth'

const BOOKSTORE_BACKGROUND_IMAGE = '/img/bookstore-img.jpg'

export function CustomerLoginPage() {
  const navigate = useNavigate()
  const session = loadAuthSession()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isAdminAuthenticated = isAdminSession(session)
  const hasAnyAuthenticatedSession = Boolean(session?.accessToken || hasAuthSession())

  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/dashboard/overview', { replace: true })
      return
    }

    if (hasAnyAuthenticatedSession) {
      navigate('/', { replace: true })
    }
  }, [hasAnyAuthenticatedSession, isAdminAuthenticated, navigate])

  if (isAdminAuthenticated) {
    return <Navigate replace to="/admin/dashboard/overview" />
  }

  if (hasAnyAuthenticatedSession) {
    return <Navigate replace to="/" />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const response = await requestLogin({ identifier: identifier.trim(), password })

      if (isAdminRole(response.data.user.role)) {
        await revokeAuthSession(response.data.accessToken)
        clearAuthSession()
        setErrorMessage('User is admin.')
        return
      }

      saveAuthSession(response.data)

      navigate('/', { replace: true })
    } catch (error) {
      clearAuthSession()
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.16),_transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.92)_0%,rgba(15,23,42,0.96)_100%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-screen"
        style={{ backgroundImage: `url(${BOOKSTORE_BACKGROUND_IMAGE})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,6,23,0.84)_0%,rgba(2,6,23,0.42)_44%,rgba(2,6,23,0.82)_100%)]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
        <section className="flex items-stretch">
          <div className="flex w-full flex-col justify-between rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="space-y-8">
              <Badge variant="secondary" className="w-fit gap-2 border border-white/15 bg-white/10 px-3 py-1.5 uppercase tracking-[0.28em] text-white">
                <UserRound className="size-3.5" />
                Customer login
              </Badge>

              <div className="max-w-2xl space-y-5">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200/90">Reader space</p>
                <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Sign in to continue browsing books, saving favorites, and placing orders.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-200/85 sm:text-lg">
                  Use your customer account to keep your shelf, wishlist, and order history in one place.
                </p>
              </div>
            </div>

            <div className="grid gap-4 pt-10 sm:grid-cols-3">
              {[
                'Fast sign-in',
                'Wishlist and orders',
                'Bookstore community access',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-sm text-slate-100 shadow-lg shadow-black/10">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center lg:justify-end">
          <Card className="w-full max-w-xl border-white/10 bg-slate-950/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <CardHeader className="space-y-4 border-b border-white/10 bg-white/5 px-6 py-6 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-200 ring-1 ring-inset ring-blue-300/20">
                  <LogIn className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Customer login</CardTitle>
                  <CardDescription className="text-slate-300">
                    Sign in to your bookstore account.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-6 py-6 sm:px-8">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Login failed</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2.5">
                  <label htmlFor="identifier" className="text-sm font-medium text-slate-200">
                    Email or username
                  </label>
                  <Input
                    id="identifier"
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="user@example.com"
                    className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="password" className="text-sm font-medium text-slate-200">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-blue-400 text-slate-950 shadow-lg shadow-blue-500/25 transition hover:bg-blue-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LogIn className="mr-2 size-4" />}
                  {isSubmitting ? 'Signing in...' : 'Sign in to account'}
                </Button>
              </form>

              <div className="flex flex-col gap-2 border-t border-white/10 pt-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <p>Need an account or forgot your password?</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="ghost" size="sm" className="w-fit text-slate-100 hover:bg-white/10 hover:text-white">
                    <Link to="/forgot-password">Forgot password?</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-fit border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    <Link to="/signup">Create account</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default CustomerLoginPage