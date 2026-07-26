#!/bin/sh
set -u

RCLONE_REMOTE="${RCLONE_REMOTE:?set RCLONE_REMOTE in .env, e.g. mydropbox:wilik-backup}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
NOTIFY_WEBHOOK_URL="${NOTIFY_WEBHOOK_URL:-}"

notify_failure() {
  echo "BACKUP FAILED: $1" >&2
  if [ -n "$NOTIFY_WEBHOOK_URL" ]; then
    curl -fsS -d "Wilik backup failed: $1" "$NOTIFY_WEBHOOK_URL" >/dev/null 2>&1 || true
  fi
}

run_backup() {
  ts=$(date +%Y%m%d%H%M%S)
  snapshot="/staging/wilik-backup-$ts.db"

  # sqlite3's own online backup API -- safe to run against a live WAL-mode
  # database without stopping the app, unlike a raw file copy.
  if ! sqlite3 /source/wilik.db ".backup '$snapshot'"; then
    notify_failure "sqlite3 .backup failed"
    return 1
  fi

  if ! gzip -f "$snapshot"; then
    notify_failure "gzip failed"
    return 1
  fi

  if ! rclone copy "$snapshot.gz" "$RCLONE_REMOTE"; then
    notify_failure "rclone copy to $RCLONE_REMOTE failed"
    return 1
  fi

  find /staging -name 'wilik-backup-*.db.gz' -mtime "+$RETENTION_DAYS" -delete
  rclone delete "$RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" || true

  echo "Backup completed: $snapshot.gz"
}

while true; do
  run_backup
  sleep "$((INTERVAL_HOURS * 3600))"
done
