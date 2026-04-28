import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import CustomerAccountMenu from '../components/CustomerAccountMenu'
import { changePassword, loadAuthSession, logout, saveAuthSession } from '../../shared/auth'

export function CustomerSecurityPage() {
  const session = loadAuthSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLogout() {
    await logout()
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.')
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      })

      saveAuthSession(response.data)
      setMessage(response.message || 'Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to change password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (!session?.accessToken) {
    return <Navigate replace to="/login" />
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#fffdf8_0%,#ffffff_35%,#f7f5ef_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_28%),linear-gradient(180deg,#09090b_0%,#111827_40%,#020617_100%)] dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/75">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="rounded-full px-3">
            <Link to="/">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>

          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-zinc-900 shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:bg-white">
              <ShieldCheck className="size-4 text-white dark:text-zinc-900" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">Security</span>
          </Link>

          <CustomerAccountMenu onLogout={() => void handleLogout()} />
        </div>
      </header>

      <div className="mx-auto max-w-screen-lg px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8 space-y-3">
          <Badge variant="secondary" className="w-fit border border-zinc-200/80 bg-white/90 text-[10px] uppercase tracking-[0.22em] text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Account security
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Security settings</h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Change your password from the same account menu used across the customer experience.
          </p>
        </div>

        <Card className="rounded-[2rem] border-zinc-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
          <CardHeader>
            <CardTitle>Update password</CardTitle>
            <CardDescription>Use your current password to set a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleChangePassword}>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="current-password" className="text-sm font-medium">Current password</label>
                  <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-password" className="text-sm font-medium">New password</label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-new-password" className="text-sm font-medium">Confirm new password</label>
                  <Input id="confirm-new-password" type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required />
                </div>
              </div>

              {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
              {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}

              <Button type="submit" className="rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200" disabled={isChangingPassword}>
                {isChangingPassword ? 'Saving...' : 'Change password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default CustomerSecurityPage