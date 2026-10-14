import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DB_PATH = process.env.DATABASE_PATH || path.join(ROOT, 'data', 'stories.db')
const SEED_PATH = path.join(ROOT, 'data', 'private-stories.json')

export type StoryRow = {
  id: string
  slug: string
  name: string
  photo_url: string | null
  email: string | null
  linkedin_url: string | null
  domain: string | null
  domain_category: string | null
  job_role: string | null
  achievement_type: string | null
  achievement_title: string | null
  quantified_result: string | null
  story_summary: string | null
  short_summary: string | null
  testimonial_quote: string | null
  youtube_video_url: string | null
  source_sheet: string
  source_row: number
  source_date: string | null
  audit_status: string | null
  publication_status: string
  featured: number
  display_order: number | null
  email_publish_allowed: number
  updated_at: string
}

let db: Database.Database | null = null

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      photo_url TEXT,
      email TEXT,
      linkedin_url TEXT,
      domain TEXT,
      domain_category TEXT,
      job_role TEXT,
      achievement_type TEXT,
      achievement_title TEXT,
      quantified_result TEXT,
      story_summary TEXT,
      short_summary TEXT,
      testimonial_quote TEXT,
      youtube_video_url TEXT,
      source_sheet TEXT NOT NULL,
      source_row INTEGER NOT NULL,
      source_date TEXT,
      audit_status TEXT,
      publication_status TEXT NOT NULL DEFAULT 'draft',
      featured INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER,
      email_publish_allowed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stories_pub ON stories(publication_status);
    CREATE INDEX IF NOT EXISTS idx_stories_featured ON stories(featured, display_order);
  `)
}

function seedIfEmpty(database: Database.Database) {
  const count = database.prepare('SELECT COUNT(*) as c FROM stories').get() as { c: number }
  if (count.c > 0) return

  if (!fs.existsSync(SEED_PATH)) {
    console.warn('No seed file at', SEED_PATH)
    return
  }

  const raw = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')) as Record<string, unknown>[]
  const insert = database.prepare(`
    INSERT INTO stories (
      id, slug, name, photo_url, email, linkedin_url, domain, domain_category,
      job_role, achievement_type, achievement_title, quantified_result,
      story_summary, short_summary, testimonial_quote, youtube_video_url,
      source_sheet, source_row, source_date, audit_status, publication_status,
      featured, display_order, email_publish_allowed, updated_at
    ) VALUES (
      @id, @slug, @name, @photo_url, @email, @linkedin_url, @domain, @domain_category,
      @job_role, @achievement_type, @achievement_title, @quantified_result,
      @story_summary, @short_summary, @testimonial_quote, @youtube_video_url,
      @source_sheet, @source_row, @source_date, @audit_status, @publication_status,
      @featured, @display_order, @email_publish_allowed, @updated_at
    )
  `)

  const now = new Date().toISOString()
  const tx = database.transaction((rows: Record<string, unknown>[]) => {
    for (const r of rows) {
      insert.run({
        id: r.id,
        slug: r.slug ?? r.id,
        name: r.name,
        photo_url: r.photoUrl ?? null,
        email: r.email ?? null,
        linkedin_url: r.linkedInUrl ?? null,
        domain: r.domain ?? null,
        domain_category: r.domainCategory ?? null,
        job_role: r.jobRole ?? null,
        achievement_type: r.achievementType ?? null,
        achievement_title: r.achievementTitle ?? null,
        quantified_result: r.quantifiedResult ?? null,
        story_summary: r.storySummary ?? null,
        short_summary: r.shortSummary ?? null,
        testimonial_quote: r.testimonialQuote ?? null,
        youtube_video_url: r.youtubeVideoUrl ?? null,
        source_sheet: r.sourceSheet,
        source_row: r.sourceRow,
        source_date: r.sourceDate ?? null,
        audit_status: r.auditStatus ?? null,
        publication_status: r.publicationStatus ?? 'draft',
        featured: r.featured ? 1 : 0,
        display_order: r.displayOrder ?? null,
        email_publish_allowed: r.emailPublishAllowed ? 1 : 0,
        updated_at: now,
      })
    }
  })
  tx(raw)
  console.log(`Seeded ${raw.length} stories into SQLite`)
}

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initSchema(db)
    seedIfEmpty(db)
  }
  return db
}

export function rowToPrivateStory(row: StoryRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    photoUrl: row.photo_url,
    email: row.email,
    linkedInUrl: row.linkedin_url,
    domain: row.domain,
    domainCategory: row.domain_category,
    jobRole: row.job_role,
    achievementType: row.achievement_type,
    achievementTitle: row.achievement_title,
    quantifiedResult: row.quantified_result,
    storySummary: row.story_summary,
    shortSummary: row.short_summary,
    testimonialQuote: row.testimonial_quote,
    youtubeVideoUrl: row.youtube_video_url,
    sourceSheet: row.source_sheet,
    sourceRow: row.source_row,
    sourceDate: row.source_date,
    auditStatus: row.audit_status,
    publicationStatus: row.publication_status,
    featured: Boolean(row.featured),
    displayOrder: row.display_order,
    emailPublishAllowed: Boolean(row.email_publish_allowed),
    updatedAt: row.updated_at,
  }
}

export function rowToPublicStory(row: StoryRow) {
  const base = rowToPrivateStory(row)
  const { email, emailPublishAllowed, ...rest } = base
  return {
    ...rest,
    ...(emailPublishAllowed && email ? { email } : {}),
  }
}
