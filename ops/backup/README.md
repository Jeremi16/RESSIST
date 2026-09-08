# Backup to Neon

Daily backup job that dumps local PostgreSQL and restores it to Neon backup database.

## Setup

1. Create env file:

```bash
cp .env.example .env
```

2. Fill `LOCAL_DB_URL` and `NEON_DB_URL`.

3. Make script executable:

```bash
chmod +x backup_to_neon.sh
```

4. Register cron from `crontab.example`:

```bash
crontab -e
```

and add:

```text
0 0 * * * /opt/ressist/ops/backup/backup_to_neon.sh >> /var/log/ressist_backup.log 2>&1
```

## What the script does

- `pg_dump -Fc -Z9` from local PostgreSQL
- `pg_restore --list` validation
- `pg_restore --clean --if-exists` into Neon backup DB
- checksum file generation
- retention cleanup for old dumps
- optional webhook alert on failure
