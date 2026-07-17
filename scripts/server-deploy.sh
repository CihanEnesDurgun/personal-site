#!/bin/bash
#
# SUNUCUDA calisir — cPanel Terminal'den (Araclar > Terminal).
# Bu script SENIN BILGISAYARINDA calismaz.
#
# Ne yapar:  GitHub'dan son surumu ceker, sonra cPanel'in deploy mekanizmasini
#            tetikler (.cpanel.yml calisir: dosyalari kopyalar, npm ci, restart).
#
# Kullanim (cPanel Terminal'de):
#   bash ~/repositories/personal-site/scripts/server-deploy.sh
#
# Neden SSH yok: Paylasimli pakette SSH kapali, yalnizca cPanel Terminal var.
# Bu yuzden "yerelden cPanel'e push" degil, "sunucudan GitHub'dan pull" akisi kullanilir.

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/repositories/personal-site}"
BRANCH="${BRANCH:-main}"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "HATA: git deposu bulunamadi: $REPO_DIR"
  echo "Once cPanel > Git Version Control ile depoyu olustur."
  exit 1
fi

cd "$REPO_DIR"

echo "==> GitHub'dan cekiliyor ($BRANCH)..."
# --ff-only: sunucuda yerel commit olmamali; olursa merge yerine acikca hata versin
git pull --ff-only origin "$BRANCH"

echo
echo "==> Son commit:"
git --no-pager log -1 --format='    %h  %s  (%an, %ar)'

echo
echo "==> cPanel deploy tetikleniyor (.cpanel.yml calisacak)..."
if uapi VersionControlDeployment create repository_root="$REPO_DIR"; then
  echo
  echo "Deploy kuyruga alindi. Durumu su komutla gorebilirsin:"
  echo "  uapi VersionControlDeployment retrieve repository_root=$REPO_DIR"
  echo
  echo "Not: Deploy birkac saniye surebilir. Ardindan siteyi kontrol et."
else
  echo
  echo "UYARI: uapi ile tetiklenemedi."
  echo "Alternatif: cPanel > Git Version Control > Manage > Deploy HEAD Commit"
  exit 1
fi
