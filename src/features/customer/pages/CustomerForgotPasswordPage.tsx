import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2, KeyRound, MailQuestion, ShieldCheck } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import {
  ensureCsrfToken,
  forgotPassword,
  hasAuthSession,
  isAdminSession,
  loadAuthSession,
  resetPassword,
  saveAuthSession,
  verifyResetPasswordCode,
} from '../../shared/auth'
import VerificationCodeInput from '../../shared/VerificationCodeInput'

const BOOKSTORE_BACKGROUND_IMAGE = '/img/bookstore-img.jpg'

type ResetStep = 'request' | 'verify' | 'reset'

export function CustomerForgotPasswordPage() {
  const navigate = useNavigate()
  const session = loadAuthSession()
  const [step, setStep] = useState<ResetStep>('request')
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false)
  const [isSubmittingCode, setIsSubmittingCode] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [resetSessionExpiresInMinutes, setResetSessionExpiresInMinutes] = useState<number | null>(null)
  const isAdminAuthenticated = isAdminSession(session)
  const hasAnyAuthenticatedSession = Boolean(session?.accessToken || hasAuthSession())

  useEffect(() => {
    void ensureCsrfToken().catch(() => {
      // Best-effort CSRF prefetch before the reset flow starts.
    })
  }, [])

  if (isAdminAuthenticated) {
    return <Navigate replace to="/admin/dashboard/overview" />
  }

  if (hasAnyAuthenticatedSession) {
    return <Navigate replace to="/" />
  }

  async function handleRequestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmittingEmail(true)

    try {
      const response = await forgotPassword({ email: email.trim() })
      setStep('verify')
      setSuccessMessage(response.message || 'We sent a verification code to your email.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start password reset.'
      setErrorMessage(message)
    } finally {
      setIsSubmittingEmail(false)
    }
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmittingCode(true)

    try {
      const response = await verifyResetPasswordCode({ code: verificationCode.trim() })
      setResetSessionExpiresInMinutes(response.data.resetSessionExpiresInMinutes)
      setStep('reset')
      setSuccessMessage(response.message || 'Code verified. Set a new password next.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify the reset code.'
      setErrorMessage(message)
    } finally {
      setIsSubmittingCode(false)
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmittingPassword(true)

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New passwords do not match.')
      setIsSubmittingPassword(false)
      return
    }

    try {
      const response = await resetPassword({
        newPassword,
        confirmNewPassword,
      })

      saveAuthSession(response.data)
      navigate('/', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset your password.'
      setErrorMessage(message)
    } finally {
      setIsSubmittingPassword(false)
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
                <ShieldCheck className="size-3.5" />
                Password recovery
              </Badge>

              <div className="max-w-2xl space-y-5">
                <p className="text-sm uppercase tracking-[0.35em] text-blue-200/90">Account recovery</p>
                <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Recover access to your bookstore account in a clear, guided flow.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-200/85 sm:text-lg">
                  Request a verification code, confirm it, and finish recovery without extra clutter.
                </p>
              </div>
            </div>

            <div className="grid gap-4 pt-10 sm:grid-cols-3">
              {['Email code', 'Verification step', 'Secure recovery'].map((item) => (
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
                  <MailQuestion className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Forgot password</CardTitle>
                  <CardDescription className="text-slate-300">
                    Request a reset code and verify it to continue.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-6 py-6 sm:px-8">
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>Reset error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              {successMessage ? (
                <Alert className="border-blue-400/20 bg-blue-400/10 text-blue-50">
                  <MailQuestion className="size-4" />
                  <AlertTitle>Next step</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              ) : null}

              {step === 'request' ? (
                <form className="space-y-5" onSubmit={handleRequestReset}>
                  <div className="space-y-2.5">
                    <label htmlFor="resetEmail" className="text-sm font-medium text-slate-200">
                      Email
                    </label>
                    <Input
                      id="resetEmail"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="user@example.com"
                      className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                      required
                    />
                  </div>

                  <Button type="submit" className="h-12 w-full rounded-xl bg-blue-400 text-slate-950 shadow-lg shadow-blue-500/25 transition hover:bg-blue-300" disabled={isSubmittingEmail}>
                    {isSubmittingEmail ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    {isSubmittingEmail ? 'Sending code...' : 'Send reset code'}
                  </Button>
                </form>
              ) : null}

              {step === 'verify' ? (
                <form className="space-y-5" onSubmit={handleVerifyCode}>
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

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-12 flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setStep('request')}>
                      Change email
                    </Button>
                    <Button type="submit" className="h-12 flex-1 rounded-xl bg-blue-400 text-slate-950 shadow-lg shadow-blue-500/25 transition hover:bg-blue-300" disabled={isSubmittingCode}>
                      {isSubmittingCode ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      {isSubmittingCode ? 'Verifying...' : 'Verify code'}
                    </Button>
                  </div>
                </form>
              ) : null}

              {step === 'reset' ? (
                <form className="space-y-5 rounded-2xl border border-white/10 bg-white/6 p-4" onSubmit={handleResetPassword}>
                  <div className="space-y-2.5">
                    <label htmlFor="newPassword" className="text-sm font-medium text-slate-200">
                      New password
                    </label>
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter a new password"
                      className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <label htmlFor="confirmNewPassword" className="text-sm font-medium text-slate-200">
                      Confirm new password
                    </label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmNewPassword}
                      onChange={(event) => setConfirmNewPassword(event.target.value)}
                      placeholder="Re-enter the new password"
                      className="h-12 border-white/10 bg-white/6 text-white placeholder:text-slate-400 focus-visible:ring-blue-400/40"
                      required
                    />
                  </div>

                  {resetSessionExpiresInMinutes ? (
                    <p className="text-sm text-slate-300">
                      This recovery session expires in {resetSessionExpiresInMinutes} minutes.
                    </p>
                  ) : null}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-12 flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setStep('verify')}>
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="h-12 flex-1 rounded-xl bg-blue-400 text-slate-950 shadow-lg shadow-blue-500/25 transition hover:bg-blue-300"
                      disabled={isSubmittingPassword || newPassword.length === 0 || confirmNewPassword.length === 0}
                    >
                      {isSubmittingPassword ? <Loader2 className="mr-2 size-4 animate-spin" /> : <KeyRound className="mr-2 size-4" />}
                      {isSubmittingPassword ? 'Resetting...' : 'Reset password'}
                    </Button>
                  </div>
                </form>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-white/10 pt-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <p>Remembered your password?</p>
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

export default CustomerForgotPasswordPage