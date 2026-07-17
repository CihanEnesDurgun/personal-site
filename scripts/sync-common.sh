#!/bin/bash
# content-pull.sh / content-push.sh / backup-data.sh tarafindan ortak kullanilir.
# Tek isi: deploy.config'i yukleyip dogrulamak ve SSH yardimcilarini tanimlamak.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/deploy.config"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "HATA: deploy.config bulunamadi."
  echo "Cozum:  cp deploy.config.example deploy.config   ve sunucu bilgilerini doldur."
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

for var in CPANEL_HOST CPANEL_USER CPANEL_SSH_PORT CPANEL_APP_DIR; do
  if [ -z "${!var:-}" ]; then
    echo "HATA: deploy.config icinde $var tanimli degil."
    exit 1
  fi
done

SSH_TARGET="$CPANEL_USER@$CPANEL_HOST"

remote() {
  ssh -p "$CPANEL_SSH_PORT" "$SSH_TARGET" "$@"
}

# Passenger'i yeniden baslatir. Uygulama dosyalari 5 dakika onbellekte tuttugu icin
# icerik degisiklikleri restart olmadan geç yansir.
restart_app() {
  echo "Uygulama yeniden baslatiliyor..."
  remote "mkdir -p '$CPANEL_APP_DIR/tmp' && touch '$CPANEL_APP_DIR/tmp/restart.txt'"
}

confirm() {
  local prompt="$1"
  read -r -p "$prompt [e/H] " answer
  case "$answer" in
    [eE]|[eE][vV][eE][tT]) return 0 ;;
    *) echo "Iptal edildi."; return 1 ;;
  esac
}
