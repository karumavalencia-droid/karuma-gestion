#!/bin/bash
# Wrapper para la tarea programada (launchd) que descarga facturas de Gmail
# y las sube a Supabase. Corre en modo no interactivo (nunca abre navegador).
set -euo pipefail

PROJECT_DIR="/Users/karuma/Projects/karuma-gestion"
LOG="$HOME/Library/Logs/karuma-facturas.log"

cd "$PROJECT_DIR"
echo "===== $(date '+%Y-%m-%d %H:%M:%S') inicio =====" >> "$LOG"
/usr/bin/python3 scripts/gmail_facturas.py --non-interactive >> "$LOG" 2>&1
echo "===== $(date '+%Y-%m-%d %H:%M:%S') fin (exit $?) =====" >> "$LOG"
