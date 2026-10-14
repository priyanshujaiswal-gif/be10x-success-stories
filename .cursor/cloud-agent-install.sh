#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci

if ! python3 -c 'import openpyxl' 2>/dev/null; then
  if python3 -m pip install openpyxl --break-system-packages 2>/dev/null; then
    :
  else
    python3 -m pip install --user openpyxl
    export PYTHONPATH="${HOME}/.local/lib/python3.12/site-packages:${PYTHONPATH:-}"
  fi
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

# Local committed workbook can lack valid drawing rels; Google export has embedded photos.
python3 scripts/import_excel.py --fetch-google
python3 scripts/sync_sqlite_from_json.py
