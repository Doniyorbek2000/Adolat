#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

DB_NAME="${POSTGRES_DB:-adolat_ai}"
DB_USER="${POSTGRES_USER:-postgres}"

echo "Restoring from $1 to database $DB_NAME"
gunzip -c "$1" | docker exec -i adolat_postgres psql -U "$DB_USER" -d "$DB_NAME"
echo "Restore complete"
