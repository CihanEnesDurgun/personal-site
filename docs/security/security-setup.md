# 🔒 Güvenlik Kurulum Rehberi

## Environment Variables Kurulumu

### 1. Environment Dosyasını Oluşturun

```bash
# env.example dosyasını .env olarak kopyalayın
cp env.example .env
```

### 2. Gerekli Değişkenleri Düzenleyin

`.env` dosyasını açın ve aşağıdaki değerleri düzenleyin:

```env
# JWT Secret Key - EN AZ 32 KARAKTER OLMALI
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters-long

# Bcrypt Salt Rounds - Şifre hashleme için
BCRYPT_SALT_ROUNDS=12

# Session Timeout - Dakika cinsinden
SESSION_TIMEOUT=60

# Session Idle Timeout - Dakika cinsinden (hareketsizlik)
SESSION_IDLE_TIMEOUT=15

# Maximum concurrent sessions per user
MAX_SESSIONS_PER_USER=3

# Session cleanup interval - Dakika cinsinden
SESSION_CLEANUP_INTERVAL=5

# Rate Limiting - Dakika başına maksimum istek sayısı
RATE_LIMIT_MAX=100

# CORS Origin - İzin verilen domain'ler
CORS_ORIGIN=http://localhost:3000,https://cihanenesdurgun.com
```

### 3. Güvenli JWT Secret Oluşturma

Güçlü bir JWT secret oluşturmak için:

```bash
# Node.js ile güçlü secret oluşturma
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Veya OpenSSL ile
openssl rand -hex 32
```

### 4. Production Ortamı İçin

Production ortamında:

```env
NODE_ENV=production
JWT_SECRET=your-production-secret-key-here
CORS_ORIGIN=https://cihanenesdurgun.com
RATE_LIMIT_MAX=50
```

## 🔐 Güvenlik Özellikleri

### Session Management
- **Server-side session storage** ile güvenli session yönetimi
- **Automatic cleanup** - Süresi dolan session'lar otomatik temizlenir
- **Concurrent session limit** - Kullanıcı başına maksimum 3 aktif session
- **Idle timeout** - 15 dakika hareketsizlik sonrası otomatik çıkış
- **IP ve User-Agent kontrolü** - Session hijacking koruması
- **IP normalization** - IPv6/IPv4 uyumluluğu
- **Strict User-Agent validation** - User-Agent değişikliklerinde session sonlandırma
- **Heartbeat system** - Frontend'den düzenli session doğrulama

### Rate Limiting
- **Genel API**: 100 istek/15 dakika
- **Login Endpoint**: 5 deneme/15 dakika
- **IP Bazlı**: Her IP adresi için ayrı limit

### CORS Güvenliği
- **Development**: localhost ve 127.0.0.1'e izin
- **Production**: Sadece belirtilen domain'lere izin
- **Credentials**: Güvenli cookie desteği

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### JWT Güvenliği
- **Minimum 32 karakter** secret key
- **24 saat** token süresi
- **Consistent payload structure** - Tüm JWT'lerde aynı payload formatı
- **Session-based validation** - Her istekte session doğrulama
- **Secure token generation** - Crypto.randomBytes ile güvenli ID'ler
- **Fallback session ID** - Session manager olmadığında güvenli fallback

## 🚨 Güvenlik Kontrol Listesi

- [ ] `.env` dosyası oluşturuldu
- [ ] JWT_SECRET en az 32 karakter
- [ ] Production'da CORS_ORIGIN ayarlandı
- [ ] Rate limiting aktif
- [ ] Security headers aktif
- [ ] Session management aktif
- [ ] Default admin password güvenli
- [ ] IP normalization aktif
- [ ] User-Agent validation aktif
- [ ] JWT payload tutarlılığı sağlandı
- [ ] `.env` dosyası `.gitignore`'da

## 📝 Notlar

- `.env` dosyasını **ASLA** git'e commit etmeyin
- Production'da environment variables'ları server seviyesinde ayarlayın
- Düzenli olarak JWT secret'ını değiştirin
- Log dosyalarını düzenli olarak kontrol edin

## 🔧 Sorun Giderme

### "Missing required environment variables" Hatası
```bash
# .env dosyasının varlığını kontrol edin
ls -la .env

# Değişkenlerin yüklendiğini kontrol edin
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
```

### CORS Hatası
```bash
# CORS_ORIGIN değişkenini kontrol edin
echo $CORS_ORIGIN

# Development için localhost ekleyin
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

### Rate Limit Hatası
```bash
# Rate limit ayarlarını kontrol edin
RATE_LIMIT_MAX=200  # Daha yüksek limit
```
