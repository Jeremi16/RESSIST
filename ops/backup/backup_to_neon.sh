#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/ops/backup/.env"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

: "${LOCAL_DB_URL:?LOCAL_DB_URL is required}"
: "${NEON_DB_URL:?NEON_DB_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/resisst}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%F)"
DUMP_FILE="${BACKUP_DIR}/resisst_${TIMESTAMP}.dump"
LIST_FILE="${DUMP_FILE}.list"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

mkdir -p "${BACKUP_DIR}"

notify_failure() {
  local message="$1"
  echo "[ERROR] ${message}" | tee -a "${LOG_FILE}"

  if [[ -n "${WEBHOOK_URL:-}" ]]; then
    curl -sS -X POST "${WEBHOOK_URL}" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"resisst backup failed: ${message}\"}" >/dev/null || true
  fi
}

trap 'notify_failure "backup script failed at line ${LINENO}"' ERR

{
  echo "[$(date -Iseconds)] starting backup"

  echo "[$(date -Iseconds)] dumping local database"
  pg_dump "${LOCAL_DB_URL}" -Fc -Z9 -f "${DUMP_FILE}"

  echo "[$(date -Iseconds)] validating dump file"
  pg_restore --list "${DUMP_FILE}" > "${LIST_FILE}"

  echo "[$(date -Iseconds)] restoring into Neon backup database"
  pg_restore --clean --if-exists --no-owner --no-privileges -d "${NEON_DB_URL}" "${DUMP_FILE}"

  echo "[$(date -Iseconds)] writing checksum"
  sha256sum "${DUMP_FILE}" > "${DUMP_FILE}.sha256"

  echo "[$(date -Iseconds)] applying retention policy"
  find "${BACKUP_DIR}" -type f -name "resisst_*.dump" -mtime +"${RETENTION_DAYS}" -delete
  find "${BACKUP_DIR}" -type f -name "resisst_*.dump.sha256" -mtime +"${RETENTION_DAYS}" -delete
  find "${BACKUP_DIR}" -type f -name "resisst_*.dump.list" -mtime +"${RETENTION_DAYS}" -delete

  echo "[$(date -Iseconds)] backup finished successfully"
} | tee -a "${LOG_FILE}"
