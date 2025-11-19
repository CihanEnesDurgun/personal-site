# cPanel Node.js Deployment Rehberi

## Problem

cPanel'de Node.js uygulamaları `public_html` klasörü içinde çalıştırılamaz. "Error Directory 'public_html' not allowed" hatası alırsınız.

## Çözüm

cPanel, Node.js uygulamalarını `public_html` dışında özel bir dizinde çalıştırır. Tüm dosyalarınızı oraya taşımanız gerekir.

## Adım Adım Kurulum

### 1. Dosyaları Hazırlama

Mevcut dosyalarınız `public_html` içinde. Bunları cPanel'in Node.js için oluşturacağı klasöre taşıyacağız.

### 2. cPanel'de Node.js Uygulaması Oluşturma

1. **cPanel'e giriş yapın**
2. **"Node.js"** veya **"Node.js Selector"** seçeneğini bulun
3. **"CREATE APPLICATION"** sekmesine tıklayın
4. **Aşağıdaki ayarları yapın:**

   - **Node.js version:** `18.20.8` (veya mevcut versiyon)
   - **Application mode:** `Production`
   - **Application root:** **ÖNEMLİ:** Buraya `public_html` yazmayın!
     - cPanel otomatik olarak şu şekilde bir yol oluşturur:
     - `/home/cihanene/nodevenv/18_20_8/personal-site`
     - Veya sadece `personal-site` yazabilirsiniz (cPanel otomatik tamamlar)
   - **Application URL:** `cihanenesdurgun.com` (veya domain'iniz)
   - **Application startup file:** `server.js`

5. **"CREATE"** butonuna tıklayın

### 3. Dosyaları Taşıma

cPanel uygulamayı oluşturduktan sonra, Application root yolunu görebilirsiniz. Şimdi dosyalarınızı oraya taşımanız gerekiyor:

#### Yöntem 1: cPanel File Manager ile

1. **File Manager**'ı açın
2. **`public_html`** klasörüne gidin
3. **Tüm dosyaları seçin** (Ctrl+A veya "Tümünü Seç")
4. **"Taşı" (Move)** butonuna tıklayın
5. Application root yolunu girin (örn: `/home/cihanene/nodevenv/18_20_8/personal-site`)
6. **"Move Files"** butonuna tıklayın

#### Yöntem 2: SSH ile (daha hızlı)

```bash
# SSH ile sunucuya bağlanın
ssh cihanene@cihanenesdurgun.com

# Application root klasörüne gidin
cd /home/cihanene/nodevenv/18_20_8/personal-site

# public_html'den tüm dosyaları kopyala
cp -r /home/cihanene/public_html/* .

# veya taşımak için (public_html'den siler):
mv /home/cihanene/public_html/* .
```

### 4. Environment Variables Ayarlama

1. cPanel'de Node.js uygulamanızın sayfasına gidin
2. **"Environment variables"** bölümünü bulun
3. **"+ ADD VARIABLE"** butonuna tıklayın
4. Aşağıdaki değişkenleri ekleyin:

```
JWT_SECRET=55012901512388322e884e83ea4c296ed727b98717f4e05f8800168985f6df38
BCRYPT_SALT_ROUNDS=12
DEFAULT_ADMIN_PASSWORD=t0KmYrPH!C7fQmLH
SESSION_TIMEOUT=60
SESSION_IDLE_TIMEOUT=15
MAX_SESSIONS_PER_USER=3
SESSION_CLEANUP_INTERVAL=5
RATE_LIMIT_MAX=100
CORS_ORIGIN=https://cihanenesdurgun.com
LOG_LEVEL=info
LOG_FILE=./logs/app.log
NODE_ENV=production
DEBUG=false
PORT=3000
```

**Güvenlik Notu:** Production'da `JWT_SECRET` ve `DEFAULT_ADMIN_PASSWORD` değerlerini değiştirmeniz önerilir.

### 5. NPM Bağımlılıklarını Yükleme

cPanel Node.js uygulama sayfasında **"Run NPM Install"** veya **"NPM Install"** butonunu bulun ve tıklayın.

Veya SSH ile:

```bash
cd /home/cihanene/nodevenv/18_20_8/personal-site
npm install --production
```

### 6. Uygulamayı Başlatma

1. cPanel Node.js uygulama sayfasında **"Restart App"** veya **"Start App"** butonuna tıklayın
2. Uygulamanın başladığını kontrol edin

### 7. Dosya İzinlerini Kontrol Etme

SSH ile:

```bash
cd /home/cihanene/nodevenv/18_20_8/personal-site
chmod 755 .
chmod 644 *.js *.json *.html *.css *.md
chmod -R 755 admin lib content data images logs
chmod -R 644 images/**
```

### 8. Test Etme

1. Tarayıcınızda `https://cihanenesdurgun.com` adresine gidin
2. Site açılıyorsa başarılı!
3. Admin paneline girin: `https://cihanenesdurgun.com/admin/login.html`

## Önemli Notlar

### Static Dosyalar

Express uygulamanız `app.use(express.static('.'))` ile mevcut dizindeki tüm static dosyaları servis ediyor. Bu yüzden:
- Tüm HTML, CSS, JS dosyalarınız Application root'ta olmalı
- `public_html` artık boş kalabilir veya başka amaçlar için kullanılabilir

### Port Yönetimi

cPanel otomatik olarak port yönetimi yapar. `PORT` environment variable'ı genellikle otomatik ayarlanır, ancak `PORT=3000` olarak ayarlayabilirsiniz.

### Güncellemeler

Dosyaları güncellediğinizde:
1. Yeni dosyaları Application root'a yükleyin/kopyalayın
2. `npm install` çalıştırın (yeni paketler eklediyseniz)
3. Uygulamayı restart edin

## Sorun Giderme

### "Directory not allowed" Hatası

- Application root'u `public_html` içinde bir klasör olarak ayarlamayın
- cPanel'in otomatik oluşturduğu `nodevenv` klasörünü kullanın

### Uygulama Başlamıyor

1. Log'ları kontrol edin (cPanel'de "Logs" sekmesi)
2. Environment variables'ların doğru ayarlandığından emin olun
3. `npm install`'ın başarıyla tamamlandığını kontrol edin
4. `server.js` dosyasının Application root'ta olduğundan emin olun

### Static Dosyalar Yüklenmiyor

1. Express'in static middleware'inin çalıştığından emin olun
2. Dosya izinlerini kontrol edin
3. Dosya yollarının doğru olduğundan emin olun

## Dosya Yapısı (Örnek)

```
/home/cihanene/nodevenv/18_20_8/personal-site/
├── server.js
├── package.json
├── package-lock.json
├── .env
├── index.html
├── blog.html
├── admin/
├── content/
├── data/
├── images/
├── lib/
├── logs/
└── ... (diğer dosyalar)
```

## Alternatif: Reverse Proxy (Gelişmiş)

İsterseniz Node.js uygulamasını bir alt klasörde çalıştırıp, `public_html`'den reverse proxy ile yönlendirme yapabilirsiniz, ancak bu daha karmaşık bir yapılandırma gerektirir.

## İletişim

Sorun yaşarsanız, log dosyalarını kontrol edin:
- Application logs: cPanel'de Node.js uygulama sayfasında "Logs" sekmesi
- Console logs: `logs/console-*.json` dosyaları






