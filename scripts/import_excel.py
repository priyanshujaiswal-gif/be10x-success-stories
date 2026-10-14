#!/usr/bin/env python3
"""Import Be10x success stories from Excel into structured JSON + duplicate report."""
from __future__ import annotations

import json
import os
import re
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "uploads" / "Testimonial_YT_Audit_abea.xlsx"
XLSX_GOOGLE = ROOT / "uploads" / "Testimonial_YT_Audit_google.xlsx"
GOOGLE_SHEET_ID = os.environ.get(
    "GOOGLE_SHEET_ID", "1v1Xdv1nYVBylCJz4nHkAllod3NGDriNTmXWHdHwiw2U"
)
OUT_PRIVATE = ROOT / "data" / "private-stories.json"
OUT_PUBLIC = ROOT / "data" / "public-stories.json"
OUT_REPORT = ROOT / "reports" / "duplicate-report.json"
OUT_META = ROOT / "reports" / "import-meta.json"

SHEETS = ["Vishesh", "Saurabh", "Vivek"]
SHEET_ORDER = {"Vishesh": 0, "Saurabh": 1, "Vivek": 2}
SUMEET_SLUG = "sumeet-patidar-vishesh-2"
SUMEET_DISPLAY_ORDER = 195

HEADER_ALIASES: dict[str, list[str]] = {
    "date": ["date"],
    "name": ["name"],
    "photo": ["photo"],
    "email": ["email"],
    "linkedInUrl": ["linkedin"],
    "domain": ["domain"],
    "domainCategory": ["domain drop-down", "domain drop"],
    "jobRole": ["job role"],
    "achievementType": ["achievement type"],
    "achievementTitle": ["achievement title"],
    "quantifiedResult": ["quantified result"],
    "storyOriginal": ["story (original)"],
    "transcript": ["transcript"],
    "storySummary": ["70-100 words summary"],
    "shortSummary": ["20 words summary"],
    "testimonialQuote": ["key testimonial quote"],
    "youtubeVideoUrl": ["youtube video link"],
    "auditStatus": ["audit status"],
    "lmsUpload": ["lms upload"],
    "remarks": ["remarks"],
}


def norm_header(h: Any) -> str:
    if h is None:
        return ""
    return re.sub(r"\s+", " ", str(h).strip().lower())


def map_headers(row: tuple[Any, ...]) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for idx, cell in enumerate(row):
        nh = norm_header(cell)
        if not nh:
            continue
        for key, aliases in HEADER_ALIASES.items():
            if nh in aliases and key not in mapping:
                mapping[key] = idx
    return mapping


def cell_val(row: tuple[Any, ...], mapping: dict[str, int], key: str) -> Any:
    idx = mapping.get(key)
    if idx is None or idx >= len(row):
        return None
    v = row[idx]
    if v is None:
        return None
    if isinstance(v, str) and not v.strip():
        return None
    return v


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text or "story"


def normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    e = str(email).strip().lower()
    return e if "@" in e else None


def normalize_linkedin(url: str | None) -> str | None:
    if not url:
        return None
    u = str(url).strip()
    if not u:
        return None
    u = u.split("?")[0].rstrip("/").lower()
    u = u.replace("http://", "https://")
    if "linkedin.com" not in u:
        return u
    m = re.search(r"linkedin\.com/in/([^/]+)", u)
    if m:
        return f"https://www.linkedin.com/in/{m.group(1)}"
    return u


def zip_media_count(path: Path) -> int:
    try:
        with zipfile.ZipFile(path) as z:
            return sum(1 for name in z.namelist() if name.startswith("xl/media/"))
    except Exception:
        return 0


def download_google_workbook() -> Path:
    url = f"https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/export?format=xlsx"
    print(f"Downloading workbook with photos from Google Sheets ({GOOGLE_SHEET_ID})…")
    XLSX_GOOGLE.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, XLSX_GOOGLE)
    if zip_media_count(XLSX_GOOGLE) < 1:
        raise SystemExit("Downloaded workbook has no embedded images.")
    return XLSX_GOOGLE


def resolve_workbook(fetch_google: bool = False, workbook: Path | None = None) -> Path:
    """Prefer a workbook that contains embedded photos (Google Sheets export)."""
    if workbook is not None:
        if not workbook.exists():
            raise SystemExit(f"Missing workbook: {workbook}")
        return workbook
    if fetch_google:
        return download_google_workbook()
    candidates = [p for p in (XLSX, XLSX_GOOGLE) if p.exists()]
    if candidates:
        best = max(candidates, key=zip_media_count)
        if zip_media_count(best) > 0:
            return best
    return download_google_workbook()


def sanitize_photo_cell(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, float):
        return None
    s = str(v).strip()
    if not s:
        return None
    lowered = s.lower()
    if lowered in {"no image", "no pp", "page not found", "n/a", "na"}:
        return None
    if s.startswith("http://") or s.startswith("https://"):
        return s
    return None


def serialize_value(v: Any) -> Any:
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, str):
        return v.strip()
    return v


def row_has_data(row: tuple[Any, ...]) -> bool:
    return any(c is not None and str(c).strip() for c in row)


def make_id(name: str, sheet: str, row: int) -> str:
    base = f"{slugify(name)}-{sheet.lower()}-{row}"
    return base


def records_to_public(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    public_records: list[dict[str, Any]] = []
    for rec in records:
        pub = {k: v for k, v in rec.items() if k not in ("email", "emailPublishAllowed", "remarks", "lmsUpload")}
        if not rec.get("emailPublishAllowed"):
            pub.pop("email", None)
        public_records.append(pub)
    return public_records


def assign_display_orders(records: list[dict[str, Any]]) -> None:
    """Number published stories; keep Sumeet Patidar near the middle of the directory."""
    published = sorted(
        [r for r in records if r.get("publicationStatus") == "published"],
        key=lambda r: (SHEET_ORDER.get(str(r.get("sourceSheet")), 9), r.get("sourceRow") or 0),
    )
    sumeet = next((r for r in published if r.get("slug") == SUMEET_SLUG), None)
    rest = [r for r in published if r.get("slug") != SUMEET_SLUG]
    insert_at = min(max(SUMEET_DISPLAY_ORDER - 1, 0), len(rest))
    ordered = rest[:insert_at] + ([sumeet] if sumeet else []) + rest[insert_at:]
    for i, rec in enumerate(ordered, start=1):
        rec["displayOrder"] = i
    for rec in records:
        if rec.get("publicationStatus") != "published":
            rec["displayOrder"] = None


def score_for_featured(rec: dict[str, Any]) -> int:
    score = 0
    if rec.get("quantifiedResult"):
        score += 3
    if rec.get("storySummary"):
        score += 2
    if rec.get("testimonialQuote"):
        score += 1
    if rec.get("youtubeVideoUrl"):
        score += 1
    if rec.get("photoUrl"):
        score += 1
    if rec.get("auditStatus", "").lower() == "done":
        score += 2
    return score


def run_import(workbook_path: Path) -> None:
    if not workbook_path.exists():
        raise SystemExit(f"Missing workbook: {workbook_path}")

    wb = openpyxl.load_workbook(workbook_path, read_only=True, data_only=True)
    records: list[dict[str, Any]] = []
    sheet_stats: dict[str, int] = {}

    for sheet_name in SHEETS:
        if sheet_name not in wb.sheetnames:
            raise SystemExit(f"Missing sheet: {sheet_name}")
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            sheet_stats[sheet_name] = 0
            continue
        header_row = rows[0]
        mapping = map_headers(header_row)
        count = 0
        for row_num, row in enumerate(rows[1:], start=2):
            if not row_has_data(row):
                continue
            name = cell_val(row, mapping, "name")
            if not name:
                continue
            name_str = str(name).strip()
            rec_id = make_id(name_str, sheet_name, row_num)
            source_date = serialize_value(cell_val(row, mapping, "date"))
            audit = serialize_value(cell_val(row, mapping, "auditStatus")) or ""
            publication = "published" if str(audit).lower() == "done" else "draft"

            rec = {
                "id": rec_id,
                "slug": rec_id,
                "name": name_str,
                "photoUrl": sanitize_photo_cell(cell_val(row, mapping, "photo")),
                "email": serialize_value(cell_val(row, mapping, "email")),
                "linkedInUrl": serialize_value(cell_val(row, mapping, "linkedInUrl")),
                "domain": serialize_value(cell_val(row, mapping, "domain")),
                "domainCategory": serialize_value(cell_val(row, mapping, "domainCategory")),
                "jobRole": serialize_value(cell_val(row, mapping, "jobRole")),
                "achievementType": serialize_value(cell_val(row, mapping, "achievementType")),
                "achievementTitle": serialize_value(cell_val(row, mapping, "achievementTitle")),
                "quantifiedResult": serialize_value(cell_val(row, mapping, "quantifiedResult")),
                "storySummary": serialize_value(cell_val(row, mapping, "storySummary")),
                "shortSummary": serialize_value(cell_val(row, mapping, "shortSummary")),
                "testimonialQuote": serialize_value(cell_val(row, mapping, "testimonialQuote")),
                "youtubeVideoUrl": serialize_value(cell_val(row, mapping, "youtubeVideoUrl")),
                "sourceSheet": sheet_name,
                "sourceRow": row_num,
                "sourceDate": source_date,
                "auditStatus": audit,
                "publicationStatus": publication,
                "featured": False,
                "displayOrder": None,
                "emailPublishAllowed": False,
                "lmsUpload": serialize_value(cell_val(row, mapping, "lmsUpload")),
                "remarks": serialize_value(cell_val(row, mapping, "remarks")),
            }
            records.append(rec)
            count += 1
        sheet_stats[sheet_name] = count

    # Feature top stories
    published = [r for r in records if r["publicationStatus"] == "published"]
    ranked = sorted(published, key=score_for_featured, reverse=True)
    for i, rec in enumerate(ranked[:6]):
        rec["featured"] = True

    assign_display_orders(records)

    # Duplicates
    by_email: dict[str, list[str]] = defaultdict(list)
    by_linkedin: dict[str, list[str]] = defaultdict(list)
    by_name: dict[str, list[str]] = defaultdict(list)

    for rec in records:
        e = normalize_email(rec.get("email"))
        if e:
            by_email[e].append(rec["id"])
        li = normalize_linkedin(rec.get("linkedInUrl"))
        if li:
            by_linkedin[li].append(rec["id"])
        name_key = re.sub(r"\s+", " ", rec["name"].strip().lower())
        by_name[name_key].append(rec["id"])

    duplicate_groups: list[dict[str, Any]] = []

    def add_groups(kind: str, groups: dict[str, list[str]]) -> None:
        for key, ids in groups.items():
            if len(ids) > 1:
                duplicate_groups.append(
                    {"type": kind, "key": key, "recordIds": ids, "count": len(ids)}
                )

    add_groups("email", by_email)
    add_groups("linkedin", by_linkedin)
    add_groups("name", by_name)

    OUT_PRIVATE.parent.mkdir(parents=True, exist_ok=True)
    OUT_REPORT.parent.mkdir(parents=True, exist_ok=True)

    # Extract embedded photos from xlsx drawings (Google Sheets in-cell images)
    import sys

    sys.path.insert(0, str(ROOT / "scripts"))
    from extract_photos_from_xlsx import export_photos

    photo_report = export_photos(workbook_path, records)

    public_records = records_to_public(records)

    with OUT_PRIVATE.open("w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    with OUT_PUBLIC.open("w", encoding="utf-8") as f:
        json.dump(public_records, f, ensure_ascii=False, indent=2)

    meta = {
        "workbook": str(workbook_path),
        "sheets": sheet_stats,
        "totalSourceRows": sum(sheet_stats.values()),
        "uniqueRecords": len(records),
        "publishedCount": sum(1 for r in records if r["publicationStatus"] == "published"),
        "draftCount": sum(1 for r in records if r["publicationStatus"] == "draft"),
        "featuredCount": sum(1 for r in records if r["featured"]),
        "duplicateGroupCount": len(duplicate_groups),
        "photoImport": photo_report,
    }

    with OUT_REPORT.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "summary": meta,
                "duplicateGroups": duplicate_groups,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    with OUT_META.open("w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(json.dumps(meta, indent=2))


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Import success stories from Excel into JSON")
    parser.add_argument(
        "--fetch-google",
        action="store_true",
        help="Always download the latest Google Sheets export (ignores local copies)",
    )
    parser.add_argument(
        "--workbook",
        type=Path,
        default=None,
        help="Use a specific .xlsx path instead of resolving automatically",
    )
    args = parser.parse_args()
    workbook_path = resolve_workbook(fetch_google=args.fetch_google, workbook=args.workbook)
    run_import(workbook_path)


if __name__ == "__main__":
    main()
