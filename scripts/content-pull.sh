#!/bin/bash
# SUNUCUDAKI icerigi bu bilgisayara indirir (sunucu -> yerel).
#
# Ne zaman calistirmali:
#   - Yerelde yazi/proje duzenlemeye baslamadan ONCE (yoksa panelden yayinladiklarini ezersin)
#   - Panelden yayinladiklarini git'e yedeklemek icin (indir, sonra commit'le)
#
# UYARI: yereldeki content/ ve images/ dosyalarinin uzerine yazar.

source "$(dirname "${BASH_SOURCE[0]}")/_sync-common.sh"

echo "Sunucudan icerik indirilecek:"
echo "  Kaynak : $SSH_TARGET:$CPANEL_APP_DIR/{content,images}"
echo "  Hedef  : $ROOT_DIR/{content,images}  (uzerine yazilir)"
echo

if ! git -C "$ROOT_DIR" diff --quiet -- content images 2>/dev/null; then
  echo "DIKKAT: content/ veya images/ altinda commit'lenmemis degisikliklerin var."
  echo "Indirme bunlari kaybettirebilir. Once commit'lemen onerilir."
  confirm "Yine de devam edilsin mi?" || exit 1
fi

echo "Indiriliyor..."
remote "cd '$CPANEL_APP_DIR' && tar czf - content images" | tar xzf - -C "$ROOT_DIR"

echo
echo "Tamamlandi. Degisiklikleri gormek icin: git status"
echo "Icerigi git'e yedeklemek icin:  git add content images && git commit -m 'content: sunucudan senkron'"
