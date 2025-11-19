# Personal Site - Version 2.0.4

Modern blog yönetim sistemi ile kişisel web sitesi. Backend API ve admin panel entegrasyonu ile tam fonksiyonel blog yönetimi ve hesap yönetimi sistemi. Production deployment desteği ve domain entegrasyonu ile profesyonel web sitesi.

## 📚 Version Documentation

Tüm versiyon dokümantasyonu `version-notes/` klasöründe bulunur:
- **Version 2.0.4**: Modüler Mimari & Sistem İyileştirmeleri - JavaScript modülerleştirme ve merkezi API yönetimi
- **Version 2.0.3**: Modern Editor Redesign & Post Page Integration - Gelişmiş resim yönetimi ve modern editör tasarımı
- **Version 2.0.2**: Frontend Enhancement & Theme System Update - Ana sayfa iyileştirmeleri ve tema sistemi
- **Version 2.0.1**: Security Enhancement Release - Enterprise-grade security features
- **Version 14.0.0**: Security & performance enhancement system (legacy)

Detaylı bilgi için: [`version-notes/v2.0.4.md`](version-notes/v2.0.4.md)

## 🆕 Version 2.0.4 Yenilikleri

### 🏗️ Modüler Mimari & Sistem İyileştirmeleri
- **Admin panel JavaScript modülerleştirildi** - Her özellik ayrı modül olarak organize edildi
- **Merkezi API servis katmanı** - Tüm API istekleri tek noktadan yönetiliyor
- **Gelişmiş modal yönetim sistemi** - Keyboard navigation ve accessibility desteği
- **Server-side tema senkronizasyonu** - Admin panel tema değişiklikleri anında yansıyor
- **Kapsamlı galeri yönetim modülü** - Resim yükleme, düzenleme ve organizasyon
- **Gelişmiş blog yönetim modülü** - CRUD işlemleri ve güvenlik özellikleri
- **Ana sayfa editör modülü** - Live preview ve tema önizleme sistemi
- **Markdown editör iyileştirmeleri** - Gelişmiş formatlama araçları
- **Konsol log yönetim sistemi** - Merkezi log toplama ve analiz
- **Development/Production mode** - Esnek API yapılandırması

## 🆕 Version 2.0.3 Yenilikleri

### 🎨 Modern Editor Redesign & Advanced Image Management
- **Ana sayfa scripts.js tamamen yenilendi** - Server-side tema entegrasyonu
- **Gelişmiş tema yönetimi** - Admin panelindeki tema ayarları ana sayfaya yansıyor
- **Rate limiting sorunları çözüldü** - Daha esnek ayarlar ve hata yönetimi
- **Cache sistemi kaldırıldı** - Okuma süresi hesaplama performansı iyileştirildi
- **Card link yapısı düzeltildi** - Daha iyi erişilebilirlik ve UX
- **Production/Development mode desteği** - İstatistik tracking için

### 🔧 Technical Improvements
- **Server-side tema entegrasyonu** - `/api/theme` endpoint'inden tema yükleme
- **Gelişmiş fallback sistemi** - Server başarısız olursa localStorage kullanımı
- **Async tema yükleme** - Sayfa yüklenmeden önce tema uygulanıyor
- **Tema senkronizasyonu** - Admin panelindeki değişiklikler anında yansıyor

## 🆕 Version 2.0.1 Yenilikleri

### 🔐 Enterprise-Grade Security System
- **Server-side session management** with automatic cleanup
- **Advanced authentication system** with JWT + Session validation
- **Comprehensive rate limiting** for API and login protection
- **Security headers implementation** (XSS, clickjacking protection)
- **IP and User-Agent validation** for session hijacking prevention
- **Environment-based configuration** with secure defaults

### 🛡️ Security Features
- **Concurrent session limiting** (max 3 sessions per user)
- **Idle timeout protection** (15 minutes inactivity auto-logout)
- **Password security improvements** with secure random generation
- **CORS configuration** with production/development modes
- **Automatic session cleanup** every 5 minutes
- **Security audit logging** and monitoring

## 🆕 Version 13.0.0 Yenilikleri (Legacy)

### 🔄 Gelişmiş Development/Production Mode Sistemi
- **Comment-based configuration** ile kolay domain değiştirme
- **Seamless switching** between localhost and production
- **Maintainable codebase** with clear mode indicators
- **Production-ready deployment** preparation

### 🎨 Gelişmiş Tema Yönetimi
- **Server-side theme synchronization** across all devices
- **Proper authentication** for theme API endpoints
- **Enhanced accessibility** with focus management
- **Modal improvements** with keyboard navigation

### 🔧 Teknik İyileştirmeleri
- **Consistent reading time calculation** across all pages
- **Robust admin authentication** with proper token handling
- **Performance optimizations** and error handling
- **Accessibility compliance** improvements

### 📱 UI/UX İyileştirmeleri
- **Larger hero text** for better visibility
- **Optimized mobile spacing** and responsive design
- **Modern tag fonts** with Inter typography
- **Enhanced modal behavior** and focus management

## 🆕 Version 12.0.1 Yenilikleri

### 🎨 UI/UX İyileştirmeleri
- **Ana sayfa kicker metni** boyutu artırıldı (tüm ekran boyutları için)
- **Blog sayfası başlık boşlukları** optimize edildi (mobil görünüm)
- **Etiket filtreleme sistemi** modern font ve renk düzenlemeleri
- **Mobil etiket renk sorunu** çözüldü (mavi renk problemi giderildi)
- **Responsive tasarım** iyileştirmeleri

### 🔧 Teknik İyileştirmeleri
- **Okuma süresi hesaplama** tutarlılığı sağlandı (tüm sayfalarda aynı sonuç)
- **Tema senkronizasyonu** sistemi eklendi (server-side storage)
- **Reading time cache** sistemi kaldırıldı (güncel hesaplama için)
- **API endpoint** tutarlılığı sağlandı

### 📱 Mobil Optimizasyonlar
- **Etiket font ailesi** Inter olarak güncellendi
- **Letter-spacing** optimizasyonu (-0.01em)
- **Font-weight** 500 olarak ayarlandı (daha modern görünüm)
- **Responsive font boyutları** optimize edildi

## 🆕 Version 11.0.0 Yenilikleri

### 🌐 Production Deployment
- **cPanel Node.js desteği** ile tam hosting uyumluluğu
- **SSL/HTTPS desteği** ile güvenli bağlantı
- **Domain entegrasyonu** (cihanenesdurgun.com)
- **Environment variables** ile production yapılandırması
- **Performance optimizasyonları** ile hızlı yükleme

### 🔐 Güvenlik İyileştirmeleri
- **Production-grade JWT secrets** ile gelişmiş güvenlik
- **HTTPS enforcement** ile tüm API iletişimi
- **Enhanced authentication** ile production-ready güvenlik
- **Secure file upload** ile güvenli dosya yükleme

### 🔐 Hesap Yönetimi
- **Kullanıcı adı değiştirme** fonksiyonu
- **Şifre değiştirme** sistemi
- **Eski şifre doğrulama** güvenliği
- **Otomatik logout** after password change

### 🎨 Ana Sayfa Düzenleyici
- **Live preview** sistemi (16:9 monitor simülasyonu)
- **Avatar fotoğrafı** değiştirme
- **İsim ve başlık** düzenleme
- **Kişisel bio** düzenleme
- **Sosyal medya linkleri** yönetimi

### 🔒 Güvenlik İyileştirmeleri
- **Gerçek şifre güncelleme** sistemi
- **Kullanıcı bilgileri** JSON dosyasında saklama
- **Son güncelleme tarihi** takibi
- **Türkçe hata mesajları**

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
   - Ana site: `https://cihanenesdurgun.com`
- Admin panel: `https://cihanenesdurgun.com/admin/login.html`

### Production Deployment
- **Domain**: `https://cihanenesdurgun.com`
- **Admin Panel**: `https://cihanenesdurgun.com/admin`
- **Blog**: `https://cihanenesdurgun.com/blog`

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

- **📦 [Deployment Rehberleri](./docs/deployment/)** - cPanel yükleme, deployment adımları
- **🔒 [Güvenlik Dokümantasyonu](./docs/security/)** - Environment variables, güvenlik kurulumu
- **📋 [Proje Bilgileri](./docs/project/)** - Proje özeti, sistem analizi raporları

Hızlı başlangıç için: [`docs/deployment/quick-start-cpanel.md`](./docs/deployment/quick-start-cpanel.md)

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

**Personal Site v2.0.4** - Cihan Enes Durgun

*Production Deployed at: https://cihanenesdurgun.com* 