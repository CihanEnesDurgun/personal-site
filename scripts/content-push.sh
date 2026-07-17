#!/bin/bash
# YERELDEKI icerigi sunucuya gonderir (yerel -> sunucu).
#
# Ne zaman calistirmali:
#   - Yazi/projeyi yerelde yazdiysan ve canliya almak istiyorsan.
#
# UYARI: Bu komut, sunucudaki ayni isimli dosyalarin uzerine yazar.
# Panelden yayinladigin ama yerelde olmayan bir yaziyi EZMEMEK icin once
# `npm run content:pull` calistirmis olman gerekir.
#
# Not: tar sadece gonderilen dosyalarin uzerine yazar; sunucuda olup yerelde
# olmayan dosyalar SILINMEZ.

source "$(dirname "${BASH_SOURCE[0]}")/sync-common.sh"

echo "Yerel icerik sunucuya gonderilecek:"
echo "  Kaynak : $ROOT_DIR/{content,images}"
echo "  Hedef  : $SSH_TARGET:$CPANEL_APP_DIR/{content,images}  (uzerine yazilir)"
echo
echo "Son 'content:pull' zamanini hatirla — sunucuda daha yeni bir yazi varsa ezilebilir."
confirm "Devam edilsin mi?" || exit 1

echo "Gonderiliyor..."
tar czf - -C "$ROOT_DIR" content images | remote "cd '$CPANEL_APP_DIR' && tar xzf -"

restart_app

echo
echo "Tamamlandi. Site guncellendi."
