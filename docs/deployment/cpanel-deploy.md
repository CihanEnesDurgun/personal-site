# cPanel Deploy Rehberi

Bu site bir **Node.js/Express uygulaması** (statik site değil). Dosyaları `public_html`'e
atmak çalışmaz; cPanel'in **Setup Node.js App** özelliği ile Passenger altında koşar.

## Akış

Paylaşımlı pakette **SSH kapalı** (hosting teyit etti), yalnızca cPanel içinden erişilen
**Terminal** var. Bu yüzden "yerelden sunucuya push" değil, **sunucudan GitHub'dan pull**
akışı kullanılır:

```
sen: git push                      → GitHub
sen: cPanel > Terminal > tek komut → sunucu GitHub'dan çeker + deploy
```

Deploy adımlarının tamamı [`.cpanel.yml`](../../.cpanel.yml) içindedir.

---

## Temel kural: deploy sadece KODU günceller

Admin paneli çalışma anında şu dosyalara yazar:

| Klasör/Dosya | İçerik |
|---|---|
| `content/` | blog yazıları, projeler, site ayarları |
| `images/` | yüklediğin görseller |
| `data/` | yorumlar, istatistikler, tema, admin kullanıcısı |
| `rss.xml`, `sitemap.xml` | otomatik üretilir (git'te tutulmaz) |

Bunlar `.cpanel.yml`'deki kopyalama listesinde **bilerek yok**. Deploy bunlara asla
dokunmaz; panelden yayınladığın hiçbir şey kaybolmaz.

**Listeye bu klasörleri eklemeyin.** Eklersen her deploy repo'daki eski sürümü sunucuya
yazar ve panelden yayınladığın yazılar/yorumlar silinir.

---

## İlk kurulum (tek seferlik)

### 1. Node.js uygulaması

cPanel → **Setup Node.js App** (mevcut kurulum):

| Alan | Değer |
|---|---|
| Node.js version | **20.20.2** — 18 ve altı OLMAZ (`jsdom` ≥20.19, `marked` ≥20 ister) |
| Application mode | Production |
| Application root | `site` → `/home/KULLANICI/site` |
| Application startup file | `server.js` |

### 2. GitHub erişimi (private repo)

Repo private olduğu için sunucunun GitHub'dan okuyabilmesi gerekir.

**Fine-grained personal access token** oluştur: GitHub → Settings → Developer settings →
Personal access tokens → Fine-grained tokens → Generate new token:

- Repository access: **Only select repositories** → `personal-site`
- Permissions → Repository permissions → **Contents: Read-only**
- Başka hiçbir yetki verme. Süre: 1 yıl (takvimine not al).

> Neden bu kadar dar: sunucu ele geçirilirse token'la yapılabilecek en kötü şey bu
> repo'yu okumak olur — yazma yok, başka repo'lara erişim yok.

cPanel → **Terminal**'de kimlik bilgisini kaydet:

```bash
git config --global credential.helper store
```

Bir sonraki `git pull` kullanıcı adı ve şifre sorar:
- **Username:** GitHub kullanıcı adın
- **Password:** yukarıda ürettiğin **token** (GitHub şifren DEĞİL)

Kaydedildikten sonra izinleri kıs:

```bash
chmod 600 ~/.git-credentials
```

### 3. cPanel'de repoyu oluştur

cPanel → **Git Version Control** → **Create**:

| Alan | Değer |
|---|---|
| Clone a Repository | **AÇIK** |
| Clone URL | `https://github.com/CihanEnesDurgun/personal-site.git` |
| Repository Path | `repositories/personal-site` |

### 4. Sunucuda `.env` oluştur

`.env` git'te **yok** ve olmamalı. cPanel → File Manager → `site` klasörü →
(Settings'ten "Show hidden files" açık olmalı) → `.env` oluştur:

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

İki değeri de **yeni** üret — yereldekini kopyalama:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"       # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))" # sifre
```

İzinleri kıs: File Manager → `.env` → Permissions → **600**.

> **`NODE_ENV=production` şart.** Aksi halde rate limiting kapalı, CSP gevşek modda çalışır.

### 5. İlk deploy

Bilgisayarında:

```bash
git push origin main
```

cPanel → **Terminal**'de:

```bash
bash ~/repositories/personal-site/scripts/server-deploy.sh
```

Script `git pull` yapar, sonra cPanel'in deploy mekanizmasını tetikler (`.cpanel.yml`
çalışır: dosyaları kopyalar, `npm ci`, Passenger restart).

> Alternatif (script çalışmazsa): Terminal'de `cd ~/repositories/personal-site && git pull`,
> sonra cPanel → Git Version Control → Manage → **Deploy HEAD Commit**.

### 6. İçeriği bir kez yükle

`content/` ve `images/` deploy'a dahil değil. İlk seferde File Manager ile yükle:
ikisini zip'leyip `site` klasörüne çıkar.

`data/` için `users.json` **yükleme** — admin'i sunucuda üreteceğiz. Diğer `data/*.json`
dosyaları isteğe bağlı (yoksa sistem kendi üretir).

### 7. Admin kullanıcısını oluştur

cPanel → **Terminal**:

```bash
cd ~/site
source ~/nodevenv/site/20/bin/activate
npm run setup:users
```

`.env`'deki `DEFAULT_ADMIN_PASSWORD` ile `data/users.json` üretir. Sonra `.env`'den o
satırı silebilirsin.

> ⚠️ Yerelindeki `data/users.json`'ı sunucuya **kopyalama**: şifresi public repo'da
> uzun süre açıkta kaldı.

### 8. Kontrol

- `https://cihanenesdurgun.com` → site açılıyor mu
- `/api/simple-test` → `{"success":true}`
- `/admin/login.html` → yeni şifreyle giriş
- `/content/posts.json` → **taslak görünmemeli** (giriş yapmadan, tarayıcıda aç)
- cPanel → Setup Node.js App → uygulama "Running" mi

---

## Günlük kullanım

### Kod değişikliği yayınlama

```bash
# 1) bilgisayarinda
git add . && git commit -m "..." && git push

# 2) cPanel > Terminal
bash ~/repositories/personal-site/scripts/server-deploy.sh
```

### İçerik

Yazıları **sunucudaki admin panelinden** yaz — asıl araç o. Yereldeki repo'yu güncel
tutmak ve git'e yedeklemek için:

```bash
npm run content:pull        # taslaklar icin admin sifresi sorar
git add content images && git commit -m "content: sunucudan senkron" && git push
```

`content:pull` sitenin HTTP arayüzünü kullanır (SSH gerekmez). Giriş yapmazsan yalnızca
yayındaki içerik iner ve yereldeki taslakların **korunur** (üzerine yazılmaz).

> **Yerelde yazıp sunucuya gönderme yolu yok** (SSH olmadığı için). Yerelde taslak
> yazdıysan içeriğini admin panelindeki editöre yapıştır.

### Veri yedeği (yorumlar, istatistikler)

`data/` güvenlik gereği HTTP üzerinden sunulmuyor, dolayısıyla `content:pull` onu almaz.
cPanel → **Terminal**:

```bash
cd ~/site && tar czf ~/data-yedek-$(date +%F).tar.gz data
```

Sonra File Manager'dan indir. `users.json` şifre hash'i içerir — yedeği paylaşma.

### Uygulamayı yeniden başlatma

```bash
touch ~/site/tmp/restart.txt
```

`pkill` / `nohup node server.js` **kullanma** — Passenger uygulamayı kendisi yönetir, çakışır.

---

## Sorun giderme

| Belirti | Sebep |
|---|---|
| `Missing required environment variables` | `.env` yok veya `JWT_SECRET`/`BCRYPT_SALT_ROUNDS` boş |
| `JWT_SECRET must be at least 32 characters` | Secret kısa; 64 karakterlik hex üret |
| Admin'e giriş yok, log'da `[AUTH-1010]` | `data/users.json` yok → `npm run setup:users` |
| `git pull` kullanıcı adı/şifre soruyor | Token kaydedilmemiş → adım 2 |
| `Unsupported engine` / `npm ci` hatası | Node 20 altında; Setup Node.js App'ten 20 seç |
| Panelden yayınlanan yazı kayboldu | `content/` `.cpanel.yml` kopyalama listesine eklenmiş — çıkar |
| Değişiklik sitede görünmüyor | Dosya önbelleği 5 dk; `touch ~/site/tmp/restart.txt` |

Log'lar: cPanel → Setup Node.js App → uygulamanın log dosyası, ve `~/site/logs/`.

> `repositories/personal-site` (git deposu) ile `~/site` (uygulamanın çalıştığı klasör)
> farklı yerlerdir. Deploy, birinden diğerine kopyalar.
