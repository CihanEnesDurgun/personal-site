#!/bin/bash
# Sunucudaki data/ klasorunu (yorumlar, istatistikler, tema, kullanicilar) bu
# bilgisayara yedekler. Sadece indirir — sunucuda hicbir seyi degistirmez.
#
# Bu veriler git'te DEGIL ve deploy sirasinda hic dokunulmuyor; tek kopyalari
# sunucuda. Ara sira calistirmakta fayda var.

source "$(dirname "${BASH_SOURCE[0]}")/_sync-common.sh"

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$ROOT_DIR/backups/$STAMP"

mkdir -p "$DEST"

echo "Yedekleniyor: $SSH_TARGET:$CPANEL_APP_DIR/data  ->  backups/$STAMP/"
remote "cd '$CPANEL_APP_DIR' && tar czf - data" | tar xzf - -C "$DEST"

echo
echo "Tamamlandi: backups/$STAMP/data"
echo "Not: users.json admin sifre hash'ini icerir — bu yedegi paylasma."
