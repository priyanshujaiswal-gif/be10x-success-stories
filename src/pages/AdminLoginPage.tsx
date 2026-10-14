import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { adminLogin } from '../lib/api'
import { ADMIN_STORIES_PATH } from '../lib/adminRoutes'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await adminLogin(email, password)
      navigate({ to: ADMIN_STORIES_PATH })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Admin Sign In</h1>
      <p className="mt-2 text-sm text-white/60">
        Authenticated access only. Credentials are configured via server environment variables.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 focus:border-brand-blue focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 focus:border-brand-blue focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-blue py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
