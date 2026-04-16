import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck, LogIn } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { clearAuthSession, hasAuthSession, loadAuthSession, loginAdmin } from '../lib/auth'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const existingSession = useMemo(() => loadAuthSession(), [])
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (existingSession?.accessToken || hasAuthSession()) {
      navigate('/admin/dashboard/overview', { replace: true })
    }
  }, [existingSession, navigate])

  if (existingSession?.accessToken || hasAuthSession()) {
    return <Navigate replace to="/admin/dashboard/overview" />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await loginAdmin({ identifier: identifier.trim(), password })
      navigate('/admin/dashboard/overview', { replace: true })
    } catch (error) {
      clearAuthSession()
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ffffff_46%,#eff6ff_100%)] px-6 py-10 text-foreground dark:bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.2),_transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_46%,#111827_100%)]">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_0.92fr]">
        <section className="space-y-6">
          <Badge variant="secondary" className="w-fit gap-2 px-3 py-1.5 uppercase tracking-[0.28em]">
            <ShieldCheck className="size-3.5" />
            Admin access
          </Badge>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Sign in to manage bookstore inventory, orders, and content.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              This page calls <span className="font-medium text-foreground">/api/auth/login</span> with a standard JSON payload. The access token is stored in the frontend session layer and the refresh token stays in an httpOnly backend cookie.
            </p>
          </div>
        </section>

        <Card className="border-border/70 bg-background/90 shadow-2xl shadow-black/10 backdrop-blur">
          <CardHeader className="space-y-3 border-b bg-muted/20 pb-6">
            <Badge className="w-fit">Secure session</Badge>
            <CardTitle className="text-2xl">Admin login</CardTitle>
            <CardDescription>
              Use your username or email, then enter your password to start an authenticated session.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 p-6">
            {errorMessage ? (
              <Alert variant="destructive">
                <AlertTitle>Login failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium">
                  Username or email
                </label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LogIn className="mr-2 size-4" />}
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default AdminLoginPage