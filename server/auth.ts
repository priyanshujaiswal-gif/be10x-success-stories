import bcrypt from 'bcryptjs'
import type { CookieOptions, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'be10x_admin_session'

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is required for admin authentication')
  }
  return secret
}

export function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    return null
  }
  return { email: email.toLowerCase(), password }
}

export async function verifyAdminLogin(email: string, password: string): Promise<boolean> {
  const creds = getAdminCredentials()
  if (!creds) return false
  if (email.toLowerCase() !== creds.email) return false
  if (creds.password.startsWith('$2')) {
    return bcrypt.compare(password, creds.password)
  }
  return password === creds.password
}

export function signAdminToken(email: string): string {
  return jwt.sign({ sub: email, role: 'admin' }, getJwtSecret(), { expiresIn: '8h' })
}

export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, cookieOptions())
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

export function readSession(req: Request): { email: string } | null {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { sub?: string; role?: string }
    if (payload.role !== 'admin' || !payload.sub) return null
    return { email: payload.sub }
  } catch {
    return null
  }
}

export function requireAdmin(req: Request, res: Response): boolean {
  const session = readSession(req)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}
