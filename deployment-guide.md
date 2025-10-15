# Hosting Deployment Rehberi

## cPanel Node.js Hosting Deployment Adımları

### 1. Hosting Hazırlığı
- cPanel'e giriş yapın
- "Setup Node.js App" bölümünü bulun
- Yeni uygulama oluşturun

### 2. Dosya Yükleme
Aşağıdaki dosyaları hosting'e yükleyin:

**Zorunlu Dosyalar:**
- `server.js` (ana sunucu dosyası)
- `package.json` (bağımlılıklar)
- `package-lock.json` (bağımlılık kilidi)

**Klasörler:**
- `content/` (blog içerikleri)
- `data/` (kullanıcı verileri, istatistikler)
- `images/` (resimler)
- `admin/` (admin paneli)

**HTML Dosyaları:**
- `index.html` (ana sayfa)
- `blog.html` (blog sayfası)
- `post.html` (blog yazısı sayfası)

**CSS/JS Dosyaları:**
- `styles.css`
- `blogstyle.css`
- `post.css`
- `scripts.js`
- `blog.js`
- `post.js`

### 3. cPanel Node.js Ayarları

**Uygulama Ayarları:**
- **Node.js version:** 18.x veya üzeri
- **Application mode:** Production
- **Application URL:** yourdomain.com
- **Application root:** public_html/nodejs
- **Application startup file:** server.js

**Environment Variables:**
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
PORT=3000
```

### 4. Bağımlılık Kurulumu
cPanel'de terminal açın veya SSH kullanın:
```bash
cd public_html/nodejs
npm install --production
```

### 5. Uygulama Başlatma
cPanel'de "Restart App" butonuna tıklayın.

### 6. Domain Ayarları
- Domain'inizi Node.js uygulamasına yönlendirin
- SSL sertifikası ekleyin (https için)

### 7. Test Etme
- `yourdomain.com` - Ana sayfa
- `yourdomain.com/admin` - Admin paneli
- `yourdomain.com/blog` - Blog sayfası

## Önemli Notlar

### Güvenlik
- JWT_SECRET'i değiştirin
- Admin şifresini değiştirin
- SSL sertifikası kullanın

### Dosya İzinleri
- `data/` klasörü: 755
- `images/` klasörü: 755
- `content/` klasörü: 755

### Hata Ayıklama
- cPanel error logs'u kontrol edin
- Node.js uygulama loglarını inceleyin

## Yedekleme
- Düzenli olarak `data/` klasörünü yedekleyin
- `content/` klasörünü yedekleyin
- `images/` klasörünü yedekleyin

