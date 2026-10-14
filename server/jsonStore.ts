import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StoryRow } from './db.js'
import { rowToPrivateStory } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PRIVATE_PATH = path.join(ROOT, 'data', 'private-stories.json')
const PUBLIC_PATH = path.join(ROOT, 'data', 'public-stories.json')

type JsonStory = Record<string, unknown>

function readPrivateRecords(): JsonStory[] {
  if (!fs.existsSync(PRIVATE_PATH)) {
    return []
  }
  return JSON.parse(fs.readFileSync(PRIVATE_PATH, 'utf-8')) as JsonStory[]
}

function toPublicRecord(rec: JsonStory): JsonStory {
  const pub: JsonStory = { ...rec }
  delete pub.remarks
  delete pub.lmsUpload
  if (!rec.emailPublishAllowed) {
    delete pub.email
  }
  delete pub.emailPublishAllowed
  return pub
}

function writeJsonFiles(records: JsonStory[]) {
  fs.mkdirSync(path.dirname(PRIVATE_PATH), { recursive: true })
  fs.writeFileSync(PRIVATE_PATH, JSON.stringify(records, null, 2), 'utf-8')
  const publicRecords = records.map(toPublicRecord)
  fs.writeFileSync(PUBLIC_PATH, JSON.stringify(publicRecords, null, 2), 'utf-8')
}

function adminRowToJsonPatch(row: StoryRow, existing: JsonStory | undefined): JsonStory {
  const story = rowToPrivateStory(row)
  const patch: JsonStory = {
    id: story.id,
    slug: story.slug,
    name: story.name,
    photoUrl: story.photoUrl,
    email: story.email,
    linkedInUrl: story.linkedInUrl,
    domain: story.domain,
    domainCategory: story.domainCategory,
    jobRole: story.jobRole,
    achievementType: story.achievementType,
    achievementTitle: story.achievementTitle,
    quantifiedResult: story.quantifiedResult,
    storySummary: story.storySummary,
    shortSummary: story.shortSummary,
    testimonialQuote: story.testimonialQuote,
    youtubeVideoUrl: story.youtubeVideoUrl,
    sourceSheet: story.sourceSheet,
    sourceRow: story.sourceRow,
    sourceDate: story.sourceDate,
    auditStatus: story.auditStatus,
    publicationStatus: story.publicationStatus,
    featured: story.featured,
    displayOrder: story.displayOrder,
    emailPublishAllowed: story.emailPublishAllowed,
  }
  if (existing) {
    if ('lmsUpload' in existing) patch.lmsUpload = existing.lmsUpload
    if ('remarks' in existing) patch.remarks = existing.remarks
  }
  return patch
}

/** Persist admin edits (SQLite is source of truth) back into JSON exports. */
export function syncStoryJsonFromRow(row: StoryRow): void {
  const records = readPrivateRecords()
  const idx = records.findIndex((r) => r.id === row.id)
  const existing = idx >= 0 ? records[idx] : undefined
  const merged = adminRowToJsonPatch(row, existing)
  if (idx >= 0) {
    records[idx] = { ...existing, ...merged }
  } else {
    records.push(merged)
  }
  writeJsonFiles(records)
}
