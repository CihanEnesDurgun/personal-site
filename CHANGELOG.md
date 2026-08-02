# Değişiklik Günlüğü

Bu projedeki tüm önemli değişiklikler bu dosyada tutulur.

Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) standardına,
sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına dayanır.
Her sürümün ayrıntılı notları [`docs/release-notes/`](docs/release-notes/) altındadır.

## [Yayınlanmamış]

## [0.2.1] - 2026-08-02 — *İlk Canlı Deploy*

Proje ilk kez git tabanlı deploy hattıyla yayına alındı. Sunucuda o güne kadar zip ile
elle yüklenmiş, aylar öncesine ait bir sürüm çalışıyordu. cPanel'de Git Version Control
deposu oluşturuldu, `scripts/server-deploy.sh` ile ilk deploy yapıldı ve deploy'un
`content/`, `images/`, `data/` klasörlerine dokunmadığı canlı ortamda doğrulandı.

Kurulum sırasında iki durum ortaya çıktı: sunucuda `.env` dosyası yok — zorunlu ortam
değişkenleri cPanel'in Setup Node.js App ekranında tutuluyor; ve `content/projects.json`
sunucuda hiç oluşmamıştı (projeler özelliği eski sürümde yoktu), elle oluşturuldu.

### Düzeltildi
- Sayfalar açılırken bir an açık temada parlayıp sonra koyuya dönüyordu. Koyu tema
  yalnızca `<html>` etiketine `dark` sınıfı eklenince devreye giriyordu, o sınıfı ekleyen
  JavaScript ise sayfa çizildikten ve `/api/theme` isteği tamamlandıktan sonra
  çalışıyordu. Artık her sayfanın `<head>` bölümünde, ilk boyamadan önce çalışan küçük
  bir betik sınıfı yerleştiriyor. Ziyaretçinin açık tema tercihi korunur.
- `applyThemeVariables()` sunucudan gelen temayı uygularken `--bg`, `--ink` gibi
  değişkenlere koşulsuz olarak **açık** renkleri yazıyordu. Bunlar satır içi stil olduğu
  için CSS'teki `:root.dark` kuralını da eziyor ve koyu tema seçiliyken bile araya bir
  açık kare sokuyordu. Artık aktif temanın renkleri yazılıyor.
→ [Ayrıntılar](docs/release-notes/0.2.1.md)

## [0.2.0] - 2026-07-17 — *Yayına Hazırlık*

cPanel'e ilk yayın öncesi kapsamlı güvenlik denetimi ve deploy altyapısı kurulumu.

### Güvenlik
- **Kritik:** Dokümantasyonda "örnek" olarak duran gerçek `JWT_SECRET` değeri public
  repo'da açıktaydı; kaldırıldı ve rotate edildi. Bu anahtarı bilen biri şifre bilmeden
  admin oturum token'ı üretebilirdi.
- **Kritik:** `content/posts.json` ve `content/*/*.md` statik olarak herkese açık
  sunulduğu için yayınlanmamış (taslak) yazılar kimlik doğrulaması olmadan okunabiliyordu;
  `?preview=true` bir URL parametresiydi, kimlik doğrulaması değildi. Artık bu rotalar
  sunucu tarafında filtreleniyor: yetkisiz istekte taslaklar 404/gizli, admin token'ıyla
  önizleme çalışmaya devam ediyor.
- `/api/webhook/deploy` endpoint'i kaldırıldı. `GITHUB_WEBHOOK_SECRET` tanımlı değilken
  imza doğrulaması atlandığı için, internetteki herhangi biri sahte bir push isteğiyle
  sunucuda deploy script'i çalıştırabiliyordu. Uygulamada artık shell çalıştırma yeteneği yok.
- `scripts/setup-users.js` içindeki gömülü admin şifresi kaldırıldı; artık
  `DEFAULT_ADMIN_PASSWORD` ortam değişkeninden okunuyor ve tanımlı değilse script duruyor.
- `users.json` okunamadığında production'da rastgele şifreli, diske yazılmayan bir "hayalet
  admin" üretiliyordu: kimse giriş yapamaz ama sistem çalışıyor görünürdü. Artık açıkça
  reddediyor ve çözümü logluyor.
- `npm run setup` artık hassas dosyaların git'te izlenip izlenmediğini kontrol ediyor
  (önceki kontrol yol karşılaştırması hatası yüzünden hiç çalışmıyordu).

### Eklendi
- cPanel deploy altyapısı: `.cpanel.yml` (kod dosyalarını kopyalar, `npm ci`, Passenger
  restart) ve `scripts/server-deploy.sh` (cPanel Terminal'den `git pull` + deploy tetikler).
  Hosting SSH sağlamadığı için akış "sunucudan GitHub'dan pull" şeklindedir.
- `scripts/content-pull.js`: sitenin HTTP arayüzü üzerinden içerik indirir (SSH gerekmez).
  Admin girişi yapılırsa taslaklar da iner; anonim kullanımda yereldeki taslaklar korunur,
  üzerine yazılmaz.
- `src/js/meta-tags.js`: yazı/proje sayfalarına sekme başlığı ve paylaşım (og:/twitter:)
  meta etiketleri. Önceden tüm yazılar aynı statik başlığı paylaşıyordu.
- `CLAUDE.md`: proje kuralları ve mimari özet.
- `docs/deployment/cpanel-deploy.md`, `docs/guides/release-process.md`.

### Değiştirildi
- Sürüm numaralarından araç ekleri (`-cla`, `.anti`, `.crs`) kaldırıldı; sürüm artık düz
  SemVer. Sürüm notları `docs/version-notes/` → `docs/release-notes/` taşındı.
- `package.json` `engines.node`: `>=14` → `>=20.19`. Önceki değer yanlıştı; `jsdom` en az
  20.19, `marked` en az 20 gerektiriyor.
- `env.example` koddaki gerçek kullanımla eşitlendi.
- `.cursorrules` → `CLAUDE.md`; sürüm süreci `docs/guides/release-process.md`'ye taşındı.
- Türkçe karakterli dosya adlarıyla görsel yükleme artık bozulmuyor (`görsel.png` →
  `gÃ¶rsel.png` mojibake'i sebebiyle `ga-rsel` gibi okunamaz adlar üretiliyordu).
- Dosya adları tutarlı hale getirildi: `src/css/blogstyle.css` → `blog.css`,
  `projectstyle.css` → `projects.css`, `markdown-editor/script.js` → `editor.js` vb.
- `rss.xml`/`sitemap.xml` artık git'te tutulmuyor; ikisi de sunucu açılışında yeniden
  üretiliyor (önceden yalnızca RSS açılışta üretiliyordu, sitemap için tutarsızdı).
- Proje klasörü üç kat iç içe yoldan (`Desktop/personal-site-fix-april/...`) tek bir
  konuma taşındı (`Projects/personal-site`).

### Kaldırıldı
- `admin/js/` altında hiçbir HTML tarafından yüklenmeyen 7 ölü modül (`admin.js` aynı
  sınıfları zaten kendi içinde tanımlıyordu — yarım kalmış bir refactor artığı).
- `config.json`: server bu dosyayı hiç okumuyordu; içindeki domain/CORS ayarları `.env`
  ile çelişerek yanıltıyordu.
- `scripts/deploy.sh`, `.github/workflows/deploy.yml`: Passenger ile çakışan
  `pkill`/`nohup` kullanıyorlardı; hardcoded/yanlış yollar içeriyorlardı.
- SSH tabanlı `content-push.sh`/`backup-data.sh`/`sync-common.sh`: hosting SSH
  sağlamadığı için çalışmıyorlardı.
- Çöp dosyalar: `_diff.txt`, `walkthrough.md.resolved`, `test-marked.js`.
→ [Ayrıntılar](docs/release-notes/0.2.0.md)

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
