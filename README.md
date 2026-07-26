<p align="center">
  <img src="frontend/public/favicon-readme.svg" width="80" alt="Wilik logo">
</p>

# Wilik

A self-hosted wishlist app. Each user keeps a list of things they want, shares it via a link that works for anyone who has it (or opts into the browsable directory so people can find it without one), and visitors can claim items or mark them as purchased without needing an account.

## What it does

- 📝 **Personal wishlists** with price, brand, and notes per item. Paste a product URL and it'll try to auto-fill title, image, and price.
- 🔗 **Share via a link** that works for anyone who has it (not published or searchable anywhere), or add it to the **browsable directory** so people can find it without one. No login required either way, opt out per user or switch off site-wide.
- 🤫 **Claiming**: visitors can claim an item so others know it's taken, without revealing who claimed it to the list owner. The surprise stays intact.
- 🛠️ **Admin panel** for managing users and resetting passwords.
- 🌓 **Light/dark theme**, with dark as the default (as it should be).

## Running it

Wilik is meant to be self-hosted: your data stays on your server, not on someone else's registry quietly logging what everyone wants for their birthday.

### With Docker

```
cp .env.example .env   # set a real SECRET_KEY
docker compose up -d
```

The app is served on port 8090. Push to `main` and GitHub Actions builds fresh images automatically. Watchtower picks them up and rolls them out, so shipping an update is just `git push`, not a maintenance window. See [DEPLOY.md](DEPLOY.md) for the full deployment and release process.

### For development

Backend is Flask + SQLAlchemy + SQLite, with Flask-Migrate handling schema changes. Frontend is React + Vite. You'll need Python 3.13+ and Node 22+.

```
# backend
cd backend
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe app.py

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Or, from the repo root, `npm run dev` starts both at once.

The first run creates an admin account (`Admin` / `admin`). You'll be asked to set a real username and password the first time you log in.

## License

MIT, see [LICENSE](LICENSE).
