# cPanel Deploy Rehberi

Bu site bir **Node.js/Express uygulaması** (statik site değil). Dosyaları `public_html`'e
atmak çalışmaz; cPanel'in **Setup Node.js App** özelliği ile Passenger altında koşar.

Deploy otomatiktir: `git push` → cPanel `.cpanel.yml`'i çalıştırır → site güncellenir.

---

## Temel kural: deploy sadece KODU günceller

Admin paneli çalışma anında şu dosyalara yazar:

| Klasör/Dosya | İçerik |
|---|---|
| `content/` | blog yazıları, projeler, site ayarları |
| `images/` | yüklediğin görseller |
| `data/` | yorumlar, istatistikler, tema, admin kullanıcısı |
| `rss.xml`, `sitemap.xml` | otomatik üretilir |

Bunlar `.cpanel.yml`'deki kopyalama listesinde **bilerek yok**. Yani deploy bunlara
asla dokunmaz ve panelden yayınladığın hiçbir şey kaybolmaz.

**Listeye bu klasörleri eklemeyin.** Eklersen, her deploy repo'daki eski sürümü
sunucuya yazar ve panelden yayınladığın yazılar/yorumlar silinir.

Yerelde yazı yazmak istersen → aşağıdaki "İçerik senkronizasyonu" bölümüne bak.

---

## İlk kurulum (tek seferlik)

### 1. Node.js uygulamasını oluştur

cPanel → **Setup Node.js App** → Create Application:

| Alan | Değer |
|---|---|
| Node.js version | **20 veya 22** (14/16/18 OLMAZ — `jsdom` en az 20.19, `marked` en az 20 ister) |
| Application mode | **Production** |
| Application root | `personal-site` |
| Application URL | domain'in (cihanenesdurgun.com) |
| Application startup file | `server.js` |

> "Application root" değerini not et — `.cpanel.yml` içindeki `APP_DIR` ve
> `deploy.config` içindeki `CPANEL_APP_DIR` bununla aynı olmalı.

### 2. `.cpanel.yml`'i sunucuna göre ayarla

Repo kökündeki `.cpanel.yml` dosyasında sadece iki satır:

```yaml
- export APP_DIR=$HOME/personal-site     # Application root ile aynı
- export NODE_VER=22                     # seçtiğin Node sürümü
```

### 3. SSH anahtarını yetkilendir

Bilgisayarında anahtar yoksa üret:

```bash
ssh-keygen -t ed25519 -C "cpanel-deploy"     # sorulara Enter yeterli
cat ~/.ssh/id_ed25519.pub                     # ciktiyi kopyala
```

cPanel → **SSH Access** → Manage SSH Keys → **Import Key** → Public Key alanına yapıştır
→ kaydet → listede anahtarın yanındaki **Manage** → **Authorize**.

Test et:

```bash
ssh -p PORT KULLANICI@SUNUCU "echo baglanti-ok"
```

### 4. cPanel'de BOŞ git reposu oluştur

cPanel → **Git Version Control** → **Create**:

| Alan | Değer |
|---|---|
| Clone a Repository | **KAPALI** (toggle'ı açma) |
| Repository Path | `repositories/personal-site` |
| Repository Name | `personal-site` |

> **Neden GitHub'dan klonlamıyoruz?** Böylece cPanel'in GitHub ile hiç işi olmaz.
> Repo'yu private yapsan da deploy çalışmaya devam eder — deploy'u tetikleyen şey
> GitHub değil, senin cPanel'e SSH ile yaptığın push.

Oluşunca **Manage** ekranındaki **Clone URL (SSH)** değerini kopyala; şuna benzer:
`ssh://KULLANICI@SUNUCU:PORT/home/KULLANICI/repositories/personal-site`

### 5. Bilgisayarından cPanel'i remote olarak ekle

```bash
# cPanel'i ayri bir remote olarak ekle
git remote add cpanel ssh://KULLANICI@SUNUCU/home/KULLANICI/repositories/personal-site

# Tek `git push` ile hem GitHub'a hem cPanel'e gitsin:
git remote set-url --add --push origin https://github.com/CihanEnesDurgun/personal-site.git
git remote set-url --add --push origin ssh://KULLANICI@SUNUCU/home/KULLANICI/repositories/personal-site

# Kontrol: `git remote -v` ciktisinda origin icin 2 adet (push) satiri gormelisin
```

İlk gönderim:

```bash
git push cpanel main
```

### 6. Sunucuda `.env` oluştur

`.env` git'te **yok** ve olmamalı. Sunucuda elle oluştur:

cPanel → File Manager → Application root → (Settings'ten "Show hidden files" açık olmalı)
→ `.env` adında dosya oluştur:

```bash
JWT_SECRET=<BURAYA-YENI-URET>
BCRYPT_SALT_ROUNDS=12
NODE_ENV=production
SITE_URL=https://cihanenesdurgun.com
SESSION_TIMEOUT=480
SESSION_IDLE_TIMEOUT=90
MAX_SESSIONS_PER_USER=3
RATE_LIMIT_MAX=1000
DEFAULT_ADMIN_PASSWORD=<BURAYA-YENI-URET>
```

İki değeri de **yeni** üret (yereldekini kopyalama, production ayrı olsun):

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# DEFAULT_ADMIN_PASSWORD
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
```

Sonra izinleri kıs: File Manager → `.env` → Permissions → **600**.

> **`NODE_ENV=production` şart.** Aksi halde rate limiting tamamen kapalı ve CSP
> gevşek modda çalışır. (Not: `dotenv` mevcut ortam değişkenlerini ezmez — cPanel
> arayüzünden de bir değer girersen o kazanır. Karışıklık olmasın diye tek yerden,
> `.env`'den yönet.)

### 7. İlk deploy

```bash
git push
```

cPanel → Git Version Control → **Manage** → Pull or Deploy → **Deploy HEAD Commit**
(ilk seferde elle tetiklemek gerekebilir; sonrakiler otomatik).

### 8. İçerik ve veriyi bir kez yükle

`content/`, `images/`, `data/` deploy'a dahil değil — ilk seferde elle yüklenmeli:

```bash
# deploy.config'i hazırla
cp deploy.config.example deploy.config   # değerleri doldur

# içeriği gönder
npm run content:push
```

`data/` için: File Manager ile `data/` klasörünü yükle **ama `users.json`'ı değil**
(admin'i sunucuda üreteceğiz).

### 9. Admin kullanıcısını sunucuda oluştur

cPanel → **Terminal** (veya SSH):

```bash
cd ~/personal-site
source ~/nodevenv/personal-site/22/bin/activate
npm run setup:users
```

Bu, `.env`'deki `DEFAULT_ADMIN_PASSWORD` ile `data/users.json` üretir.
Sonra `.env`'den `DEFAULT_ADMIN_PASSWORD` satırını silebilirsin.

> ⚠️ Yerelindeki `data/users.json`'ı **sunucuya kopyalama**. O dosyanın şifresi
> (`t0KmYrPH!C7fQmLH`) public GitHub repo'sunda yıllardır açıkta duruyordu.

### 10. Kontrol

- `https://cihanenesdurgun.com` → site açılıyor mu
- `https://cihanenesdurgun.com/api/simple-test` → `{"success":true}` dönüyor mu
- `https://cihanenesdurgun.com/admin` → yeni şifreyle giriş
- cPanel → Setup Node.js App → uygulama "Running" mi

---

## Günlük kullanım

### Kod değişikliği yayınlama

```bash
git add . && git commit -m "..." && git push
```

Gerisi otomatik: cPanel `.cpanel.yml`'i çalıştırır, `npm ci` yapar, Passenger'ı yeniden başlatır.

### İçerik senkronizasyonu

Yazıları hem panelden hem yerelden yazabilirsin, ama **yön önemli**:

| Komut | Yön | Ne zaman |
|---|---|---|
| `npm run content:pull` | sunucu → yerel | Yerelde yazı düzenlemeye **başlamadan önce**. Ayrıca panelden yayınladıklarını git'e yedeklemek için. |
| `npm run content:push` | yerel → sunucu | Yereldeki yazıyı canlıya almak için. |
| `npm run backup:data` | sunucu → yerel | Yorum/istatistik yedeği. Ara sıra çalıştır. |

**Altın kural:** yerelde yazmadan önce `content:pull`. Unutursan, panelden yayınladığın
yeni yazı `content:push` ile ezilebilir.

Panelden yazdıklarını git'e yedeklemek için ara sıra:

```bash
npm run content:pull
git add content images && git commit -m "content: sunucudan senkron" && git push
```

### Uygulamayı yeniden başlatma

```bash
touch ~/personal-site/tmp/restart.txt
```

`pkill` / `nohup node server.js` **kullanma** — Passenger uygulamayı kendisi yönetir, çakışır.

---

## Sorun giderme

| Belirti | Sebep |
|---|---|
| Uygulama açılmıyor, log'da `Missing required environment variables` | `.env` yok veya `JWT_SECRET`/`BCRYPT_SALT_ROUNDS` boş |
| `JWT_SECRET must be at least 32 characters` | Secret kısa; 64 karakterlik hex üret |
| Admin'e giriş yapılamıyor, log'da `[AUTH-1010]` | `data/users.json` yok → `npm run setup:users` |
| `npm ci` hatası, `Unsupported engine` | Node sürümü 20'nin altında; Setup Node.js App'ten 20/22 seç |
| Panelden yayınlanan yazı kayboldu | Biri `content/`'i `.cpanel.yml` kopyalama listesine eklemiş — çıkar |
| Değişiklik sitede görünmüyor | Dosya önbelleği 5 dakika; `touch tmp/restart.txt` ile anında yenilenir |

Log'lar: cPanel → Setup Node.js App → uygulamanın log dosyası, ve `~/personal-site/logs/`.
