#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/os-a2z}"
ENV_FILE="/etc/os-a2z/api.env"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script with sudo."
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-venv python3-pip podman git
install -d -m 0750 /etc/os-a2z
if [[ ! -f "$ENV_FILE" ]]; then
  install -m 0600 "$APP_ROOT/deploy/.env.production.example" "$ENV_FILE"
  echo "Created $ENV_FILE. Replace its placeholders, then rerun this script."
  exit 2
fi

python3 -m venv "$APP_ROOT/.venv"
"$APP_ROOT/.venv/bin/pip" install --upgrade pip
"$APP_ROOT/.venv/bin/pip" install -e "$APP_ROOT/apps/api"
podman build -t os-a2z-linux-sandbox:latest "$APP_ROOT/apps/api/sandbox"
set -a
. "$ENV_FILE"
set +a
cd "$APP_ROOT/apps/api"
"$APP_ROOT/.venv/bin/alembic" upgrade head
install -m 0644 "$APP_ROOT/deploy/os-a2z-api.service" /etc/systemd/system/os-a2z-api.service
systemctl daemon-reload
systemctl enable --now os-a2z-api.service
systemctl --no-pager --full status os-a2z-api.service
curl --fail --silent http://127.0.0.1:8000/api/v1/health
echo
