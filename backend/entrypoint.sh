#!/bin/sh
set -e

if [ -f /app/instance/wilik.db ]; then
  cp /app/instance/wilik.db "/app/instance/wilik.db.bak.$(date +%Y%m%d%H%M%S)"
fi

flask db upgrade
flask bootstrap-db

exec gunicorn --preload --bind 0.0.0.0:5000 --workers 2 app:app
