# Proje Özeti

## 1. Proje Genel Bakış

### Proje Adı ve Versiyonu
DurgunTech Kişisel Blog ve Blog Yönetim Paneli

### Proje Özeti
Kullanıcı paylaşmak istediği yazıları yayınlar ve analizlerini kontrol eder.

### Proje Amacı
Projenin amacı tamamen kullanıcının paylaşmak istediklerini bir yazıya döküp arkasında birer iz bırakmaktır. Kullanıcı yazılarını yazar, planlar, paylaşır ve takip eder.

### Hedef Kitle
Hedef kitle genel okuyucu kitlesidir.

---

## 2. Proje Kapsamı

### Temel Özellikler
- **Blog Yönetim Sistemi**: Markdown destekli blog yazıları oluşturma, düzenleme ve yayınlama
- **Admin Panel**: Güvenli giriş sistemi ile tam fonksiyonel yönetim arayüzü
- **Galeri Yönetimi**: Resim yükleme, organizasyon ve silme işlemleri
- **Tema Sistemi**: Dark/Light tema desteği ve özelleştirilebilir renk paleti
- **İstatistik Takibi**: Blog yazıları ve site kullanım analizleri
- **Güvenlik Özellikleri**: JWT tabanlı kimlik doğrulama ve session yönetimi
- **Responsive Tasarım**: Mobil ve desktop uyumlu modern arayüz

### Proje Sınırları
- **Dahil Olanlar**: Blog yazıları, resim galerisi, admin panel, tema sistemi, istatistikler
- **Hariç Tutulanlar**: Çoklu kullanıcı desteği, e-ticaret özellikleri, sosyal medya entegrasyonu
- **Tek Kullanıcı**: Sadece site sahibi admin paneli kullanabilir
- **Statik İçerik**: Dinamik kullanıcı etkileşimi sınırlı

### Başarı Kriterleri
- Blog yazıları başarıyla yayınlanabilmeli
- Admin panel güvenli şekilde çalışmalı
- Site responsive tasarımda sorunsuz görüntülenmeli
- Tema değişiklikleri anında yansımalı
- Resim yükleme ve yönetimi sorunsuz çalışmalı

---

## 3. Teknik Mimari

### Teknoloji Yığını
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Kimlik Doğrulama**: JWT (jsonwebtoken), bcryptjs
- **Dosya İşlemleri**: fs-extra, multer (resim yükleme)
- **Güvenlik**: express-rate-limit, cors
- **Zamanlama**: node-cron (otomatik görevler)
- **Konfigürasyon**: dotenv (environment variables)

### Sistem Mimarisi
- **Frontend**: Statik HTML/CSS/JS dosyaları, responsive tasarım
- **Backend**: RESTful API server (Express.js)
- **Veri Depolama**: JSON dosyaları (posts.json, users.json, theme.json)
- **Dosya Sistemi**: Markdown dosyaları (blog içerikleri), resim dosyaları
- **Session Yönetimi**: JWT token tabanlı, server-side session tracking

### Klasör Yapısı ve Organizasyon
```
personal-site/
├── admin/                 # Admin panel dosyaları
│   ├── js/               # Modüler JavaScript dosyaları
│   ├── index.html        # Ana admin sayfası
│   └── login.html        # Giriş sayfası
├── content/              # İçerik dosyaları
│   ├── posts/            # Markdown blog yazıları
│   ├── posts.json        # Blog metadata
│   └── site.json         # Site konfigürasyonu
├── data/                 # Veri dosyaları
│   ├── users.json        # Kullanıcı bilgileri
│   ├── theme.json        # Tema ayarları
│   └── sessions.json     # Session verileri
├── images/               # Görsel dosyalar
│   ├── blog-covers/      # Blog kapak resimleri
│   ├── blog-content/     # Blog içerik resimleri
│   └── profile/          # Profil resimleri
└── server.js             # Ana backend server
```

### Önemli Bağımlılıklar
- **express**: Web framework
- **jsonwebtoken**: JWT token işlemleri
- **bcryptjs**: Şifre hashleme
- **multer**: Dosya yükleme
- **fs-extra**: Gelişmiş dosya işlemleri
- **express-rate-limit**: Rate limiting
- **cors**: Cross-origin resource sharing
- **node-cron**: Zamanlanmış görevler

---

## 4. Ana Özellikler ve Modüller

### Modül Genel Bakışı
- **Admin API Service**: Tüm API isteklerini merkezi olarak yönetir
- **Blog Manager**: Blog yazılarının CRUD işlemlerini yönetir
- **Gallery Manager**: Resim yükleme, düzenleme ve organizasyon işlemleri
- **Homepage Editor**: Ana sayfa içeriklerini düzenleme ve tema önizleme
- **Markdown Editor**: Blog yazıları için gelişmiş markdown editörü
- **Modal Manager**: Popup pencereler ve form yönetimi
- **Theme Functions**: Tema değişiklikleri ve renk yönetimi
- **Console Logger**: Merkezi log toplama ve analiz sistemi

### Modül İlişkileri
- **Admin API Service** → Tüm modüllerin temel API katmanı
- **Blog Manager** ↔ **Markdown Editor**: Blog yazıları oluşturma/düzenleme
- **Gallery Manager** ↔ **Blog Manager**: Resim yükleme ve blog entegrasyonu
- **Theme Functions** ↔ **Homepage Editor**: Tema değişikliklerinin önizlenmesi
- **Modal Manager** → Tüm modüller: Popup form desteği
- **Console Logger** ← Tüm modüller: Hata ve işlem logları

### API Yapısı
**Kimlik Doğrulama:**
- `POST /api/login` - Giriş yapma
- `POST /api/logout` - Çıkış yapma
- `GET /api/session` - Session kontrolü

**Blog Yönetimi:**
- `GET /api/posts` - Tüm yazıları getir
- `POST /api/posts` - Yeni yazı oluştur
- `PUT /api/posts/:slug` - Yazı güncelle
- `DELETE /api/posts/:slug` - Yazı sil

**Galeri Yönetimi:**
- `POST /api/upload` - Resim yükle
- `GET /api/gallery/:folder` - Klasör içeriğini getir
- `DELETE /api/gallery/:folder/:filename` - Resim sil

**Site Yönetimi:**
- `GET /api/site-config` - Site ayarlarını getir
- `PUT /api/site-config` - Site ayarlarını güncelle
- `GET /api/theme` - Tema ayarlarını getir
- `PUT /api/theme` - Tema ayarlarını güncelle

---

## 5. Kullanıcı Akışları

### Ana Kullanım Senaryoları
1. **Blog Yazısı Oluşturma**: Admin panelden yeni blog yazısı oluşturma, markdown editör ile içerik yazma, resim ekleme ve yayınlama
2. **Blog Yazısı Düzenleme**: Mevcut yazıları bulma, düzenleme ve güncelleme
3. **Galeri Yönetimi**: Resim yükleme, klasörlere organize etme ve gereksiz resimleri silme
4. **Tema Değiştirme**: Dark/Light tema arasında geçiş yapma ve renk paletini özelleştirme
5. **Site İstatistikleri**: Blog yazı sayıları, ziyaretçi istatistikleri ve performans metriklerini görüntüleme
6. **Ana Sayfa Düzenleme**: Kişisel bilgileri, bio metnini ve sosyal medya linklerini güncelleme

### Kullanıcı Tipleri
- **Admin (Site Sahibi)**: Tam yetkili kullanıcı, tüm admin panel özelliklerine erişim
- **Ziyaretçi**: Sadece blog yazılarını okuyabilen, admin paneline erişimi olmayan kullanıcı
- **Sistem**: Otomatik görevleri yürüten arka plan işlemleri (session temizleme, log yönetimi)

### Kimlik Doğrulama ve Yetkilendirme Akışı
1. **Giriş Süreci**: Kullanıcı adı/şifre ile giriş → JWT token oluşturma → Session kaydetme
2. **Token Doğrulama**: Her API isteğinde JWT token kontrolü → Geçerli ise işlem yapma
3. **Session Yönetimi**: Aktif session takibi → Timeout kontrolü → Otomatik çıkış
4. **Güvenlik**: Rate limiting → Başarısız giriş denemeleri takibi → IP engelleme
5. **Çıkış Süreci**: Token geçersizleştirme → Session temizleme → Güvenli çıkış

---

## 6. Veri Yapısı

### Veri Modelleri
**Blog Yazısı (Post):**
```json
{
  "slug": "yazı-url-adı",
  "title": "Yazı Başlığı",
  "excerpt": "Kısa özet",
  "date": "2025-01-24",
  "cover": "kapak-resmi-yolu",
  "coverCaption": "Kapak resmi açıklaması",
  "tags": ["etiket1", "etiket2"],
  "featured": true/false,
  "status": "published/draft",
  "publishDate": "2025-01-24T01:48:00.000Z",
  "createdAt": "2025-01-24T01:48:00.000Z",
  "updatedAt": "2025-01-24T01:48:00.000Z"
}
```

**Kullanıcı (User):**
```json
{
  "username": "kullanıcı_adı",
  "password": "hashlenmiş_şifre",
  "lastUpdated": "2025-01-24T01:48:00.000Z",
  "isHashed": true
}
```

**Tema (Theme):**
```json
{
  "light": {
    "bg": "#f3f3ec",
    "panel": "#fafaf8",
    "ink": "#0b0b0b",
    "muted": "#6b7280",
    "line": "#e5e7eb",
    "accent": "#152bcb"
  },
  "dark": { /* dark tema renkleri */ },
  "borderRadius": 16,
  "shadowIntensity": 60,
  "fontFamily": "Inter"
}
```

### Dosya Yapıları
- **posts.json**: Blog yazılarının metadata bilgileri
- **users.json**: Kullanıcı bilgileri ve şifre hashleri
- **theme.json**: Tema renkleri ve görsel ayarları
- **site.json**: Site genel ayarları (başlık, açıklama, sosyal medya linkleri)
- **sessions.json**: Aktif kullanıcı session bilgileri
- **stats.json**: Site istatistikleri ve analiz verileri
- **content/posts/*.md**: Markdown formatında blog yazı içerikleri

### Veri Akışı
1. **Blog Yazısı Oluşturma**: Form verisi → API → posts.json güncelleme → Markdown dosyası oluşturma
2. **Resim Yükleme**: Dosya → Multer işleme → images/ klasörüne kaydetme → URL döndürme
3. **Tema Değişikliği**: Tema ayarları → theme.json güncelleme → Frontend'e CSS değişkenleri gönderme
4. **Session Yönetimi**: Giriş → JWT token oluşturma → sessions.json'a kaydetme → Her istekte doğrulama
5. **İstatistik Toplama**: Sayfa ziyaretleri → stats.json güncelleme → Admin panelde görüntüleme

---

## 7. Güvenlik ve Kimlik Doğrulama

### Güvenlik Önlemleri
- **JWT Token Tabanlı Kimlik Doğrulama**: Güvenli token sistemi ile kullanıcı doğrulama
- **Bcrypt Şifre Hashleme**: Şifreler bcrypt ile hashlenerek saklanır
- **Rate Limiting**: API isteklerinde dakika başına maksimum istek sınırı
- **CORS Koruması**: Sadece belirlenen domain'lerden isteklere izin
- **Session Timeout**: Belirli süre hareketsizlik sonrası otomatik çıkış
- **IP Engelleme**: Başarısız giriş denemeleri sonrası IP engelleme
- **Input Validation**: Tüm kullanıcı girdilerinde doğrulama ve sanitizasyon

### Kimlik Doğrulama Mekanizması
1. **Giriş Süreci**: Kullanıcı adı/şifre kontrolü → bcrypt ile şifre doğrulama
2. **Token Oluşturma**: Başarılı giriş sonrası JWT token oluşturma (60 dakika geçerli)
3. **Session Kaydetme**: Token bilgileri sessions.json dosyasına kaydetme
4. **Middleware Kontrolü**: Her API isteğinde authenticateToken middleware ile doğrulama
5. **Token Yenileme**: Geçerli token ile yeni token oluşturma imkanı
6. **Güvenli Çıkış**: Token geçersizleştirme ve session temizleme

### Hassas Veri Yönetimi
- **Şifre Güvenliği**: Bcrypt ile hashleme, salt rounds: 12
- **Token Güvenliği**: JWT secret key ile imzalama, environment variable'da saklama
- **Session Verileri**: Aktif session'lar JSON dosyasında şifrelenmiş olarak saklanır
- **Dosya İzinleri**: Hassas dosyalar için uygun dosya izinleri (600, 644)
- **Environment Variables**: Hassas bilgiler .env dosyasında saklanır
- **Log Güvenliği**: Hassas bilgiler log dosyalarına yazılmaz
- **Backup Güvenliği**: Yedek dosyalar güvenli konumda saklanır

---

## 8. Dağıtım ve Konfigürasyon

### Dağıtım Stratejisi
- **Production Domain**: https://cihanenesdurgun.com
- **cPanel Git Deployment**: GitHub repository ile otomatik deployment
- **Node.js Hosting**: Shared hosting üzerinde Node.js uygulaması çalıştırma
- **SSL Sertifikası**: Let's Encrypt ile otomatik SSL sertifikası
- **Domain Yönlendirme**: www ve non-www versiyonları için yönlendirme
- **Backup Stratejisi**: Otomatik günlük yedekleme sistemi
- **Monitoring**: Uptime monitoring ve hata takibi

### Ortam Değişkenleri
```bash
# Güvenlik Ayarları
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters-long
BCRYPT_SALT_ROUNDS=12
SESSION_TIMEOUT=60
SESSION_IDLE_TIMEOUT=15
MAX_SESSIONS_PER_USER=3
RATE_LIMIT_MAX=100

# CORS ve Domain Ayarları
CORS_ORIGIN=https://cihanenesdurgun.com
NODE_ENV=production
PORT=3000

# Log ve Backup
LOG_LEVEL=info
BACKUP_INTERVAL=24
```

### Konfigürasyon Dosyaları
- **config.json**: Development/Production ortam ayarları ve API URL'leri
- **package.json**: Proje bağımlılıkları ve script tanımları
- **.env**: Hassas environment variables (production'da gizli)
- **deploy.sh**: Otomatik deployment script'i
- **setup-production.js**: Production ortamı kurulum script'i
- **DEPLOYMENT_GUIDE.md**: Detaylı deployment rehberi
- **SECURITY_SETUP.md**: Güvenlik konfigürasyon rehberi

---

## 9. Gelecek Planı

### Planlanmış Özellikler
- **Çoklu Kullanıcı Desteği**: Birden fazla admin kullanıcısı yönetimi
- **Yorum Sistemi**: Blog yazılarına ziyaretçi yorumları ekleme
- **Email Bildirimleri**: Yeni yorum ve etkileşim bildirimleri
- **SEO İyileştirmeleri**: Meta tag optimizasyonu ve sitemap güncellemeleri
- **Analytics Entegrasyonu**: Google Analytics veya Plausible entegrasyonu
- **Mobil Uygulama**: React Native ile mobil admin uygulaması
- **API Dokümantasyonu**: Swagger/OpenAPI ile API dokümantasyonu
- **Otomatik Backup**: Cloud storage entegrasyonu ile otomatik yedekleme

### Bilinen Limitasyonlar
- **Tek Kullanıcı**: Şu anda sadece tek admin kullanıcısı destekleniyor
- **Dosya Boyutu**: Resim yükleme için maksimum dosya boyutu sınırı
- **Veritabanı**: JSON dosya tabanlı sistem, büyük veri setleri için sınırlı
- **Real-time**: WebSocket desteği yok, gerçek zamanlı güncellemeler sınırlı
- **Çoklu Dil**: Sadece Türkçe dil desteği mevcut
- **Cache**: Gelişmiş cache mekanizması bulunmuyor
- **Search**: Gelişmiş arama ve filtreleme özellikleri sınırlı

### İyileştirme Alanları
- **Performans**: Büyük resim dosyaları için optimizasyon ve lazy loading
- **Güvenlik**: Two-factor authentication (2FA) ekleme
- **UX/UI**: Admin panel arayüzünün modernizasyonu
- **Kod Kalitesi**: TypeScript'e geçiş ve unit test ekleme
- **Monitoring**: Detaylı hata takibi ve performans metrikleri
- **Accessibility**: WCAG standartlarına uygunluk iyileştirmeleri
- **Mobile Responsive**: Admin panel mobil uyumluluğunun artırılması
- **API Rate Limiting**: Daha esnek rate limiting stratejileri

---

## 10. Geliştirme Rehberi

### Kod Standartları
- **JavaScript**: ES6+ standartları, modern JavaScript özelliklerinin kullanımı
- **Modüler Yapı**: Her özellik ayrı modül olarak organize edilmeli
- **Error Handling**: Try-catch blokları ile hata yönetimi
- **Async/Await**: Promise'ler yerine async/await kullanımı
- **Code Comments**: Karmaşık fonksiyonlar için Türkçe açıklamalar
- **Consistent Formatting**: Tutarlı kod formatlaması ve girintileme
- **Security First**: Güvenlik öncelikli kod yazımı
- **Performance**: Optimize edilmiş kod yapısı

### İsimlendirme Kuralları
- **Dosya İsimleri**: kebab-case (admin-api-service.js)
- **Fonksiyon İsimleri**: camelCase (getUserInfo, createNewPost)
- **Değişken İsimleri**: camelCase (userData, postList)
- **Sabitler**: UPPER_SNAKE_CASE (JWT_SECRET, API_BASE_URL)
- **CSS Sınıfları**: kebab-case (.admin-panel, .blog-post)
- **API Endpoint'leri**: kebab-case (/api/blog-posts, /api/user-info)
- **JSON Anahtarları**: camelCase (publishDate, coverImage)
- **Klasör İsimleri**: kebab-case (blog-content, admin-panel)

### Katkı Sağlama Rehberi
1. **Fork ve Clone**: Repository'yi fork edip local'e clone edin
2. **Branch Oluşturma**: Feature branch oluşturun (feature/yeni-ozellik)
3. **Kod Yazma**: Kod standartlarına uygun şekilde geliştirme yapın
4. **Test Etme**: Değişiklikleri test edin ve hata kontrolü yapın
5. **Commit Mesajları**: Açıklayıcı commit mesajları yazın
6. **Pull Request**: Detaylı açıklama ile PR oluşturun
7. **Code Review**: Kod incelemesi sonrası merge işlemi
8. **Dokümantasyon**: Yeni özellikler için dokümantasyon güncellemesi

---

## Doküman Bilgileri

**Oluşturulma Tarihi:** 22 Ekim 2025
**Son Güncelleme:** 22 Ekim 2025
**Versiyon:** 2.0.4
**Sorumlu:** Cihan Enes Durgun
