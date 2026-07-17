# Değişiklik Günlüğü

Bu projedeki tüm önemli değişiklikler bu dosyada tutulur.

Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) standardına,
sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına dayanır.
Her sürümün ayrıntılı notları [`docs/release-notes/`](docs/release-notes/) altındadır.

## [Yayınlanmamış]

### Güvenlik
- Dokümantasyonda "örnek" olarak duran gerçek `JWT_SECRET` değeri kaldırıldı ve rotate
  edildi. Repo public olduğu için bu anahtar açıktaydı; anahtarı bilen biri şifre bilmeden
  admin oturum token'ı üretebilirdi.
- `scripts/setup-users.js` içindeki gömülü admin şifresi kaldırıldı; artık
  `DEFAULT_ADMIN_PASSWORD` ortam değişkeninden okunuyor ve tanımlı değilse script duruyor.
- `/api/webhook/deploy` endpoint'i kaldırıldı. `GITHUB_WEBHOOK_SECRET` tanımlı değilken
  imza doğrulaması atlandığı için, internetteki herhangi biri sahte bir push isteğiyle
  sunucuda deploy script'i çalıştırabiliyordu. Uygulamada artık shell çalıştırma yeteneği yok.
- `users.json` okunamadığında production'da rastgele şifreli, diske yazılmayan bir "hayalet
  admin" üretiliyordu: kimse giriş yapamaz ama sistem çalışıyor görünürdü. Artık açıkça
  reddediyor ve çözümü logluyor.
- `npm run setup` artık hassas dosyaların git'te izlenip izlenmediğini kontrol ediyor
  (önceki kontrol yol karşılaştırması hatası yüzünden hiç çalışmıyordu).

### Eklendi
- cPanel push-to-deploy yapılandırması (`.cpanel.yml`): `git push` → otomatik `npm ci` →
  Passenger restart. Dışarıya açık deploy tetikleyicisi yok.
- İçerik senkronizasyon araçları: `npm run content:pull`, `content:push`, `backup:data`.
- `CLAUDE.md`: proje kuralları ve mimari özet.
- `docs/deployment/cpanel-deploy.md`, `docs/guides/release-process.md`.

### Değiştirildi
- Sürüm numaralarından araç ekleri (`-cla`, `.anti`, `.crs`) kaldırıldı; sürüm artık düz
  SemVer (`0.1.13`). Sürüm notları `docs/version-notes/` → `docs/release-notes/` taşındı.
- `package.json` `engines.node`: `>=14` → `>=20.19`. Önceki değer yanlıştı; `jsdom` en az
  20.19, `marked` en az 20 gerektiriyor.
- `env.example` koddaki gerçek kullanımla eşitlendi.
- `.cursorrules` → `CLAUDE.md`; sürüm süreci `docs/guides/release-process.md`'ye taşındı.

### Kaldırıldı
- `config.json`: server bu dosyayı hiç okumuyordu; içindeki domain/CORS ayarları `.env`
  ile çelişerek yanıltıyordu.
- `scripts/deploy.sh`: hardcoded yol içeriyordu ve `pkill`/`nohup` ile Passenger'ın
  yönettiği süreci bozuyordu.
- `.github/workflows/deploy.yml`: devre dışı ama elle çalıştırılabilir haldeydi; aynı
  Passenger sorununu ve Node 18'i taşıyordu.
- Çöp dosyalar: `_diff.txt`, `walkthrough.md.resolved`, `test-marked.js`.

## [0.1.13] - 2026-07 — *Projeler Bölümü*

Siteye "Projeler" bölümü eklendi: kendi liste ve detay sayfası, yönetim arayüzü ve editör
modu. Proje kartlarında GitHub linguist çubuğuna benzer dil/teknoloji yüzdeleri; detay
sayfasında otomatik kayan galeri, kod örneği modalı ve canlı GitHub API repo kartı.
→ [Ayrıntılar](docs/release-notes/0.1.13.md)

## [0.1.12] - 2026-07 — *Güvenlik Denetimi*

Kapsamlı güvenlik analizi. En kritik bulgu: `express.static('.')` kullanımı proje kökünün
tamamını (kaynak kod, admin şifre hash'i, oturum verileri, loglar, `.git/`) herkese açık
hale getiriyordu — allowlist tabanlı statik sunuma geçildi. Taslak yazıların halka açık
sayfadan sızması ve çöp kutusunun hiç boşalmaması giderildi.
→ [Ayrıntılar](docs/release-notes/0.1.12.md)

## [0.1.11] - 2026-05

Akademik kaynakça (footnote) sistemi, admin panelde "Taslağa Çek", JWT decoding hatası
düzeltmesi ve session cleanup akışının dayanıklılaştırılması.
→ [Ayrıntılar](docs/release-notes/0.1.11.md)

## [0.1.10] - 2026-04

Admin dashboard kart tasarımı (tablo → grid), dropdown aksiyon menüsü, genişletilmiş
filtreler ve markdown editöründe görsel kaybı hatasının giderilmesi.
→ [Ayrıntılar](docs/release-notes/0.1.10.md)

## [0.1.9] - 2026-03

Trafik kaynağı izleme (`document.referrer` ile platform ayrıştırma) ve hero bölümü
içerik/meta revizyonu.
→ [Ayrıntılar](docs/release-notes/0.1.9.md)

## [0.1.8] - 2026-02-28 — *Stat Premium*

Admin panel istatistikler sekmesinin görselleştirme odaklı yeniden tasarımı.
→ [Ayrıntılar](docs/release-notes/0.1.8.md)

## [0.1.7] - 2026-02-28 — *Prism Resize*

Editörde görsel boyutlandırma (Markdown çıktısında korunarak) ve "Dark First" tasarıma geçiş.
→ [Ayrıntılar](docs/release-notes/0.1.7.md)

## [0.1.6] - 2026-02-27 — *Eclipse Editor*

Markdown editör hata düzeltmeleri, ana sayfa modernizasyonu ve karanlık temaya hareketli
arka plan.
→ [Ayrıntılar](docs/release-notes/0.1.6.md)

## [0.1.5] - 2026-02-25 — *Nebula Craft*

Markdown editörün profesyonelleştirilmesi, UI tazeleme ve hata kodlarının standardizasyonu.
→ [Ayrıntılar](docs/release-notes/0.1.5.md)

## [0.1.4] - 2026-02-24 — *Prism Guard*

RFC 7807 uyumlu hata yönetimi, görsel kimlik yenileme ve kod kalitesi iyileştirmeleri.
→ [Ayrıntılar](docs/release-notes/0.1.4.md)

## [0.1.3] - 2026-02-23 — *Obsidian Shield*

Dokümantasyon, kritik güvenlik açıklarının giderilmesi ve sürüm yönetiminin otomatikleştirilmesi.
→ [Ayrıntılar](docs/release-notes/0.1.3.md)

## [0.1.0] - 2025-11-19 — *Genesis Core*

İlk sürüm: modüler mimari ve core API servisleri. Vanilla JS + Node.js tabanlı, dış
bağımlılığı minimize edilmiş blog ekosistemi.
→ [Ayrıntılar](docs/release-notes/0.1.0.md)
