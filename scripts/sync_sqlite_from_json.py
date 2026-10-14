#!/usr/bin/env python3
"""Sync SQLite story rows from data/private-stories.json (after import)."""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / "data" / "private-stories.json"
DB = ROOT / "data" / "stories.db"

UPSERT_SQL = """
INSERT INTO stories (
  id, slug, name, photo_url, email, linkedin_url, domain, domain_category,
  job_role, achievement_type, achievement_title, quantified_result,
  story_summary, short_summary, testimonial_quote, youtube_video_url,
  source_sheet, source_row, source_date, audit_status, publication_status,
  featured, display_order, email_publish_allowed, updated_at
) VALUES (
  :id, :slug, :name, :photo_url, :email, :linkedin_url, :domain, :domain_category,
  :job_role, :achievement_type, :achievement_title, :quantified_result,
  :story_summary, :short_summary, :testimonial_quote, :youtube_video_url,
  :source_sheet, :source_row, :source_date, :audit_status, :publication_status,
  :featured, :display_order, :email_publish_allowed, :updated_at
)
ON CONFLICT(id) DO UPDATE SET
  slug = excluded.slug,
  name = excluded.name,
  photo_url = excluded.photo_url,
  email = excluded.email,
  linkedin_url = excluded.linkedin_url,
  domain = excluded.domain,
  domain_category = excluded.domain_category,
  job_role = excluded.job_role,
  achievement_type = excluded.achievement_type,
  achievement_title = excluded.achievement_title,
  quantified_result = excluded.quantified_result,
  story_summary = excluded.story_summary,
  short_summary = excluded.short_summary,
  testimonial_quote = excluded.testimonial_quote,
  youtube_video_url = excluded.youtube_video_url,
  source_sheet = excluded.source_sheet,
  source_row = excluded.source_row,
  source_date = excluded.source_date,
  audit_status = excluded.audit_status,
  publication_status = excluded.publication_status,
  featured = excluded.featured,
  display_order = excluded.display_order,
  email_publish_allowed = excluded.email_publish_allowed,
  updated_at = excluded.updated_at
"""


def row_from_record(rec: dict[str, Any], updated_at: str) -> dict[str, Any]:
    return {
        "id": rec["id"],
        "slug": rec.get("slug") or rec["id"],
        "name": rec["name"],
        "photo_url": rec.get("photoUrl"),
        "email": rec.get("email"),
        "linkedin_url": rec.get("linkedInUrl"),
        "domain": rec.get("domain"),
        "domain_category": rec.get("domainCategory"),
        "job_role": rec.get("jobRole"),
        "achievement_type": rec.get("achievementType"),
        "achievement_title": rec.get("achievementTitle"),
        "quantified_result": rec.get("quantifiedResult"),
        "story_summary": rec.get("storySummary"),
        "short_summary": rec.get("shortSummary"),
        "testimonial_quote": rec.get("testimonialQuote"),
        "youtube_video_url": rec.get("youtubeVideoUrl"),
        "source_sheet": rec["sourceSheet"],
        "source_row": rec["sourceRow"],
        "source_date": rec.get("sourceDate"),
        "audit_status": rec.get("auditStatus"),
        "publication_status": rec.get("publicationStatus") or "draft",
        "featured": 1 if rec.get("featured") else 0,
        "display_order": rec.get("displayOrder"),
        "email_publish_allowed": 1 if rec.get("emailPublishAllowed") else 0,
        "updated_at": updated_at,
    }


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
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
        """
    )


def main() -> None:
    if not PRIVATE.exists():
        raise SystemExit("Missing private-stories.json — run import_excel.py first")

    records = json.loads(PRIVATE.read_text(encoding="utf-8"))
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    ensure_schema(conn)

    now = datetime.now(timezone.utc).isoformat()
    ids = {rec["id"] for rec in records}
    for rec in records:
        conn.execute(UPSERT_SQL, row_from_record(rec, now))

    placeholders = ",".join("?" for _ in ids)
    if ids:
        conn.execute(f"DELETE FROM stories WHERE id NOT IN ({placeholders})", tuple(ids))
    else:
        conn.execute("DELETE FROM stories")

    conn.commit()
    with_photo = sum(1 for r in records if r.get("photoUrl"))
    db_photo = conn.execute(
        "SELECT COUNT(*) FROM stories WHERE photo_url IS NOT NULL AND photo_url != ''"
    ).fetchone()[0]
    total = conn.execute("SELECT COUNT(*) FROM stories").fetchone()[0]
    conn.close()
    print(
        f"Synced {len(records)} records to {DB} "
        f"(rows in DB: {total}, photo_url in JSON: {with_photo}, photo_url in DB: {db_photo})"
    )


if __name__ == "__main__":
    main()
