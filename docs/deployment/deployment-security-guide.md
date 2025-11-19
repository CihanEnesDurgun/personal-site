# 🚀 Güvenli Deployment Rehberi

Bu rehber, personal-site projesini güvenli bir şekilde production ortamına deploy etmek için gerekli adımları içerir.

## ⚠️ ÖNEMLİ GÜVENLİK UYARILARI

### 1. Environment Variables (.env dosyası)
**MUTLAKA** aşağıdaki değerleri değiştirin:

```bash
# JWT Secret Key - En az 32 karakter, güçlü rastgele string
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters-long

# Default Admin Password - İlk kurulum için güçlü şifre
DEFAULT_ADMIN_PASSWORD=your-secure-password-here

# CORS Origin - Kendi domain'inizi ekleyin
CORS_ORIGIN=https://cihanenesdurgun.com
```

### 2. Domain Ayarları
`config.json` dosyasında production domain'inizi güncelleyin:

```json
{
  "production": {
    "domain": "https://cihanenesdurgun.com",
    "apiUrl": "https://cihanenesdurgun.com/api",
    "corsOrigins": ["https://cihanenesdurgun.com"]
  }
}
```

## 📋 Deployment Adımları

### 1. Dosya Hazırlığı
- ✅ Hassas veriler temizlendi
- ✅ Log dosyaları silindi
- ✅ Backup dosyaları kaldırıldı
- ✅ Development mode kapatıldı

### 2. cPanel Upload
1. Tüm dosyaları ZIP olarak sıkıştırın
2. cPanel File Manager ile upload edin
3. ZIP dosyasını extract edin

### 3. Environment Kurulumu
1. `.env` dosyasını oluşturun
2. Yukarıdaki güvenlik ayarlarını yapın
3. Dosya izinlerini kontrol edin (644)

### 4. Node.js Kurulumu
```bash
# Dependencies yükle
npm install

# Production modunda başlat
NODE_ENV=production npm start
```

### 5. İlk Admin Kullanıcısı
1. `/admin/login` sayfasına gidin
2. Default şifre ile giriş yapın
3. **HEMEN** admin şifresini değiştirin

## 🔒 Güvenlik Kontrol Listesi

- [ ] JWT_SECRET değiştirildi (32+ karakter)
- [ ] DEFAULT_ADMIN_PASSWORD güçlü şifre
- [ ] CORS_ORIGIN doğru domain
- [ ] config.json production domain güncellendi
- [ ] .env dosyası 644 izinleri
- [ ] Admin şifresi değiştirildi
- [ ] HTTPS aktif
- [ ] Firewall kuralları kontrol edildi

## 🚨 Güvenlik Uyarıları

1. **ASLA** `.env` dosyasını public repository'ye commit etmeyin
2. **ASLA** gerçek şifreleri kod içinde bırakmayın
3. **MUTLAKA** production'da HTTPS kullanın
4. **DÜZENLİ** olarak güvenlik güncellemelerini yapın
5. **MONITOR** edin - log dosyalarını kontrol edin

## 📞 Destek

Herhangi bir güvenlik sorunu için:
- Log dosyalarını kontrol edin
- Session verilerini temizleyin
- Admin şifresini sıfırlayın

## 🔄 Backup Stratejisi

1. **Düzenli Backup**: Günlük otomatik backup
2. **Veri Backup**: `data/` klasörü
3. **Görsel Backup**: `images/` klasörü
4. **Konfigürasyon Backup**: `config.json` ve `.env`

---

**Son Güncelleme**: 2025-01-15
**Versiyon**: 2.0.4
**Güvenlik Seviyesi**: Production Ready ✅


