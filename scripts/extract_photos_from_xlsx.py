#!/usr/bin/env python3
"""Extract learner photos embedded in Excel (Google Sheets export) into data/uploads/learners/."""
from __future__ import annotations

import json
import re
import shutil
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "uploads" / "learners"
REPORT_PATH = ROOT / "reports" / "photo-import.json"

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}
RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

# Photo column 0-based index per sheet (from drawing anchors in Google export)
PHOTO_COL_BY_SHEET = {
    "Vishesh": 2,
    "Saurabh": 2,
    "Vivek": 3,  # Vivek sheet: Photo is column D (no dedicated header on older exports)
}


def norm_path(base: str, target: str) -> str:
    parts = (base + "/" + target).replace("\\", "/").split("/")
    out: list[str] = []
    for p in parts:
        if p == "..":
            if out:
                out.pop()
        elif p and p != ".":
            out.append(p)
    return "/".join(out)


def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text or "story"


def make_id(name: str, sheet: str, row: int) -> str:
    return f"{slugify(name)}-{sheet.lower()}-{row}"


def load_name_for_row(z: zipfile.ZipFile, sheet_path: str, excel_row: int) -> str | None:
    """Read name from column B (index 1) for a given 1-based Excel row."""
    root = ET.fromstring(z.read(sheet_path))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    target = f"{excel_row}"
    for row_el in root.findall(".//m:sheetData/m:row", ns):
        if row_el.get("r") == target:
            for c in row_el.findall("m:c", ns):
                ref = c.get("r", "")
                if not ref.startswith("B"):
                    continue
                v = c.find("m:v", ns)
                if v is not None and v.text:
                    return v.text.strip()
                is_el = c.find("m:is", ns)
                if is_el is not None:
                    t = is_el.find(".//m:t", ns)
                    if t is not None and t.text:
                        return t.text.strip()
    return None


def anchor_row_col(anchor: ET.Element) -> tuple[int, int] | None:
    """0-based column and row from a drawing anchor (oneCell or twoCell)."""
    tag = anchor.tag.split("}")[-1]
    if tag not in ("oneCellAnchor", "twoCellAnchor"):
        return None
    frm = anchor.find("xdr:from", NS)
    if frm is None:
        return None
    col_el = frm.find("xdr:col", NS)
    row_el = frm.find("xdr:row", NS)
    if col_el is None or row_el is None or col_el.text is None or row_el.text is None:
        return None
    return int(col_el.text), int(row_el.text)


def photo_col_matches(sheet_name: str, col: int) -> bool:
    expected = PHOTO_COL_BY_SHEET.get(sheet_name)
    if expected is None:
        return False
    return col == expected


def extract_photo_map(xlsx_path: Path) -> dict[tuple[str, int], str]:
    """Returns (sheet_name, excel_row) -> media path inside zip."""
    mapping: dict[tuple[str, int], str] = {}
    skipped_wrong_col: list[dict[str, Any]] = []
    with zipfile.ZipFile(xlsx_path) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        wbrels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid_to_target = {rel.get("Id"): rel.get("Target") for rel in wbrels.findall("rel:Relationship", NS)}

        for sheet_el in wb.findall(".//main:sheet", NS):
            sheet_name = sheet_el.get("name")
            if sheet_name not in PHOTO_COL_BY_SHEET:
                continue
            photo_col = PHOTO_COL_BY_SHEET[sheet_name]
            rid = sheet_el.get(f"{{{RNS}}}id")
            sheet_path = norm_path("xl", rid_to_target[rid])
            sheet_rels_path = sheet_path.replace("worksheets/", "worksheets/_rels/") + ".rels"
            srels = ET.fromstring(z.read(sheet_rels_path))
            drawing_path = None
            for rel in srels.findall("rel:Relationship", NS):
                if rel.get("Type", "").endswith("/drawing"):
                    drawing_path = norm_path("xl/worksheets", rel.get("Target"))
            if not drawing_path:
                continue

            drels_path = drawing_path.replace("xl/drawings/", "xl/drawings/_rels/").replace(
                ".xml", ".xml.rels"
            )
            drels = ET.fromstring(z.read(drels_path))
            embed_map = {
                rel.get("Id"): norm_path("xl/drawings", rel.get("Target"))
                for rel in drels.findall("rel:Relationship", NS)
            }

            root = ET.fromstring(z.read(drawing_path))
            for anchor in list(root):
                pos = anchor_row_col(anchor)
                if pos is None:
                    continue
                col, row = pos
                pic = anchor.find(".//xdr:pic", NS)
                if pic is None:
                    continue
                blip = pic.find(".//a:blip", NS)
                if blip is None:
                    continue
                embed = blip.get(f"{{{RNS}}}embed")
                media = embed_map.get(embed)
                if not media:
                    continue
                excel_row = row + 1  # drawing row is 0-based; row 1 = Excel line 2
                if not photo_col_matches(sheet_name, col):
                    skipped_wrong_col.append(
                        {"sheet": sheet_name, "excelRow": excel_row, "col": col, "expectedCol": photo_col}
                    )
                    continue
                mapping[(sheet_name, excel_row)] = media
    extract_photo_map.last_skipped_wrong_col = skipped_wrong_col  # type: ignore[attr-defined]
    return mapping


def resolve_record(
    sheet_name: str,
    excel_row: int,
    by_key: dict[tuple[str, int], dict[str, Any]],
    by_sheet_name: dict[str, list[dict[str, Any]]],
    z: zipfile.ZipFile,
    sheet_path: str,
) -> dict[str, Any] | None:
    rec = by_key.get((sheet_name, excel_row))
    if rec:
        return rec
    name = load_name_for_row(z, sheet_path, excel_row)
    if not name:
        return None
    norm = name.strip().lower()
    candidates = [r for r in by_sheet_name.get(sheet_name, []) if r["name"].strip().lower() == norm]
    if len(candidates) == 1:
        return candidates[0]
    rid = make_id(name, sheet_name, excel_row)
    for r in candidates:
        if r["id"] == rid:
            return r
    return None


def export_photos(xlsx_path: Path, records: list[dict[str, Any]]) -> dict[str, Any]:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    photo_map = extract_photo_map(xlsx_path)
    skipped_wrong_col = getattr(extract_photo_map, "last_skipped_wrong_col", [])
    by_key = {(r["sourceSheet"], r["sourceRow"]): r for r in records}
    by_sheet_name: dict[str, list[dict[str, Any]]] = {}
    for r in records:
        by_sheet_name.setdefault(r["sourceSheet"], []).append(r)

    extracted = 0
    missing = 0
    unmapped_anchors: list[dict[str, Any]] = []
    matched_by_name = 0

    with zipfile.ZipFile(xlsx_path) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        wbrels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid_to_target = {rel.get("Id"): rel.get("Target") for rel in wbrels.findall("rel:Relationship", NS)}
        sheet_paths = {}
        for sheet_el in wb.findall(".//main:sheet", NS):
            name = sheet_el.get("name")
            if name not in PHOTO_COL_BY_SHEET:
                continue
            rid = sheet_el.get(f"{{{RNS}}}id")
            sheet_paths[name] = norm_path("xl", rid_to_target[rid])

        for (sheet, row), media_path in photo_map.items():
            rec = resolve_record(sheet, row, by_key, by_sheet_name, z, sheet_paths[sheet])
            if not rec:
                unmapped_anchors.append({"sheet": sheet, "excelRow": row, "media": media_path})
                continue
            if (sheet, row) not in by_key:
                matched_by_name += 1
            ext = Path(media_path).suffix.lower() or ".jpg"
            filename = f"{rec['id']}{ext}"
            dest = OUT_DIR / filename
            with z.open(media_path) as src, open(dest, "wb") as out:
                shutil.copyfileobj(src, out)
            rec["photoUrl"] = f"/uploads/learners/{filename}"
            extracted += 1

    for rec in records:
        if not rec.get("photoUrl"):
            missing += 1

    report = {
        "xlsx": str(xlsx_path),
        "anchorsFound": len(photo_map),
        "photosExtracted": extracted,
        "recordsWithoutPhoto": missing,
        "unmappedAnchors": unmapped_anchors,
        "matchedByNameFallback": matched_by_name,
        "skippedWrongColumn": skipped_wrong_col,
        "outputDir": str(OUT_DIR),
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with REPORT_PATH.open("w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    return report


def main() -> None:
    import sys

    if len(sys.argv) > 1:
        xlsx = Path(sys.argv[1])
    else:
        from import_excel import resolve_workbook

        xlsx = resolve_workbook()
    private = ROOT / "data" / "private-stories.json"
    if not private.exists():
        raise SystemExit("Run import_excel.py first")
    records = json.loads(private.read_text(encoding="utf-8"))
    report = export_photos(xlsx, records)
    private.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    from import_excel import records_to_public

    (ROOT / "data" / "public-stories.json").write_text(
        json.dumps(records_to_public(records), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
