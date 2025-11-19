# Personal Site - Version 0.1.0

Modern blog yönetim sistemi ile kişisel web sitesi. Backend API ve admin panel entegrasyonu ile tam fonksiyonel blog yönetimi ve hesap yönetimi sistemi.

**Durum:** Initial Development (v0.x.x = Unstable)

## 📚 Version Documentation

Detaylı versiyon bilgisi ve özellik listesi için: [`version-notes/v0.1.0.md`](version-notes/v0.1.0.md)

Bu sürüm (v0.1.0), Semantic Versioning standartlarına göre **ilk geliştirme aşamasındaki** bir sürümdür. Production-ready stabil sürüm v1.0.0 olarak yayınlanacaktır.

## 🆕 Version 0.1.0 Özellikleri

Initial development release ile gelen özellikler için detaylı bilgi: [`version-notes/v0.1.0.md`](version-notes/v0.1.0.md)

## 🚀 Özellikler

### 🌐 Ana Site
- **Modern Tasarım**: Responsive ve kullanıcı dostu arayüz
- **Dark/Light Tema**: Otomatik tema değiştirme
- **Blog Sistemi**: Markdown destekli blog yazıları
- **SEO Optimizasyonu**: Meta etiketleri ve sitemap

### 🔐 Admin Panel
- **Güvenli Giriş**: JWT token tabanlı kimlik doğrulama
- **Blog Yönetimi**: CRUD işlemleri (Oluştur, Oku, Güncelle, Sil)
- **Dashboard**: İstatistikler ve hızlı erişim
- **Dosya Yükleme**: Görsel yükleme sistemi
- **Gerçek Zamanlı**: API ile anlık güncellemeler

## 🛠️ Teknolojiler

### Frontend
- **HTML5**: Semantik markup
- **CSS3**: Modern stiller ve animasyonlar
- **JavaScript (ES6+)**: Dinamik işlevsellik
- **LocalStorage**: Oturum yönetimi

### Backend
- **Node.js**: Server-side JavaScript
- **Express.js**: Web framework
- **JWT**: Kimlik doğrulama
- **Multer**: Dosya yükleme
- **fs-extra**: Dosya sistemi işlemleri

## 📦 Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın**
   ```bash
   git clone <repository-url>
   cd personal-site
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Backend server'ı başlatın**
   ```bash
   npm start
   # veya geliştirme modu için
   npm run dev
   ```

4. **Tarayıcıda açın**
   - Ana site: `http://localhost:3000`
   - Admin panel: `http://localhost:3000/admin/login.html`

### Production Deployment
Production deployment henüz tamamlanmamıştır. Geliştirme devam etmektedir.

## 🔐 Admin Panel Giriş

Admin panele erişmek için `/admin/login.html` adresinden giriş yapabilirsiniz.
Güvenlik nedeniyle giriş bilgileri bu dokümanda paylaşılmamaktadır.

### Özellikler
- **Dashboard**: Blog istatistikleri
- **Yeni Yazı**: Markdown editör ile yazı oluşturma
- **Düzenleme**: Mevcut yazıları güncelleme
- **Silme**: Yazıları güvenli şekilde silme
- **Arama/Filtreleme**: Yazıları kolayca bulma

## 📁 Proje Yapısı

```
personal-site/
├── admin/                 # Admin panel dosyaları
│   ├── index.html        # Ana admin sayfası
│   ├── login.html        # Giriş sayfası
│   ├── admin.css         # Admin stilleri
│   ├── admin.js          # Admin JavaScript
│   ├── auth.js           # Kimlik doğrulama
│   ├── login.css         # Login stilleri
│   └── login.js          # Login JavaScript
├── content/              # İçerik dosyaları
│   ├── posts.json        # Blog yazıları metadata
│   └── posts/            # Markdown dosyaları
├── docs/                 # Dokümantasyon
│   ├── deployment/       # Deployment rehberleri
│   ├── security/         # Güvenlik dokümantasyonu
│   └── project/          # Proje bilgileri
├── images/               # Görseller
├── server.js             # Backend API server
├── package.json          # Proje bağımlılıkları
└── README.md             # Bu dosya
```

## 📚 Dokümantasyon

Tüm dokümantasyon dosyaları [`docs/`](./docs/) klasöründe organize edilmiştir:

- **🔒 [Güvenlik Dokümantasyonu](./docs/security/)** - Environment variables, güvenlik kurulumu
- **📋 [Proje Bilgileri](./docs/project/)** - Proje özeti, sistem analizi raporları
- **📖 [Versiyon Notları](./version-notes/)** - Tüm versiyon dokümantasyonu

## 🔧 API Endpoints

### Kimlik Doğrulama
- `POST /api/login` - Giriş yapma

### Blog Yazıları
- `GET /api/posts` - Tüm yazıları getir
- `GET /api/posts/:slug` - Tek yazı getir
- `POST /api/posts` - Yeni yazı oluştur
- `PUT /api/posts/:slug` - Yazı güncelle
- `DELETE /api/posts/:slug` - Yazı sil

### Diğer
- `POST /api/upload` - Görsel yükleme
- `GET /api/stats` - Dashboard istatistikleri
- `GET /api/health` - Sağlık kontrolü

## 🚀 Kullanım

### Blog Yazısı Oluşturma
1. Admin paneline giriş yapın
2. "Yeni Blog Yazısı" butonuna tıklayın
3. Formu doldurun:
   - **Başlık**: Yazının başlığı
   - **Özet**: Kısa açıklama
   - **Tarih**: Yayın tarihi
   - **Etiketler**: Virgülle ayrılmış etiketler
   - **İçerik**: Markdown formatında
   - **Öne Çıkan**: Öne çıkan yazı olarak işaretleme
4. "Yazıyı Kaydet" butonuna tıklayın

### Yazı Düzenleme
1. Yazı listesinde "Düzenle" butonuna tıklayın
2. Form otomatik olarak doldurulur
3. Değişiklikleri yapın
4. "Değişiklikleri Kaydet" butonuna tıklayın

### Yazı Silme
1. Yazı listesinde "Sil" butonuna tıklayın
2. Onay dialogunda "Evet, Sil" butonuna tıklayın

## 🔒 Güvenlik

### Kimlik Doğrulama
- JWT token tabanlı sistem
- 24 saat token geçerliliği
- Otomatik oturum sonlandırma

### Güvenlik Önlemleri
- CORS koruması
- Input validation
- XSS koruması
- CSRF koruması (gelecek sürümde)

## 🎨 Tema Sistemi

### Light Tema
- Açık arka plan
- Koyu metin
- Yeşil accent rengi (#84CC16)

### Dark Tema
- Koyu arka plan
- Açık metin
- Aynı accent rengi

## 📱 Responsive Tasarım

### Desktop (1200px+)
- Tam genişlik layout
- Yan yana form alanları
- Hover efektleri

### Tablet (768px - 1199px)
- Orta genişlik layout
- Tek kolon form alanları
- Touch-friendly butonlar

### Mobil (320px - 767px)
- Tam genişlik layout
- Kompakt tasarım
- Touch-optimized arayüz

## 🚀 Gelecek Geliştirmeler

- [ ] **Çoklu Kullanıcı**: Birden fazla admin kullanıcısı
- [ ] **Rol Sistemi**: Farklı yetki seviyeleri
- [ ] **Medya Kütüphanesi**: Gelişmiş dosya yönetimi
- [ ] **Yorum Sistemi**: Blog yorumları
- [ ] **Analytics**: Detaylı istatistikler
- [ ] **Backup**: Otomatik yedekleme
- [ ] **Email Bildirimleri**: Yeni yazı bildirimleri

## 🐛 Sorun Giderme

### Server Başlatılamıyor
```bash
# Port kontrolü
netstat -ano | findstr :3000

# Node.js versiyonu kontrolü
node --version
```

### Admin Panel Erişim Sorunu
- Backend server'ın çalıştığından emin olun
- Tarayıcı konsolunda hata mesajlarını kontrol edin
- CORS ayarlarını kontrol edin

### Dosya Yazma Hatası
- `content/` klasörünün yazma izinlerini kontrol edin
- Disk alanını kontrol edin

## 📞 Destek

Herhangi bir sorun yaşarsanız veya öneriniz varsa, lütfen iletişime geçin.

---

**Personal Site v0.1.0** - Initial Development Release  
Cihan Enes Durgun

*Status: Active Development | Production deployment planlanıyor* 