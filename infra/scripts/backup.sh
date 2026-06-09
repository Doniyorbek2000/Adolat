#!/bin/bash
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="${POSTGRES_DB:-adolat_ai}"
DB_USER="${POSTGRES_USER:-postgres}"

mkdir -p "$BACKUP_DIR"

echo "Starting backup: $DATE"
docker exec adolat_postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Keep last 7 days
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR/db_$DATE.sql.gz"
