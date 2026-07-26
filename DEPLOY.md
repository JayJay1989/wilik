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

Beyond the local `.bak` copy `entrypoint.sh` makes before every migration (same disk, protects against a bad migration only), the `backup` service in `docker-compose.yml` makes an automatic **off-site** backup: a consistent SQLite snapshot (via `sqlite3 .backup`, safe to take while the app is running), gzipped, and uploaded via [rclone](https://rclone.org) to any destination you choose — Dropbox, Google Drive, S3, a NAS over SFTP/SMB, and 70+ others, all through the same mechanism.

One-time setup, identical regardless of which destination you pick:

1. Run the rclone setup wizard once, anywhere with a terminal and (for cloud destinations) a browser:
   ```
   docker run -it --rm -v "$(pwd)/rclone.conf:/config/rclone/rclone.conf" rclone/rclone config
   ```
   Pick a backend, give it a name (e.g. `mydropbox`). Cloud backends open a browser to log in; if you're doing this on a headless machine, use rclone's own [headless setup guide](https://rclone.org/remote_setup/) instead (do the login step on any other device with a browser).
2. Copy the `rclone.conf` file this produces next to `docker-compose.yml` on L340. It contains your storage credentials, so it's gitignored -- never commit it.
3. In `.env`, set `RCLONE_REMOTE=<name-from-step-1>:wilik-backup` (e.g. `mydropbox:wilik-backup`).
4. Optionally set `NOTIFY_WEBHOOK_URL` to a push-notification webhook (e.g. an [ntfy.sh](https://ntfy.sh) topic URL) — if a backup fails, the `backup` container posts a message there. Without it, failures only show up in `docker logs backup`.
5. `docker compose up -d`.

Runs daily by default (`BACKUP_INTERVAL_HOURS`, default `24`) and keeps 30 days of backups both locally (in the `wilik-backup-staging` volume) and at the remote (`BACKUP_RETENTION_DAYS`) — both configurable via `.env`.

## Rolling back

Old images stay in GHCR tagged by commit SHA. To roll back, on L340:
```
docker compose pull backend  # or manually retag an older SHA as :latest in GHCR
docker compose up -d
```
Note: rolling back the *app* does not roll back the *database schema*. If the bad release included a migration, rolling back the image alone won't undo it — restore from the `wilik-data` backup taken in the cutover step (or a fresh one) if that happens.
