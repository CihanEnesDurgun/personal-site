# 🔒 Güvenlik Denetim Raporu

**Proje:** Personal Site Admin Panel  
**Tarih:** 21 Şubat 2026  
**Denetçi:** AI Siber Güvenlik Uzmanı  
**Kapsam:** Tam kaynak kodu analizi (server.js, auth, session, config, deploy)  
**Risk Seviyesi Ölçeği:** 🔴 Kritik | 🟠 Yüksek | 🟡 Orta | 🟢 Düşük

---

## 📊 Özet

| Seviye | Adet |
|--------|------|
| 🔴 Kritik | 5 |
| 🟠 Yüksek | 6 |
| 🟡 Orta | 5 |
| 🟢 Düşük | 4 |
| **Toplam** | **20** |

---

## 🔴 KRİTİK SEVİYE AÇIKLAR

### 1. env.example Dosyasında Gerçek Gizli Anahtarlar
**Dosya:** `env.example`  
**Satır:** 1, 3  
**CVSS Skoru:** 9.8

`env.example` dosyası repoya dahil edilmek üzere tasarlanmış bir şablon dosyasıdır, ancak **gerçek JWT_SECRET** ve **gerçek DEFAULT_ADMIN_PASSWORD** içermektedir:

```
JWT_SECRET=55012901512388322e884e83ea4c296ed727b98717f4e05f8800168985f6df38
DEFAULT_ADMIN_PASSWORD=t0KmYrPH!C7fQmLH
```

> [!CAUTION]
> Bu dosya Git reposuna push edilirse, tüm kimlik doğrulama sisteminiz tehlikeye girer. Saldırgan JWT_SECRET ile geçerli token üretebilir ve admin parolasıyla sisteme giriş yapabilir.

**Çözüm:**
- `env.example` içindeki tüm değerleri placeholder ile değiştirin: `JWT_SECRET=your-secret-key-here-min-32-chars`
- Mevcut JWT_SECRET'ı hemen değiştirin
- Git geçmişinden hassas veriyi temizleyin (`git filter-branch` veya BFG)

---

### 2. Webhook Endpoint'inde Remote Code Execution (RCE)
**Dosya:** `server.js`  
**Satır:** 3596-3702  
**CVSS Skoru:** 9.1

Webhook endpoint'i (`POST /api/webhook/deploy`) **kimlik doğrulama gerektirmez** ve `GITHUB_WEBHOOK_SECRET` ortam değişkeni ayarlanmamışsa **hiçbir doğrulama yapılmadan** `execAsync()` ile shell komutu çalıştırır:

```javascript
// Eğer GITHUB_WEBHOOK_SECRET yoksa, doğrulama atlannıyor
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
if (webhookSecret) {
  // ... sadece varsa doğrula
}

// Sonra doğrudan shell komutu çalıştır
execAsync(`bash ${deployScriptPath}`, { ... })
```

> [!CAUTION]
> Bir saldırgan sahte bir POST isteği göndererek sunucunuzda keyfi komut çalıştırabilir. `.env` dosyanızda `GITHUB_WEBHOOK_SECRET` tanımlı değildir!

**Çözüm:**
- `.env` dosyasına `GITHUB_WEBHOOK_SECRET` ekleyin ve zorunlu yapın
- Secret yoksa webhook'u tamamen devre dışı bırakın
- `deploy.sh` içindeki komutları doğrulayın ve kısıtlayın

---

### 3. Statik Dosyalar Tüm Proje Köküne Erişim Sağlıyor
**Dosya:** `server.js`  
**Satır:** 3705  
**CVSS Skoru:** 8.9

```javascript
app.use(express.static('.'));
```

Bu satır, **proje kök dizinindeki TÜM dosyaları** web üzerinden erişilebilir yapar. Bu şu dosyalara doğrudan erişim anlamına gelir:

- `http://localhost:3001/config.json` → Sunucu konfigürasyonu
- `http://localhost:3001/data/comments.json` → Tüm kullanıcı yorumları & IP adresleri
- `http://localhost:3001/data/theme.json` → Tema verileri
- `http://localhost:3001/data/deleted-images.json` → Silinen görseller
- `http://localhost:3001/error.log` → 131KB hata logu
- `http://localhost:3001/out.log` → Çıktı logları
- `http://localhost:3001/deploy.sh` → Deploy betiği
- `http://localhost:3001/server.js` → 4102 satır sunucu kaynak kodu!
- `http://localhost:3001/manual_setup_users.js` → Kullanıcı kurulum betiği

> [!CAUTION]
> Saldırgan tüm kaynak kodunuzu, konfigürasyonlarınızı ve kullanıcı verilerinizi indirebilir. Yorum yapanların IP adresleri, e-posta adresleri gibi kişisel veriler de sızdırılabilir.

**Çözüm:**
```javascript
// Sadece belirli klasörleri sunun
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
// HTML dosyalarını ayrı route'larla sunun
```

---

### 4. Analytics Endpoint'lerinde Rate Limiting ve Auth Yok
**Dosya:** `server.js`  
**Satır:** 2530-2558  
**CVSS Skoru:** 7.5

`POST /api/analytics/track-page` ve `POST /api/analytics/track-post` endpoint'leri:
- ❌ Kimlik doğrulama yok
- ❌ Rate limiting yok (development modunda)
- ❌ Input boyutu sınırlaması yok (slug/page parametresi)

```javascript
app.post('/api/analytics/track-page', async (req, res) => {
  const { page } = req.body;  // Doğrulama yok
  const stats = await incrementPageView(page);
  // ...
});
```

**Etki:** Saldırgan milyonlarca sahte istek göndererek istatistikleri şişirebilir, disk alanını doldurabilir ve DoS saldırısı yapabilir.

**Çözüm:**
- Bu endpoint'lere özel rate limiter ekleyin
- `page` ve `slug` değerlerini whitelist'e göre doğrulayın
- Birden fazla view artırımını engelleyen IP-bazlı deduplication ekleyin

---

### 5. Yorum Sistemi ile XSS ve Veri Sızıntısı
**Dosya:** `server.js`  
**Satır:** 2822-2909, 2880-2893  
**CVSS Skoru:** 7.8

Yorum sistemi birden fazla sorun içerir:

**a) Stored XSS Riski:** Yorum içeriği yalnızca uzunluk kontrolü yapılıyor, HTML/JS sanitizasyonu yok:
```javascript
const newComment = {
  name: name.trim(),        // Sanitize edilmemiş
  content: content.trim(),  // Sanitize edilmemiş
  // ...
};
```

**b) IP Adresi Kaydedilip Sızıyor:**
```javascript
ip: req.ip || req.connection.remoteAddress, // Yoruma IP kaydediliyor
```
Bu IP adresi `data/comments.json` dosyasında kalıyor ve `express.static('.')` ile herkes tarafından okunabiliyor (Bkz. Açık #3).

**Çözüm:**
- Tüm kullanıcı girdisini sanitize edin (DOMPurify veya benzeri)
- IP adreslerini ayrı, erişilemez bir yerde saklayın
- Yorum endpoint'lerine rate limiting ekleyin
- CAPTCHA veya honeypot mekanizması ekleyin

---

## 🟠 YÜKSEK SEVİYE AÇIKLAR

### 6. Rate Limiting Development Ortamında Devre Dışı
**Dosya:** `server.js`  
**Satır:** 102-141  
**CVSS Skoru:** 6.5

```javascript
const generalLimiter = process.env.NODE_ENV === 'production' 
  ? rateLimit({ ... }) 
  : (req, res, next) => next(); // Development'ta YOK
```

`.env` dosyasında `NODE_ENV=development` ayarlı. Sunucu production'da da bu şekilde deploy edilirse, brute-force ve DoS saldırılarına tamamen açık kalır.

**Çözüm:**
- Development modunda da makul bir rate limit uygulayın (ör. 10000 req/15dk)
- Production deploy kontrollerini otomatikleştirin

---

### 7. Debug/Test Endpoint'leri Production'da Erişilebilir
**Dosya:** `server.js`  
**Satır:** 70-77, 2489-2525  
**CVSS Skoru:** 5.3

Aşağıdaki endpoint'ler kimlik doğrulama olmadan bilgi sızdırır:

| Endpoint | Sızan Bilgi |
|----------|-------------|
| `GET /api/simple-test` | Sunucu durumu, zaman |
| `GET /api/test` | `NODE_ENV`, `PORT` değerleri |
| `GET /api/health` | Sunucu durumu |
| `GET /api/debug/csp` | CSP yapılandırması, NODE_ENV |
| `GET /api/version` | Uygulama versiyonu |

**Çözüm:**
- Debug endpoint'lerini NODE_ENV kontrolüne bağlayın
- Hassas bilgi sızdıran alanları (`nodeEnv`, `port`) kaldırın

---

### 8. Hata Yanıtlarında Stack Trace Sızıntısı
**Dosya:** `server.js`  
**Satır:** 429-433, 1455  
**CVSS Skoru:** 5.3

Global error handler tam stack trace'i istemciye gönderiyor:

```javascript
const errorMessage = err.stack 
  ? err.stack.toString()  // TAM STACK TRACE!
  : (err.message || 'Sunucu hatası');
```

Login hatasında da development modunda hata detayı sızdırılıyor:
```javascript
message: process.env.NODE_ENV === 'development' 
  ? error.message 
  : 'Internal server error',
```

**Çözüm:**
- Production'da asla stack trace döndürmeyin
- Genel hata mesajları kullanın, detayları sadece loglarında tutun

---

### 9. JWT Token Yapılandırma Zayıflıkları
**Dosya:** `server.js`, `lib/sessionManager.js`  
**Satır:** 1392, 312-321  
**CVSS Skoru:** 5.8

- Token süresi 24 saat — çalınmış bir token uzun süre geçerli kalır
- JWT `algorithm` açıkça belirtilmiyor (algorithm confusion saldırısına açık olabilir)
- Refresh token mekanizması yok — kullanıcı 24 saat sonra tekrar giriş yapmak zorunda

```javascript
jwt.sign({ ... }, JWT_SECRET, { expiresIn: '24h' });
// 'algorithm' belirtilmemiş
```

**Çözüm:**
```javascript
jwt.sign({ ... }, JWT_SECRET, { 
  expiresIn: '1h',     // Kısa süreli access token
  algorithm: 'HS256'   // Algoritma açıkça belirt
});
// Ayrı bir refresh token mekanizması ekleyin
```

---

### 10. Şifre Politikası Yetersiz
**Dosya:** `server.js`  
**Satır:** 3231-3233  
**CVSS Skoru:** 5.5

Hesap güncelleme endpoint'i sadece minimum 6 karakter istiyor:
```javascript
if (!newPassword || newPassword.length < 6) {
  return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır' });
}
```

- ❌ Büyük/küçük harf zorunluluğu yok
- ❌ Sayı zorunluluğu yok
- ❌ Özel karakter zorunluluğu yok
- ❌ Yaygın şifre kontrolü yok

**Çözüm:**
- Minimum 12 karakter, büyük/küçük harf, sayı ve özel karakter zorunluluğu ekleyin
- Yaygın şifre listesiyle karşılaştırma yapın

---

### 11. IP Engelleme Özelliği Sahte (Fonksiyonel Değil)
**Dosya:** `server.js`  
**Satır:** 3376-3398  
**CVSS Skoru:** 5.0

IP engelleme endpoint'i sadece log yazıyor, **gerçekte hiçbir engelleme yapmıyor:**

```javascript
app.post('/api/security/block-ip', authenticateToken, async (req, res) => {
  // Sadece log yazıyor, gerçek engelleme YOK
  logger.log(`IP ${ip} blocked by admin.`);
  res.json({ success: true, message: `IP adresi ${ip} engellendi` });
});
```

Admin panelinde "IP engellendi" mesajı göstermekle birlikte, saldırgan hâlâ tüm endpoint'lere erişebilir.

**Çözüm:**
- Engellenen IP listesini dosyada veya bellekte tutun
- Middleware seviyesinde IP kontrolü yapın
- Geçici ve kalıcı engelleme seçenekleri ekleyin

---

## 🟡 ORTA SEVİYE AÇIKLAR

### 12. CORS Yapılandırmasında Zayıflık
**Dosya:** `server.js`  
**Satır:** 168-178  
**CVSS Skoru:** 4.5

Development modunda origin header olmadan gelen istekler ve tüm localhost istekleri otomatik kabul ediliyor. CORS sadece `/api` prefix'ine uygulanıyor:

```javascript
app.use('/api', cors(corsOptions));  // Sadece /api için
```

Bu, statik dosyalara başka origin'lerden sınırsız erişim anlamına gelir.

---

### 13. Dosya Yükleme — MIME Type Doğrulaması Yetersiz 
**Dosya:** `server.js`  
**Satır:** 457-476  
**CVSS Skoru:** 4.8

Dosya yükleme sadece `file.mimetype` ve uzantıya güveniyor. Client tarafında MIME type kolayca sahtelenebilir. **Magic bytes** (dosya başlığı) kontrolü yapılmıyor.

```javascript
if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) { ... }
// Magic bytes kontrolü YOK
```

**Çözüm:**
- `file-type` paketi ile dosyanın gerçek tipini magic bytes'tan okuyun
- Yüklenen dosyaları yeniden işleyin (re-encode)
- EXIF verilerini temizleyin

---

### 14. Yorum Endpoint'inde Rate Limiting Yok
**Dosya:** `server.js`  
**Satır:** 2822  
**CVSS Skoru:** 4.3

`POST /api/comments/:slug` endpoint'i authentication veya rate limiting gerektirmiyor. Spam bot'lar sınırsız yorum gönderebilir.

**Çözüm:**
- IP bazlı rate limiting ekleyin (ör. 5 yorum/dakika)
- CAPTCHA veya honeypot mekanizması uygulayın

---

### 15. Request ID Üretimi Kriptografik Değil
**Dosya:** `server.js`  
**Satır:** 340-342  
**CVSS Skoru:** 3.5

```javascript
const generateRequestId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};
```

`Math.random()` kriptografik olarak güvenli değildir ve tahmin edilebilir.

**Çözüm:** `crypto.randomUUID()` veya `crypto.randomBytes(16).toString('hex')` kullanın.

---

### 16. CSP'de unsafe-inline ve unsafe-eval
**Dosya:** `server.js`  
**Satır:** 239-257  
**CVSS Skoru:** 4.0

Production CSP'de `'unsafe-inline'` script ve style için izin veriliyor, development'ta ek olarak `'unsafe-eval'` de var. Bu, XSS saldırılarının etkisini azaltan CSP korumasını zayıflatır.

**Çözüm:**
- Nonce tabanlı CSP kullanmaya geçin
- Inline script ve style'ları harici dosyalara taşıyın

---

## 🟢 DÜŞÜK SEVİYE AÇIKLAR

### 17. Body Parser Limiti Çok Yüksek
**Dosya:** `server.js` **Satır:** 216-217

```javascript
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
```
50MB sınırı, bellek tüketme saldırılarına olanak tanır. 1-5MB yeterlidir.

---

### 18. Session Verileri Düz Dosyada Saklanıyor
**Dosya:** `lib/sessionManager.js`

Tüm session verileri `data/sessions.json` dosyasında saklanıyor. Race condition riski, ölçeklenebilirlik sorunu ve dosya bozulma riski mevcuttur.

**Çözüm:** Redis veya SQLite gibi uygun bir depolama mekanizması kullanın.

---

### 19. Deploy Betiği Güvenlik Sorunları
**Dosya:** `deploy.sh` **Satır:** 21-22

```bash
chmod -R 755 .
chmod 644 *.html *.css *.js *.json *.xml *.md
```
`.env` dosyası ve `data/users.json` gibi hassas dosyalara da 644 izni verilmektedir.

---

### 20. Login Yanıtlarında Kullanıcı Enumeration
**Dosya:** `server.js` **Satır:** 1335-1338, 1425-1432

Login endpoint'i her iki durumda da "Kullanıcı adı veya şifre hatalı" döndürüyor, ancak `logFailedLogin` fonksiyonunda reason olarak `'User not found'` vs `'Invalid credentials'` ayrımı yapılıyor. Timing farkı ile kullanıcı adı saptanabilir, çünkü kullanıcı bulunamazsa bcrypt compare çalıştırılmıyor.

**Çözüm:** Kullanıcı bulunamadığında bile dummy bir bcrypt compare çalıştırın.

---

## 🛡️ HIZLI DÜZELTME ÖNCELİK SIRASI

| Öncelik | Açık # | Aksiyon | Tahmini Süre |
|---------|--------|---------|-------------|
| 1 | #3 | `express.static('.')` → özel public klasörü | 30 dk |
| 2 | #1 | `env.example` gizli anahtarları temizle | 10 dk |
| 3 | #2 | Webhook'a zorunlu secret doğrulaması ekle | 20 dk |
| 4 | #5 | Yorum sanitizasyonu ekle (XSS önleme) | 45 dk |
| 5 | #4 | Analytics endpoint'lerine rate limiting | 20 dk |
| 6 | #6 | Development'ta da rate limiting aktif et | 15 dk |
| 7 | #7 | Debug endpoint'lerini kaldır/kısıtla | 15 dk |
| 8 | #8 | Stack trace sızıntısını engelle | 10 dk |
| 9 | #11 | IP engellemeyi gerçekten uygula | 60 dk |
| 10 | #10 | Şifre politikasını güçlendir | 20 dk |

---

## 📋 İYİ YAPILAN ŞEYLER ✅

Denetim sırasında aşağıdaki güvenlik önlemlerinin mevcut olduğu tespit edilmiştir:

- ✅ Şifreler bcrypt ile hash'leniyor (salt rounds: 12)
- ✅ JWT_SECRET minimum 32 karakter zorunluluğu
- ✅ Güvenlik header'ları mevcut (X-Frame-Options, X-Content-Type-Options, HSTS)
- ✅ `.env` ve hassas data dosyaları `.gitignore`'da
- ✅ Dosya yükleme için whitelist (tip ve uzantı) mevcut
- ✅ Session'da IP ve UserAgent doğrulaması yapılıyor
- ✅ Oturum timeout ve idle timeout mekanizması var
- ✅ Multer dosya boyutu sınırlaması (5MB)
- ✅ X-Powered-By header'ı kaldırılıyor
- ✅ Soft delete mekanizması (geri dönüşüm kutusu)

---

> [!IMPORTANT]
> Bu rapor, kaynak kod analizi (white-box testing) ile hazırlanmıştır. Aktif penetrasyon testi (black-box), ağ güvenliği taraması ve bağımlılık güvenlik analizi (npm audit) bu kapsama dahil değildir. Tam bir güvenlik değerlendirmesi için bunların da yapılması önerilir.

---

*Rapor Tarihi: 21 Şubat 2026 | Rapor Versiyonu: 1.0*
