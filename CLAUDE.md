# CLAUDE.md

Kişisel blog + portföy sitesi. Node.js/Express backend, vanilla JS frontend, veritabanı yok —
tüm veri JSON dosyalarında.

## Komutlar

| Komut | İş |
|---|---|
| `npm run dev` | Yerel geliştirme (nodemon, port 3000) |
| `npm start` | Production başlatma |
| `npm run setup` | Production hazırlık kontrolleri (NODE_ENV, sır sızıntısı) |
| `npm run setup:users` | `.env`'deki `DEFAULT_ADMIN_PASSWORD` ile admin oluşturur |
| `npm run content:pull` | Sunucudaki içeriği HTTP üzerinden yerele indirir |

Deploy sunucuda yapılır (SSH yok, yalnızca cPanel Terminal):
`bash ~/repositories/personal-site/scripts/server-deploy.sh`

## Yapı

```
server.js          Tüm HTTP API'si (tek dosya, ~4500 satır)
lib/               Sunucu modülleri (camelCase: sessionManager.js)
src/css, src/js    Herkese açık sayfaların varlıkları
admin/             Admin paneli (kendi js/ klasörü var)
markdown-editor/   Yazı editörü (admin'den ayrı sayfa)
content/           Yazılar/projeler — ÇALIŞMA ANINDA YAZILIR
images/            Yüklenen görseller — ÇALIŞMA ANINDA YAZILIR
data/              Oturum, yorum, istatistik, kullanıcı — ÇALIŞMA ANINDA YAZILIR
docs/              Dokümantasyon
```

## Değişmez kurallar

**1. Hiçbir sır git'e girmez.**
Gerçek değerler yalnızca `.env` içinde yaşar. `env.example`'a, dokümana, koda, commit
mesajına asla gerçek `JWT_SECRET`/şifre yazma. Bir sır bir kez commit'lendiyse geçmişten
silmek yetmez, **rotate edilmesi** gerekir. (Repo uzun süre public kaldı; geçmişteki
değerler yanmış sayılır — hepsi rotate edildi.)

**2. Deploy yalnızca kodu taşır.**
`content/`, `images/`, `data/`, `rss.xml`, `sitemap.xml` çalışma anında admin paneli
tarafından yazılır ve yalnızca sunucuda yaşar. `.cpanel.yml`'deki kopyalama listesine
bunları **ekleme** — eklersen her deploy panelden yayınlanan içeriği eski sürümle ezer.
Sunucudan içerik almak için `npm run content:pull` (HTTP üzerinden; SSH yok).

**2b. Yayınlanmamış içerik sunucuda filtrelenir.**
`/content/posts.json` ve `/content/*/*.md` rotaları statik middleware'den ÖNCE tanımlıdır
ve yetkisiz isteklerde taslakları ayıklar (`server.js`). İstemci tarafı filtreleme
(`blog.js`) güvenlik sınırı değildir; `?preview=true` de kimlik doğrulaması değildir —
önizleme `admin_token` ile yapılır. Bu rotaları statik sunumun arkasına alma.

**3. Passenger'ı elle yönetme.**
Sunucuda restart = `touch ~/site/tmp/restart.txt`. `pkill` / `nohup node server.js`
Passenger'ın yönettiği süreçle çakışır.

**4. Node 20+ zorunlu.** `jsdom` en az 20.19, `marked` en az 20 istiyor. Sunucuda 20.20.2 kurulu.

**5. Tarih/saat.** Asla sabit tarih yazma, her zaman gerçek sistem saatini kullan.

| Kullanım | Yöntem |
|---|---|
| Depolama, API, log | `new Date().toISOString()` |
| Cache, oturum, karşılaştırma | `Date.now()` |
| Kullanıcıya gösterim | `toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })` |

**6. Hatalar kod ile döner.** Yeni hata eklerken `lib/errorRegistry.js`'e kaydet ve
`AppError('KOD-1234', ...)` ile fırlat. Bkz. `docs/error-handling/`.

**7. Kullanıcıya görünen her metin Türkçe.**

## Adlandırma

- Dosya adları: **kebab-case** (`content-pull.js`, `error-registry.md`)
- `lib/` içindeki modüller: **camelCase** (mevcut yapıyla uyum için)
- Sayfa varlıkları sayfa adıyla eşleşir: `blog.html` → `src/css/blog.css`, `src/js/blog.js`
- Global varlıklar: `styles.css`, `scripts.js`
- Klasör zaten bağlamı verir; dosya adında tekrarlama (`admin/js/console-logger.js`,
  `admin/js/admin-console-logger.js` değil)

## Sürümleme

Semantic Versioning + Conventional Commits. `feat:` → MINOR, `fix:`/`perf:`/`refactor:` → PATCH,
`BREAKING CHANGE:` → (v1.0.0 öncesi) MINOR. Sürüm iki yerde: `package.json` ve
`src/js/version.js`. İkisi de aynı olmalı; değişiklikler `CHANGELOG.md`'ye işlenir.

Detaylı sürüm çıkarma adımları: `docs/guides/release-process.md`.
