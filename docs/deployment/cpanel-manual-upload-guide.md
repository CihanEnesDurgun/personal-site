# 🚀 cPanel Manuel Upload Rehberi

## 📋 Hazırlık Adımları

### 1. Yüklenecek Dosyalar Listesi

Aşağıdaki dosya ve klasörleri cPanel'e yükleyin:

**✅ Yüklenecek Dosyalar:**
- `server.js` (Ana sunucu dosyası)
- `package.json` (Bağımlılıklar)
- `package-lock.json` (Bağımlılık kilidi)
- `config.json` (Konfigürasyon)
- `index.html` (Ana sayfa)
- `blog.html` (Blog sayfası)
- `post.html` (Blog yazısı sayfası)
- `styles.css` (Ana stil dosyası)
- `blogstyle.css` (Blog stilleri)
- `post.css` (Post stilleri)
- `scripts.js` (Ana JavaScript)
- `blog.js` (Blog JavaScript)
- `post.js` (Post JavaScript)
- `theme-manager.js` (Tema yöneticisi)
- `rss.xml` (RSS feed)
- `sitemap.xml` (Sitemap)
- `env.example` (Environment örneği)

**✅ Yüklenecek Klasörler:**
- `admin/` (Tüm içeriği ile)
- `content/` (Tüm içeriği ile)
- `data/` (Tüm içeriği ile)
- `images/` (Tüm içeriği ile)
- `lib/` (Tüm içeriği ile)
- `markdown-editor/` (Eğer kullanılıyorsa)

**❌ Yüklenmeyecek Dosyalar:**
- `node_modules/` (cPanel'de `npm install` ile yüklenecek)
- `.env` (Lokal dosya, cPanel'de oluşturulacak)
- `logs/` (Otomatik oluşturulacak)
- `.git/` (Git klasörü)
- `.vscode/`, `.idea/` (IDE klasörleri)

---

## 📤 cPanel'e Yükleme Adımları

### Adım 1: File Manager'a Giriş

1. cPanel hesabınıza giriş yapın
2. **"File Manager"** (Dosya Yöneticisi) bölümüne gidin
3. **"public_html"** klasörüne gidin veya uygulamanızı koyacağınız klasöre gidin

> **Not:** Eğer Node.js uygulaması için özel bir klasör kullanacaksanız (örn: `nodejs`, `app`), önce bu klasörü oluşturun.

### Adım 2: Dosyaları Yükleme

**Yöntem 1: ZIP ile Toplu Yükleme (Önerilen)**

1. Yerel bilgisayarınızda tüm dosyaları bir ZIP dosyasına sıkıştırın
   - `node_modules/` klasörünü **DAHIL ETMEYİN**
   - `.env` dosyasını **DAHIL ETMEYİN**
   - `.git/` klasörünü **DAHIL ETMEYİN**

2. cPanel File Manager'da:
   - **"Upload"** butonuna tıklayın
   - ZIP dosyasını seçip yükleyin
   - Yükleme tamamlandıktan sonra ZIP dosyasını **sağ tık → Extract** yapın
   - ZIP dosyasını silin

**Yöntem 2: Tek Tek Dosya Yükleme**

1. Her dosya/klasörü tek tek **Upload** ile yükleyin
2. Klasörler için **"Create Folder"** ile klasör oluşturup içine dosyaları yükleyin

---

## ⚙️ Node.js Uygulaması Kurulumu

### Adım 3: Node.js App Oluşturma

1. cPanel ana sayfasında **"Node.js Selector"** veya **"Setup Node.js App"** bölümünü bulun
2. **"Create Application"** butonuna tıklayın
3. Aşağıdaki ayarları yapın:

   ```
   Node.js Version: 18.x veya 20.x (mümkünse en son LTS versiyonu)
   Application Mode: Production
   Application Root: public_html (veya oluşturduğunuz klasör)
   Application URL: / (veya /app gibi bir alt dizin)
   Application Startup File: server.js
   Application Entry Point: server.js
   ```

4. **"Create"** butonuna tıklayın

### Adım 4: Environment Variables Ayarlama

Node.js App ayarlarında **"Environment Variables"** bölümüne gidin ve şu değişkenleri ekleyin:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-CHANGE-THIS
BCRYPT_SALT_ROUNDS=12
DEFAULT_ADMIN_PASSWORD=your-secure-password-here-CHANGE-THIS
SESSION_TIMEOUT=60
SESSION_IDLE_TIMEOUT=15
MAX_SESSIONS_PER_USER=3
SESSION_CLEANUP_INTERVAL=5
RATE_LIMIT_MAX=100
CORS_ORIGIN=https://cihanenesdurgun.com
LOG_LEVEL=info
LOG_FILE=./logs/app.log
PORT=3000
DEBUG=false
```

> **🔒 ÖNEMLİ GÜVENLİK NOTU:** 
> - `JWT_SECRET` değerini mutlaka değiştirin! En az 32 karakter olmalı.
> - `DEFAULT_ADMIN_PASSWORD` değerini mutlaka değiştirin!
> - Bu değerleri güçlü ve benzersiz yapın.

### Adım 5: Bağımlılıkları Yükleme

1. cPanel'de **"Terminal"** veya **"SSH Access"** bölümünü açın
2. Veya Node.js App ayarlarında **"Console"** butonunu kullanın
3. Şu komutları çalıştırın:

```bash
cd ~/public_html
# veya oluşturduğunuz klasör yolu
# cd ~/public_html/nodejs

npm install --production
```

Bu işlem birkaç dakika sürebilir.

### Adım 6: Dosya İzinlerini Ayarlama

File Manager'da şu klasörlere yazma izni verin:

```
data/ → 755 (veya 775)
images/ → 755 (veya 775)
logs/ → 755 (veya 775)
content/ → 755
```

> **Not:** File Manager'da klasöre sağ tık → **"Change Permissions"** → `755` veya `775` seçin.

### Adım 7: Uygulamayı Başlatma

1. Node.js App ayarlarına geri dönün
2. **"Restart App"** veya **"Run Setup"** butonuna tıklayın
3. Uygulamanın başladığını kontrol edin (yeşil ışık/aktif durumu)

---

## 🔧 Ek Ayarlar

### .env Dosyası Oluşturma (Opsiyonel)

Eğer Node.js Selector environment variables'ı desteklemiyorsa:

1. File Manager'da kök dizinde `.env` dosyası oluşturun
2. `env.example` dosyasını açıp içeriğini `.env` dosyasına kopyalayın
3. Production değerleriyle güncelleyin

### Domain ve SSL Ayarları

1. **cPanel → SSL/TLS** bölümüne gidin
2. **"Let's Encrypt SSL"** ile ücretsiz SSL sertifikası kurun
3. Domain'inizin Node.js uygulamasına yönlendirildiğinden emin olun

> **Not:** Bazı hosting sağlayıcılar Node.js uygulamalarını otomatik olarak domain'e yönlendirir. Eğer yönlendirme yoksa, `.htaccess` dosyası veya cPanel'in "Redirects" özelliğini kullanabilirsiniz.

---

## ✅ Kontrol Listesi

Yükleme sonrası kontrol edin:

- [ ] Tüm dosyalar yüklendi mi?
- [ ] `package.json` ve `server.js` dosyaları var mı?
- [ ] Node.js uygulaması oluşturuldu mu?
- [ ] Environment variables ayarlandı mı?
- [ ] `npm install` başarıyla çalıştı mı?
- [ ] Dosya izinleri doğru mu? (data/, images/, logs/)
- [ ] Uygulama başlatıldı mı? (aktif durum)
- [ ] SSL sertifikası kuruldu mu?
- [ ] Domain ayarları yapıldı mı?

---

## 🧪 Test Etme

### 1. Ana Sayfa Testi
```
https://cihanenesdurgun.com
```

### 2. Blog Sayfası Testi
```
https://cihanenesdurgun.com/blog.html
```

### 3. Admin Panel Giriş
```
https://cihanenesdurgun.com/admin/login.html
```
- **Kullanıcı adı:** `admin`
- **Şifre:** `.env` dosyasında belirlediğiniz `DEFAULT_ADMIN_PASSWORD`

> **🔒 ÖNEMLİ:** İlk girişten sonra admin şifresini mutlaka değiştirin!

### 4. API Testi
```
https://cihanenesdurgun.com/api/health
```
veya
```
https://cihanenesdurgun.com/api/posts
```

---

## 🐛 Sorun Giderme

### Uygulama Başlamıyor

1. **Logları Kontrol Edin:**
   - Node.js App ayarlarında **"View Logs"** bölümüne bakın
   - File Manager'da `logs/` klasöründeki log dosyalarını kontrol edin

2. **Port Kontrolü:**
   - Bazı hosting sağlayıcılar otomatik port atar
   - `PORT` environment variable'ını kontrol edin

3. **Dependencies Kontrolü:**
   ```bash
   npm install --production
   ```

### 404 Hataları

- Statik dosyaların (HTML, CSS, JS) doğru yerde olduğundan emin olun
- Node.js uygulamasının static dosyaları serve ettiğini kontrol edin

### API Çalışmıyor

- CORS ayarlarını kontrol edin (`CORS_ORIGIN`)
- JWT_SECRET'in doğru ayarlandığından emin olun
- API endpoint'lerinin doğru çalıştığını test edin

### Dosya Yükleme Sorunu

- `images/` klasörüne yazma izni verildiğinden emin olun (755 veya 775)
- Multer ayarlarını kontrol edin

---

## 📞 Destek

Sorun yaşarsanız:
1. Log dosyalarını kontrol edin
2. Environment variables'ı kontrol edin
3. Dosya izinlerini kontrol edin
4. Node.js versiyonunu kontrol edin (18.x veya üzeri)

---

**🎉 Başarılı Deployment!**

Artık siteniz yayında! Testlere ve geliştirmelere devam edebilirsiniz! 🚀

