# 🔧 Environment Variables (ENV) Açıklamaları

Bu dosya, `.env` dosyasında kullanılan tüm değişkenlerin detaylı açıklamalarını içerir.

## 📋 Kullanım

`.env` dosyasını oluştururken, `env.example` dosyasını kopyalayıp, aşağıdaki açıklamalara göre değerleri düzenleyin.

---

## 📝 Değişken Açıklamaları (env.example Sırasına Göre)

### 1. JWT_SECRET
- **Açıklama**: JWT token imzalama için kullanılan gizli anahtar
- **Gereksinim**: En az 32 karakter olmalı
- **Örnek**: `55012901512388322e884e83ea4c296ed727b98717f4e05f8800168985f6df38`
- **⚠️ ÖNEMLİ**: Production'da MUTLAKA değiştirin!
- **Oluşturma**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

#### 🔍 Kullanım Yerleri:
- **`server.js:20`** - Validation: JWT_SECRET uzunluk kontrolü (32+ karakter)
- **`server.js:378`** - Değişken tanımı: `const JWT_SECRET = process.env.JWT_SECRET`
- **`lib/sessionManager.js:95`** - Token doğrulama: `jwt.verify(token, process.env.JWT_SECRET)`
- **`lib/sessionManager.js:312-322`** - Token oluşturma: `generateJWT()` fonksiyonu

#### 💻 İlgili Fonksiyonlar:
```javascript
// Token oluşturma (lib/sessionManager.js:312)
generateJWT(username, sessionId) {
  return jwt.sign(
    { username, sessionId, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,  // <-- Burada kullanılıyor
    { expiresIn: '24h' }
  );
}

// Token doğrulama (lib/sessionManager.js:95)
async validateSession(token, ip, userAgent) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);  // <-- Burada kullanılıyor
  // ...
}
```

#### ⚠️ Hata Analizi:
- **Eğer JWT_SECRET eksikse**: Sistem başlamaz (`process.exit(1)`)
- **Eğer JWT_SECRET 32 karakterden kısaysa**: Sistem başlamaz
- **Eğer JWT_SECRET yanlışsa**: Tüm token'lar geçersiz olur, kullanıcılar giriş yapamaz

---

### 2. BCRYPT_SALT_ROUNDS
- **Açıklama**: Şifre hashleme için kullanılan salt rounds değeri
- **Varsayılan**: `12`
- **Önerilen**: 10-12 arası (daha yüksek değerler performansı düşürür)

#### 🔍 Kullanım Yerleri:
- **`server.js:632`** - İlk admin kullanıcısı oluşturma: `bcrypt.hash(defaultPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS))`
- **`server.js:1237`** - Şifre migration (eski plaintext şifreleri hash'e çevirme)
- **`server.js:3067`** - Admin şifre değiştirme: `bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS))`

#### 💻 İlgili Fonksiyonlar:
```javascript
// Şifre hashleme (server.js:632)
const hashedPassword = await bcrypt.hash(
  defaultPassword, 
  parseInt(process.env.BCRYPT_SALT_ROUNDS)  // <-- Burada kullanılıyor
);

// Şifre karşılaştırma (bcrypt.compare kullanılıyor, salt rounds değil)
const isPasswordValid = await bcrypt.compare(password, user.password);
```

#### ⚠️ Hata Analizi:
- **Eğer BCRYPT_SALT_ROUNDS eksikse**: Sistem başlamaz (`requiredEnvVars` kontrolü)
- **Eğer çok yüksekse (15+)**: Şifre hashleme çok yavaşlar
- **Eğer çok düşükse (8-)**: Güvenlik riski oluşur

---

### 3. DEFAULT_ADMIN_PASSWORD
- **Açıklama**: İlk kurulum için kullanılacak admin şifresi
- **⚠️ ÖNEMLİ**: İlk girişte bu şifreyi kullanın, sonra admin panelinden değiştirin!
- **Gereksinim**: Güçlü bir şifre (en az 12 karakter, büyük/küçük harf, rakam, özel karakter)

#### 🔍 Kullanım Yerleri:
- **`server.js:631`** - İlk admin kullanıcısı oluşturma: `process.env.DEFAULT_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex')`

#### 💻 İlgili Fonksiyonlar:
```javascript
// İlk admin oluşturma (server.js:628-640)
const readUsersFile = async () => {
  try {
    // ... dosya okuma
  } catch (error) {
    // Eğer users.json yoksa veya hatalıysa:
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 
                            crypto.randomBytes(16).toString('hex');  // <-- Burada kullanılıyor
    const hashedPassword = await bcrypt.hash(defaultPassword, ...);
    // admin kullanıcısı oluşturulur
  }
}
```

#### ⚠️ Hata Analizi:
- **Eğer DEFAULT_ADMIN_PASSWORD eksikse**: Rastgele bir şifre oluşturulur (güvenli ama bilinmez)
- **⚠️ İlk kurulumdan sonra**: Admin panelinden şifreyi MUTLAKA değiştirin!

---

### 4. SESSION_TIMEOUT
- **Açıklama**: Oturum zaman aşımı (dakika cinsinden)
- **Varsayılan**: `60`
- **Örnek**: `60` = 1 saat

#### 🔍 Kullanım Yerleri:
- **`lib/sessionManager.js:16`** - Constructor: `parseInt(process.env.SESSION_TIMEOUT) || 60`
- **`lib/sessionManager.js:21`** - Milisaniyeye çevirme: `sessionTimeoutMinutes * 60 * 1000`
- **`lib/sessionManager.js:59`** - Session oluşturma: `expiresAt: new Date(now.getTime() + this.sessionTimeout)`

#### 💻 İlgili Fonksiyonlar:
```javascript
// Session Manager Constructor (lib/sessionManager.js:12-34)
constructor() {
  const sessionTimeoutMinutes = parseInt(process.env.SESSION_TIMEOUT) || 60;  // <-- Burada
  this.sessionTimeout = sessionTimeoutMinutes * 60 * 1000;  // Dakikadan milisaniyeye
  
  // Session oluşturma (lib/sessionManager.js:51-66)
  const session = {
    expiresAt: new Date(now.getTime() + this.sessionTimeout),  // <-- Burada kullanılıyor
    // ...
  };
}
```

#### ⚠️ Hata Analizi:
- **Eğer SESSION_TIMEOUT eksikse**: Varsayılan 60 dakika kullanılır
- **Eğer çok kısaysa**: Kullanıcılar sık sık çıkış yapmak zorunda kalır
- **Eğer çok uzunsa**: Güvenlik riski oluşur

---

### 5. SESSION_IDLE_TIMEOUT
- **Açıklama**: Hareketsizlik nedeniyle oturum zaman aşımı (dakika cinsinden)
- **Varsayılan**: `15`
- **Örnek**: `15` = 15 dakika hareketsizlikten sonra oturum kapanır

#### 🔍 Kullanım Yerleri:
- **`lib/sessionManager.js:17`** - Constructor: `parseInt(process.env.SESSION_IDLE_TIMEOUT) || 15`
- **`lib/sessionManager.js:22`** - Milisaniyeye çevirme: `idleTimeoutMinutes * 60 * 1000`
- **`lib/sessionManager.js:112-120`** - Session doğrulama: `lastActivity` kontrolü

#### 💻 İlgili Fonksiyonlar:
```javascript
// Idle timeout kontrolü (lib/sessionManager.js:112-120)
async validateSession(token, ip, userAgent) {
  // ...
  const idleTime = Date.now() - new Date(session.lastActivity).getTime();
  if (idleTime > this.idleTimeout) {  // <-- Burada kullanılıyor
    await this.deactivateSession(sessionId);
    return null;
  }
  // ...
}
```

#### ⚠️ Hata Analizi:
- **Eğer SESSION_IDLE_TIMEOUT eksikse**: Varsayılan 15 dakika kullanılır
- **Eğer çok kısaysa**: Kullanıcılar sık sık timeout olur
- **Eğer çok uzunsa**: Güvenlik riski (unutulan cihazlarda açık oturum)

---

### 6. MAX_SESSIONS_PER_USER
- **Açıklama**: Kullanıcı başına maksimum eş zamanlı oturum sayısı
- **Varsayılan**: `3`

#### 🔍 Kullanım Yerleri:
- **`lib/sessionManager.js:18`** - Constructor: `parseInt(process.env.MAX_SESSIONS_PER_USER) || 3`
- **`lib/sessionManager.js:49`** - Session oluşturma: `cleanupUserSessions(username)` çağrısı
- **`lib/sessionManager.js:195-218`** - Eski session temizleme: `cleanupUserSessions()` fonksiyonu

#### 💻 İlgili Fonksiyonlar:
```javascript
// Kullanıcı session limiti kontrolü (lib/sessionManager.js:195-218)
async cleanupUserSessions(username) {
  const sessions = await this.getAllSessions();
  const userSessions = sessions.filter(s => s.username === username && s.isActive);
  
  if (userSessions.length >= this.maxSessionsPerUser) {  // <-- Burada kullanılıyor
    // En eski session'ları deaktive et
    const sorted = userSessions.sort((a, b) => 
      new Date(a.loginTime) - new Date(b.loginTime)
    );
    const toRemove = sorted.slice(0, userSessions.length - this.maxSessionsPerUser + 1);
    for (const session of toRemove) {
      await this.deactivateSession(session.id);
    }
  }
}
```

#### ⚠️ Hata Analizi:
- **Eğer MAX_SESSIONS_PER_USER eksikse**: Varsayılan 3 kullanılır
- **Eğer 0 veya negatifse**: Kullanıcılar giriş yapamaz
- **Eğer çok yüksekse**: Güvenlik riski (çoklu cihaz erişimi)

---

### 7. SESSION_CLEANUP_INTERVAL
- **Açıklama**: Süresi dolmuş oturumların temizlenme aralığı (dakika cinsinden)
- **Varsayılan**: `5`

#### 🔍 Kullanım Yerleri:
- **`lib/sessionManager.js:19`** - Constructor: `parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 5`
- **`lib/sessionManager.js:33`** - Cleanup başlatma: `startCleanupProcess()`
- **`lib/sessionManager.js:441-464`** - Cleanup fonksiyonu: `cleanupExpiredSessions()`

#### 💻 İlgili Fonksiyonlar:
```javascript
// Cleanup process başlatma (lib/sessionManager.js:441-464)
startCleanupProcess() {
  setInterval(async () => {
    try {
      await this.cleanupExpiredSessions();
    } catch (error) {
      console.error('Error in cleanup process:', error);
    }
  }, this.cleanupInterval);  // <-- Burada kullanılıyor (5 dakika = 300000ms)
}

// Süresi dolmuş session'ları temizle (lib/sessionManager.js:465-490)
async cleanupExpiredSessions() {
  const sessions = await this.getAllSessions();
  const now = new Date();
  
  for (const session of sessions) {
    if (new Date(session.expiresAt) < now && session.isActive) {
      await this.deactivateSession(session.id);
    }
  }
}
```

#### ⚠️ Hata Analizi:
- **Eğer SESSION_CLEANUP_INTERVAL eksikse**: Varsayılan 5 dakika kullanılır
- **Eğer çok kısaysa**: Performans sorunu (sürekli cleanup)
- **Eğer çok uzunsa**: Süresi dolmuş session'lar uzun süre bellekte kalır

---

### 8. RATE_LIMIT_MAX
- **Açıklama**: Dakika başına maksimum istek sayısı (DDoS koruması)
- **Varsayılan**: `100`
- **Önerilen**: 
  - Development: `1000`
  - Production: `100` (daha sıkı güvenlik)

#### 🔍 Kullanım Yerleri:
- **`server.js:69`** - Rate limiter tanımı: `parseInt(process.env.RATE_LIMIT_MAX) || 10000`
- **`server.js:72-79`** - Express rate limit yapılandırması
- **`server.js:82-107`** - Login rate limiter (daha sıkı: 5 istek/15 dakika)

#### 💻 İlgili Fonksiyonlar:
```javascript
// Rate limiting yapılandırması (server.js:68-79)
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX) || 10000;  // <-- Burada
const rateLimitWindow = 15 * 60 * 1000; // 15 dakika

const generalLimiter = rateLimit({
  windowMs: rateLimitWindow,
  max: rateLimitMax,  // <-- Burada kullanılıyor
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(rateLimitWindow / 1000)
  }
});

// Middleware olarak kullanım (server.js'de)
app.use('/api/', generalLimiter);
```

#### ⚠️ Hata Analizi:
- **Eğer RATE_LIMIT_MAX eksikse**: Varsayılan 10000 kullanılır (development için yüksek)
- **Eğer çok düşükse**: Normal kullanıcılar bile engellenebilir
- **Eğer çok yüksekse**: DDoS koruması çalışmaz

---

### 9. CORS_ORIGIN
- **Açıklama**: İzin verilen domain'ler (virgülle ayırın)
- **Format**: `https://domain1.com,https://domain2.com`
- **Production**: `https://cihanenesdurgun.com`
- **Development**: `http://localhost:3000,http://127.0.0.1:3000`

#### 🔍 Kullanım Yerleri:
- **`server.js:110-112`** - Allowed origins tanımı: `process.env.CORS_ORIGIN.split(',')`
- **`server.js:114-140`** - CORS yapılandırması: `corsOptions.origin()`

#### 💻 İlgili Fonksiyonlar:
```javascript
// CORS yapılandırması (server.js:110-140)
const allowedOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    .filter(origin => origin && !origin.includes('yourdomain.com')) :  // <-- Burada
  ['http://localhost:3000', 'http://127.0.0.1:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Production'da çok sıkı kontrol
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        return callback(new Error('Origin required in production'), false);
      }
      if (allowedOrigins.includes(origin)) {  // <-- Burada kontrol ediliyor
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    }
    // ...
  },
  credentials: true
};

app.use(cors(corsOptions));  // Middleware olarak kullanım
```

#### ⚠️ Hata Analizi:
- **Eğer CORS_ORIGIN eksikse**: Varsayılan localhost kullanılır (production'da çalışmaz!)
- **Eğer yanlış domain**: Frontend API çağrıları CORS hatası verir
- **⚠️ Production'da**: Mutlaka doğru domain'i ekleyin!

---

### 10. LOG_LEVEL
- **Açıklama**: Log seviyesi
- **Değerler**: 
  - `error` - Sadece hatalar
  - `warn` - Uyarılar ve hatalar
  - `info` - Bilgilendirme, uyarılar ve hatalar (önerilen)
  - `debug` - Tüm detaylar (development için)
- **Varsayılan**: `info`

#### 🔍 Kullanım Yerleri:
- **Not**: Şu anda LOG_LEVEL doğrudan kullanılmıyor, gelecekte log sistemi için hazır

#### ⚠️ Hata Analizi:
- **Şu an**: Kullanılmıyor, ancak log sistemine entegre edilebilir

---

### 11. LOG_FILE
- **Açıklama**: Log dosyasının yolu
- **Varsayılan**: `./logs/app.log`

#### 🔍 Kullanım Yerleri:
- **Not**: Şu anda LOG_FILE doğrudan kullanılmıyor, gelecekte log sistemi için hazır
- **`lib/logCleanupManager.js`**: Log dosyalarını otomatik temizler (30 gün retention)

#### ⚠️ Hata Analizi:
- **Şu an**: Kullanılmıyor, ancak log sistemine entegre edilebilir

---

### 12-15. SMTP Ayarları (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- **Açıklama**: Email gönderme için SMTP yapılandırması
- **Not**: Email özelliği şu an kullanılmıyor, gelecekte kullanılabilir
- **Değerler**: Gmail, Outlook vb. SMTP ayarları

#### ⚠️ Hata Analizi:
- **Şu an**: Kullanılmıyor, olduğu gibi bırakılabilir
- **Gelecekte**: Email bildirimleri için kullanılacak

---

### 16. BACKUP_DIR
- **Açıklama**: Backup dosyalarının saklanacağı klasör
- **Varsayılan**: `./backups`

#### 🔍 Kullanım Yerleri:
- **Not**: Şu anda BACKUP_DIR doğrudan kullanılmıyor, gelecekte backup sistemi için hazır

#### ⚠️ Hata Analizi:
- **Şu an**: Kullanılmıyor

---

### 17. BACKUP_INTERVAL
- **Açıklama**: Otomatik backup aralığı (saat cinsinden)
- **Varsayılan**: `24` (günlük)

#### 🔍 Kullanım Yerleri:
- **Not**: Şu anda BACKUP_INTERVAL doğrudan kullanılmıyor, gelecekte backup sistemi için hazır

#### ⚠️ Hata Analizi:
- **Şu an**: Kullanılmıyor

---

### 18. NODE_ENV
- **Açıklama**: Çalışma ortamı
- **Değerler**:
  - `development` - Geliştirme ortamı
  - `production` - Canlı ortam (önerilen)
  - `test` - Test ortamı
- **⚠️ Production için**: `production` olmalı!
- **Şu anki değer**: `production`

#### 🔍 Kullanım Yerleri:
- **`server.js:117`** - CORS kontrolü: `if (process.env.NODE_ENV === 'production')`
- **`server.js:131`** - Development mod kontrolü: `if (process.env.NODE_ENV !== 'production')`
- **`server.js:194`** - CSP header: `if (process.env.NODE_ENV === 'production')`
- **`server.js:207`** - HSTS header: `if (process.env.NODE_ENV === 'production')`
- **`server.js:242`** - Log yönlendirme: `if (process.env.NODE_ENV === 'production')`
- **`server.js:316`** - Error handler: `const isDevelopment = process.env.NODE_ENV === 'development'`

#### 💻 İlgili Fonksiyonlar:
```javascript
// Production/Development mod kontrolü (server.js:117-140)
const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === 'production') {  // <-- Burada
      // Production: Çok sıkı CORS kontrolü
      if (!origin || !allowedOrigins.includes(origin)) {
        return callback(new Error('Not allowed by CORS'), false);
      }
    } else {
      // Development: Daha esnek
      callback(null, true);
    }
  }
};

// Security headers (server.js:194-209)
if (process.env.NODE_ENV === 'production') {  // <-- Burada
  res.setHeader('Content-Security-Policy', '...');
  res.setHeader('Strict-Transport-Security', '...');
}
```

#### ⚠️ Hata Analizi:
- **Eğer NODE_ENV production değilse**: Güvenlik header'ları eksik kalır
- **Eğer yanlış değerse**: CORS, CSP gibi güvenlik özellikleri çalışmaz

---

### 19. DEBUG
- **Açıklama**: Debug modu
- **Değerler**: `true` veya `false`
- **Production**: `false` (güvenlik için)
- **Şu anki değer**: `false`

#### 🔍 Kullanım Yerleri:
- **Not**: Şu anda DEBUG doğrudan kullanılmıyor, gelecekte debug sistemi için hazır

#### ⚠️ Hata Analizi:
- **Şu an**: Kullanılmıyor

---

### 20. PORT
- **Açıklama**: Uygulamanın dinleyeceği port
- **Varsayılan**: `3000`
- **⚠️ ÖNEMLİ**: Hosting sağlayıcınızın belirttiği portu kullanın!

#### 🔍 Kullanım Yerleri:
- **`server.js:44`** - Server port tanımı: `const PORT = process.env.PORT || 3000`
- **`server.js:3705-3713`** - Server başlatma: `app.listen(PORT, ...)`

#### 💻 İlgili Fonksiyonlar:
```javascript
// Port tanımı (server.js:44)
const PORT = process.env.PORT || 3000;  // <-- Burada

// Server başlatma (server.js:3705-3713)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);  // <-- Burada kullanılıyor
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

#### ⚠️ Hata Analizi:
- **Eğer PORT eksikse**: Varsayılan 3000 kullanılır
- **Eğer yanlış port**: Hosting sağlayıcınızın portuyla eşleşmezse server başlamaz
- **⚠️ cPanel'de**: Node.js uygulamasının ayarlarındaki port ile eşleşmeli!

---

## 📋 Production Deployment Checklist

### ✅ Kritik Adımlar

1. **JWT_SECRET Değiştir**
   ```bash
   # Yeni secret oluştur
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **DEFAULT_ADMIN_PASSWORD Değiştir**
   - Güçlü bir şifre oluşturun
   - İlk girişten sonra admin panelinden değiştirin

3. **CORS_ORIGIN Güncelle**
   - Production domain'inizi ekleyin
   - `https://cihanenesdurgun.com`

4. **NODE_ENV Production**
   - `NODE_ENV=production` olmalı

5. **PORT Kontrolü**
   - Hosting sağlayıcınızın belirttiği portu kullanın

---

## 🔒 Güvenlik Notları

- ⚠️ **ASLA** `.env` dosyasını public repository'ye commit etmeyin
- ⚠️ **ASLA** gerçek şifreleri kod içinde bırakmayın
- ⚠️ **MUTLAKA** production'da HTTPS kullanın
- ⚠️ **DÜZENLİ** olarak güvenlik güncellemelerini yapın
- ⚠️ **MONITOR** edin - log dosyalarını kontrol edin

---

## 💡 Yardımcı Komutlar

### Güvenli JWT Secret Oluşturma
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Güvenli Şifre Oluşturma
```bash
node -e "const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'; let password = ''; for (let i = 0; i < 16; i++) { password += chars.charAt(Math.floor(Math.random() * chars.length)); } console.log(password);"
```

---

## 🐛 Hata Analizi İçin İpuçları

### En Çok Karşılaşılan Hatalar:

1. **"JWT_SECRET must be at least 32 characters"**
   - **Çözüm**: JWT_SECRET değerini güncelleyin, en az 32 karakter olmalı

2. **"Missing required environment variables"**
   - **Çözüm**: JWT_SECRET ve BCRYPT_SALT_ROUNDS mutlaka olmalı

3. **"Not allowed by CORS"**
   - **Çözüm**: CORS_ORIGIN'a frontend domain'ini ekleyin

4. **"Too many requests"**
   - **Çözüm**: RATE_LIMIT_MAX değerini artırın (veya DDoS saldırısı olabilir)

5. **Session timeout sorunları**
   - **Çözüm**: SESSION_TIMEOUT ve SESSION_IDLE_TIMEOUT değerlerini kontrol edin

---

**Son Güncelleme**: 2025-10-31  
**Versiyon**: 2.0.4

---

## ⏰ Sistem Tarih ve Saat Kullanımı

### Tarih/Saat Kaynağı

Sistem, tarih ve saat bilgisini **JavaScript'in `new Date()` fonksiyonu** ile alır. Bu fonksiyon:

- **Yerel sistem saatini** kullanır (sunucunun/bilgisayarın saat dilimi)
- **UTC (Coordinated Universal Time)** formatında da erişilebilir

### Kullanım Yerleri

#### 1. Session Management (`lib/sessionManager.js`)
```javascript
const now = new Date();  // Sistem saatini alır
loginTime: now.toISOString(),  // ISO format: "2025-10-31T16:02:56.288Z"
expiresAt: new Date(now.getTime() + this.sessionTimeout).toISOString()
```

#### 2. Logging (`server.js`)
```javascript
timestamp: new Date().toISOString(),  // Log timestamp'leri için
Date.now()  // Milisaniye cinsinden timestamp (cache için)
```

#### 3. User Data (`server.js`)
```javascript
lastUpdated: new Date().toISOString(),  // Kullanıcı bilgileri güncelleme zamanı
```

#### 4. Frontend (`markdown-editor/script-clean.js`)
```javascript
const today = new Date();
dateElement.textContent = today.toLocaleDateString('tr-TR', options);
// Türkçe format: "31 Ekim 2025"
```

### ⚠️ Önemli Notlar

1. **Sunucu Saati**: Production'da sunucunun saat dilimi önemlidir
   - Türkiye için: `Europe/Istanbul` (UTC+3)
   - cPanel'de sunucu saat dilimi ayarlarını kontrol edin

2. **ISO Format**: Tüm backend tarihler `toISOString()` ile UTC formatında saklanır
   - Format: `2025-10-31T16:02:56.288Z`
   - Bu sayede farklı saat dilimlerinde tutarlılık sağlanır

3. **Frontend Formatı**: Kullanıcıya gösterilen tarihler yerel formatta
   - Türkçe: `31 Ekim 2025`
   - JavaScript'in `toLocaleDateString('tr-TR')` fonksiyonu kullanılır

4. **Session Expiry**: Session süresi hesaplanırken sistem saatini kullanır
   - Eğer sunucu saati yanlışsa, session'lar erken/k geç expire olabilir

### 🔍 Hata Analizi

- **Eğer sistem saati yanlışsa**: Session timeout'ları, log timestamp'leri yanlış olur
- **Eğer saat dilimi yanlışsa**: Tarih gösterimleri yanlış saat diliminde görünür
- **Çözüm**: cPanel'de veya hosting panelinde sunucu saat dilimini kontrol edin

### 📝 Öneriler

- Production'da sunucu saat dilimini `Europe/Istanbul` olarak ayarlayın
- Tüm backend tarihler UTC formatında saklanır (bu doğru)
- Frontend'de kullanıcıya gösterilen tarihler yerel formatta (bu da doğru)