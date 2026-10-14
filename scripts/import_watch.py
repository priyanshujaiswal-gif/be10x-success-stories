#!/usr/bin/env python3
"""Poll Google Sheets export and re-import when the workbook changes."""
from __future__ import annotations

import hashlib
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTERVAL_SEC = int(os.environ.get("IMPORT_WATCH_INTERVAL_SEC", "300"))
STATE_PATH = ROOT / "data" / ".import-watch-state.json"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run_pipeline(workbook: Path) -> None:
    py = sys.executable
    subprocess.run(
        [py, str(ROOT / "scripts" / "import_excel.py"), "--workbook", str(workbook)],
        check=True,
        cwd=ROOT,
    )
    subprocess.run([py, str(ROOT / "scripts" / "sync_sqlite_from_json.py"], check=True, cwd=ROOT)


def main() -> None:
    sys.path.insert(0, str(ROOT / "scripts"))
    from import_excel import XLSX_GOOGLE, download_google_workbook

    print(
        f"Watching Google Sheet export every {INTERVAL_SEC}s "
        f"(IMPORT_WATCH_INTERVAL_SEC). Ctrl+C to stop."
    )
    last_hash: str | None = None
    if STATE_PATH.exists():
        try:
            import json

            last_hash = json.loads(STATE_PATH.read_text(encoding="utf-8")).get("workbookSha256")
        except Exception:
            last_hash = None

    while True:
        try:
            workbook = download_google_workbook()
            digest = sha256_file(workbook)
            if digest != last_hash:
                print(f"Workbook changed ({XLSX_GOOGLE.name}) — running import + SQLite sync…")
                run_pipeline(workbook)
                STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
                STATE_PATH.write_text(
                    __import__("json").dumps(
                        {"workbookSha256": digest, "workbook": str(workbook)},
                        indent=2,
                    ),
                    encoding="utf-8",
                )
                last_hash = digest
            else:
                print(f"No workbook change ({workbook.name}); skipping import.")
        except KeyboardInterrupt:
            print("\nStopped.")
            return
        except subprocess.CalledProcessError as exc:
            print(f"Import pipeline failed (exit {exc.returncode}); will retry.", file=sys.stderr)
        except Exception as exc:
            print(f"Watch error: {exc}", file=sys.stderr)

        time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    main()
