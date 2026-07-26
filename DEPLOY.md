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

## Rolling back

Old images stay in GHCR tagged by commit SHA. To roll back, on L340:
```
docker compose pull backend  # or manually retag an older SHA as :latest in GHCR
docker compose up -d
```
Note: rolling back the *app* does not roll back the *database schema*. If the bad release included a migration, rolling back the image alone won't undo it — restore from the `wilik-data` backup taken in the cutover step (or a fresh one) if that happens.
