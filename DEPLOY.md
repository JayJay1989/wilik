# Deploying Wilik

## Normal release flow

1. Push to `main`.
2. GitHub Actions (`.github/workflows/build-and-push.yml`) builds the backend and frontend images and pushes them to GHCR, tagged `latest` and with the commit SHA.
3. Watchtower on the production host polls GHCR every 5 minutes (`WATCHTOWER_POLL_INTERVAL`). When it sees a new `latest` image for `backend` or `frontend`, it pulls it and restarts that container.
4. On every backend start, `entrypoint.sh` backs up the SQLite file, runs `flask db upgrade` (applies any new migrations), then runs `flask bootstrap-db` (a no-op unless the database is empty) before starting gunicorn. No manual steps needed for schema changes going forward.

No local Docker build is required to ship a change — just push to `main`.

## One-time production cutover (L340)

This only needs to happen once, to move the existing production deployment onto this new setup. Do this carefully, not unattended.

1. **Back up the `wilik-data` volume** before touching anything.
2. Make sure the GHCR packages (`wilik-backend`, `wilik-frontend`) are set to **Public** in GitHub's package settings, so L340 can pull them without registry credentials.
3. Copy the updated `docker-compose.yml` and your `.env` (with `SECRET_KEY`) to L340.
4. Run the initial migration **stamp**, once, before starting the stack normally:
   ```
   docker compose run --rm backend flask db stamp head
   ```
   This tells Alembic "the database already matches this migration" without trying to re-create tables that already exist from the old `db.create_all()` setup. Skipping this step and letting the normal entrypoint run `flask db upgrade` first would fail, since it would try to `CREATE TABLE` on tables that are already there.
5. Start everything normally:
   ```
   docker compose up -d
   ```
   This brings up `backend`, `frontend`, and `watchtower`.
6. Verify the app loads and existing data (users, wishlists) is intact.
7. Check Watchtower is watching the right containers:
   ```
   docker logs watchtower
   ```

## Reverse proxy / environment-specific config

`docker-compose.yml` is meant to stay generic and shared. If you route Wilik through your own reverse proxy (Traefik, Caddy, nginx-proxy, ...), put that config in a `docker-compose.override.yml` file instead -- it's gitignored, meant to hold your own setup, and Compose loads it automatically alongside `docker-compose.yml` with no extra flags. See `docker-compose.override.yml.example` for a Traefik-based template.

## Backups

Off-site backups are **optional** -- the `backup` service sits behind a Compose profile and is skipped entirely by a plain `docker compose up -d`. When enabled, it makes an automatic off-site backup: it stops the `backend` container briefly (for a consistent snapshot -- see the `docker-volume-backup.stop-during-backup` label on `backend`), archives the `wilik-data` volume, and uploads it to an S3-compatible bucket using [offen/docker-volume-backup](https://github.com/offen/docker-volume-backup). This uses static credentials (access key + secret key), not an OAuth login, so setup is just filling in `.env` -- no browser flow, no expiring tokens to manage.

Setup:

1. Create (or reuse) an S3-compatible bucket. Any provider works (AWS S3, Backblaze B2, MinIO, ...); a distinct `AWS_S3_PATH` (see below) keeps it separate from anything else already in that bucket.
2. In `.env`, set:
   ```
   BACKUP_S3_BUCKET=your-bucket-name
   BACKUP_S3_ACCESS_KEY_ID=your-access-key-id
   BACKUP_S3_SECRET_ACCESS_KEY=your-secret-access-key
   ```
   If you're not using AWS itself, also set `BACKUP_S3_ENDPOINT` to your provider's S3 endpoint.
3. Optionally set `BACKUP_NOTIFICATION_URL` to get notified if a backup fails, e.g. for [ntfy](https://ntfy.sh): `ntfy://ntfy.sh/your-topic-name` (or `ntfy://user:pass@your-host/topic` if self-hosted). Any [shoutrrr](https://containrrr.dev/shoutrrr/) service works the same way.
4. Start it with the `backup` profile enabled:
   ```
   docker compose --profile backup up -d
   ```
   (A plain `docker compose up -d`, without `--profile backup`, leaves it out entirely -- e.g. if you set up backups later, or never want them.)

Runs daily at 03:00 by default (`BACKUP_CRON_EXPRESSION`) and keeps 30 days of backups (`BACKUP_RETENTION_DAYS`), both configurable via `.env`. Backups land under the `wilik/` path in your bucket.

## Rolling back

Old images stay in GHCR tagged by commit SHA. To roll back, on L340:
```
docker compose pull backend  # or manually retag an older SHA as :latest in GHCR
docker compose up -d
```
Note: rolling back the *app* does not roll back the *database schema*. If the bad release included a migration, rolling back the image alone won't undo it — restore from the `wilik-data` backup taken in the cutover step (or a fresh one) if that happens.
