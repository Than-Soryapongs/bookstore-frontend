import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2, MailCheck, UserPlus } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import {
  ensureCsrfToken,
  loadAuthSession,
  saveAuthSession,
  submitCustomerSignup,
  verifyCustomerEmail,
} from '../../shared/auth'
import VerificationCodeInput from '../../shared/VerificationCodeInput'

const BOOKSTORE_BACKGROUND_IMAGE = '/img/bookstore-img.jpg'

export function CustomerSignupPage() {
  const navigate = useNavigate()
  const session = loadAuthSession()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false)
  const [isSubmittingCode, setIsSubmittingCode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [signupState, setSignupState] = useState<{
    email: string
    verificationCodeExpiresInMinutes: number
    signupSessionExpiresInMinutes: number
  } | null>(null)

  useEffect(() => {
    void ensureCsrfToken().catch(() => {
      // Best-effort prefetch before opening the auth form.
    })
  }, [])

  if (session?.accessToken) {
    return <Navigate replace to="/" />
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmittingSignup(true)

    try {
      const response = await submitCustomerSignup({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      })

      setSignupState(response.data)
      setSuccessMessage(response.message || 'Verification code sent to your email.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmittingSignup(false)
    }
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmittingCode(true)

    try {
      const response = await verifyCustomerEmail({ code: verificationCode.trim() })
      saveAuthSession(response.data)
      navigate('/', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmittingCode(false)
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
                <UserPlus className="size-3.5" />
                Customer signup
              </Badge>

              <div className="max-w-2xl space-y-5">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200/90">Join the bookstore</p>
                <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Create your account and start building a personal bookshelf.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-200/85 sm:text-lg">
                  Sign up once, verify your email, and keep browsing, saving, and ordering simple.
                </p>
              </div>
            </div>

            <div className="grid gap-4 pt-10 sm:grid-cols-3">
              {[
                'Email verification',
                'Fast account setup',
                'Personal reading profile',
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
                  <MailCheck className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Create account</CardTitle>
                  <CardDescription className="text-slate-300">
                    Sign up and verify the code sent to your email.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-6 py-6 sm:px-8">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Signup error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              {successMessage ? (
                <Alert className="border-blue-400/20 bg-blue-400/10 text-blue-50">
                  <MailCheck className="size-4" />
                  <AlertTitle>Check your email</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              ) : null}

              <form className="space-y-5" onSubmit={handleSignup}>
                <div className="space-y-2.5">
                  <label htmlFor="fullName" className="text-sm font-medium text-slate-200">
                    Full name
                  </label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="John Doe"
                    className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="signupEmail" className="text-sm font-medium text-slate-200">
                    Email
                  </label>
                  <Input
                    id="signupEmail"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="user@example.com"
                    className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="signupPassword" className="text-sm font-medium text-slate-200">
                    Password
                  </label>
                  <Input
                    id="signupPassword"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a strong password"
                    className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
                    Confirm password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-blue-400 text-slate-950 shadow-lg shadow-blue-500/25 transition hover:bg-blue-300"
                  disabled={isSubmittingSignup || password.length === 0 || confirmPassword.length === 0 || password !== confirmPassword}
                >
                  {isSubmittingSignup ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserPlus className="mr-2 size-4" />}
                  {isSubmittingSignup ? 'Creating account...' : 'Create account'}
                </Button>
              </form>

              {signupState ? (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-white/6 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">Email verification</p>
                    <p className="text-sm text-slate-300">
                      We sent a code to <span className="font-medium text-white">{signupState.email}</span>.
                      It expires in {signupState.verificationCodeExpiresInMinutes} minutes.
                    </p>
                    <p className="text-sm text-slate-300">
                      Your signup session expires in {signupState.signupSessionExpiresInMinutes} minutes.
                    </p>
                  </div>

                  <form className="space-y-4" onSubmit={handleVerifyCode}>
                    <div className="space-y-2.5">
                      <label htmlFor="verificationCode" className="text-sm font-medium text-slate-200">
                        Verification code
                      </label>
                      <VerificationCodeInput
                        value={verificationCode}
                        onChange={setVerificationCode}
                        className="pt-1"
                      />
                    </div>

                    <Button type="submit" className="h-12 w-full rounded-xl bg-blue-400 text-slate-950 shadow-lg shadow-blue-500/25 transition hover:bg-blue-300" disabled={isSubmittingCode}>
                      {isSubmittingCode ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      {isSubmittingCode ? 'Verifying...' : 'Verify email'}
                    </Button>
                  </form>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-white/10 pt-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <p>Already have an account?</p>
                <Button asChild variant="outline" size="sm" className="w-fit border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default CustomerSignupPage
