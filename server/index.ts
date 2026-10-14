import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clearSessionCookie,
  getAdminCredentials,
  readSession,
  requireAdmin,
  setSessionCookie,
  signAdminToken,
  verifyAdminLogin,
} from './auth.js'
import { getDb, rowToPrivateStory, rowToPublicStory, type StoryRow } from './db.js'
import { syncStoryJsonFromRow } from './jsonStore.js'

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'local-dev-only-change-in-production'
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PORT = Number(process.env.API_PORT || 4318)
const UPLOAD_DIR = path.join(ROOT, 'data', 'uploads')
const LEARNERS_DIR = path.join(UPLOAD_DIR, 'learners')

fs.mkdirSync(LEARNERS_DIR, { recursive: true })

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: LEARNERS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg'
      cb(null, `${req.params.id}${safeExt}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'))
      return
    }
    cb(null, true)
  },
})

const app = express()
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    etag: true,
    lastModified: true,
    maxAge: 0,
  }),
)

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.SUPABASE_URL ? 'supabase-configured' : 'local-preview',
    adminConfigured: Boolean(getAdminCredentials()),
  })
})

app.get('/api/stories/version', (_req, res) => {
  const db = getDb()
  const row = db
    .prepare(`SELECT MAX(updated_at) AS version, COUNT(*) AS count FROM stories`)
    .get() as { version: string | null; count: number }
  res.json({
    version: row.version ?? null,
    count: row.count,
  })
})

app.get('/api/stories', (_req, res) => {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT * FROM stories WHERE publication_status = 'published' ORDER BY featured DESC, display_order ASC, name ASC`,
    )
    .all() as StoryRow[]
  res.json(rows.map(rowToPublicStory))
})

app.get('/api/stories/:slug', (req, res) => {
  const db = getDb()
  const row = db
    .prepare(`SELECT * FROM stories WHERE slug = ? AND publication_status = 'published'`)
    .get(req.params.slug) as StoryRow | undefined
  if (!row) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(rowToPublicStory(row))
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' })
    return
  }
  if (!getAdminCredentials()) {
    res.status(503).json({ error: 'Admin credentials not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD.' })
    return
  }
  const ok = await verifyAdminLogin(email, password)
  if (!ok) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  const token = signAdminToken(email)
  setSessionCookie(res, token)
  res.json({ ok: true })
})

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const session = readSession(req)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.json({ email: session.email })
})

app.get('/api/admin/stories', (req, res) => {
  if (!requireAdmin(req, res)) return
  const db = getDb()
  const rows = db.prepare(`SELECT * FROM stories ORDER BY name ASC`).all() as StoryRow[]
  res.json(rows.map(rowToPrivateStory))
})

app.get('/api/admin/stories/:id', (req, res) => {
  if (!requireAdmin(req, res)) return
  const db = getDb()
  const row = db.prepare(`SELECT * FROM stories WHERE id = ?`).get(req.params.id) as StoryRow | undefined
  if (!row) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(rowToPrivateStory(row))
})

app.post('/api/admin/stories/:id/photo', (req, res, next) => {
  if (!requireAdmin(req, res)) return
  photoUpload.single('photo')(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' })
      return
    }
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }
    const db = getDb()
    const photoUrl = `/uploads/learners/${req.file.filename}`
    db.prepare(
      `UPDATE stories SET photo_url = ?, updated_at = ? WHERE id = ?`,
    ).run(photoUrl, new Date().toISOString(), req.params.id)
    const row = db.prepare(`SELECT * FROM stories WHERE id = ?`).get(req.params.id) as StoryRow | undefined
    if (!row) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    syncStoryJsonFromRow(row)
    res.json(rowToPrivateStory(row))
  })
})

app.put('/api/admin/stories/:id', (req, res) => {
  if (!requireAdmin(req, res)) return
  const body = req.body as Record<string, unknown>
  const db = getDb()
  const existing = db.prepare(`SELECT id FROM stories WHERE id = ?`).get(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const fields = {
    name: body.name,
    photo_url: body.photoUrl ?? null,
    email: body.email ?? null,
    linkedin_url: body.linkedInUrl ?? null,
    domain: body.domain ?? null,
    domain_category: body.domainCategory ?? null,
    job_role: body.jobRole ?? null,
    achievement_type: body.achievementType ?? null,
    achievement_title: body.achievementTitle ?? null,
    quantified_result: body.quantifiedResult ?? null,
    story_summary: body.storySummary ?? null,
    short_summary: body.shortSummary ?? null,
    testimonial_quote: body.testimonialQuote ?? null,
    youtube_video_url: body.youtubeVideoUrl ?? null,
    audit_status: body.auditStatus ?? null,
    publication_status: body.publicationStatus ?? 'draft',
    featured: body.featured ? 1 : 0,
    display_order: body.displayOrder ?? null,
    email_publish_allowed: body.emailPublishAllowed ? 1 : 0,
    updated_at: new Date().toISOString(),
  }

  db.prepare(
    `UPDATE stories SET
      name = @name, photo_url = @photo_url, email = @email, linkedin_url = @linkedin_url,
      domain = @domain, domain_category = @domain_category, job_role = @job_role,
      achievement_type = @achievement_type, achievement_title = @achievement_title,
      quantified_result = @quantified_result, story_summary = @story_summary,
      short_summary = @short_summary, testimonial_quote = @testimonial_quote,
      youtube_video_url = @youtube_video_url, audit_status = @audit_status,
      publication_status = @publication_status, featured = @featured,
      display_order = @display_order, email_publish_allowed = @email_publish_allowed,
      updated_at = @updated_at
    WHERE id = @id`,
  ).run({ ...fields, id: req.params.id })

  const row = db.prepare(`SELECT * FROM stories WHERE id = ?`).get(req.params.id) as StoryRow
  syncStoryJsonFromRow(row)
  res.json(rowToPrivateStory(row))
})

app.listen(PORT, () => {
  console.log(`be10X API (local preview) listening on http://127.0.0.1:${PORT}`)
})
