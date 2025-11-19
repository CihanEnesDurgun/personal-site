# ⚡ Hızlı Deployment Rehberi

## 🎯 cPanel ile Manuel Upload

### 1. Dosya Hazırlığı
```bash
# Projeyi ZIP olarak sıkıştır
# Tüm dosyaları seç ve ZIP oluştur
```

### 2. cPanel Upload
1. **File Manager** → **public_html** klasörüne git
2. **Upload** → ZIP dosyasını yükle
3. ZIP dosyasını **Extract** et
4. Gereksiz ZIP dosyasını sil

### 3. Environment Kurulumu
```bash
# env.example dosyasını .env olarak kopyala
cp env.example .env

# .env dosyasını düzenle
nano .env
```

**ÖNEMLİ**: Aşağıdaki değerleri MUTLAKA değiştirin:
```bash
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters-long
DEFAULT_ADMIN_PASSWORD=your-secure-password-here
CORS_ORIGIN=https://cihanenesdurgun.com
```

### 4. Domain Ayarları
`config.json` dosyasını düzenle:
```json
{
  "production": {
    "domain": "https://cihanenesdurgun.com",
    "apiUrl": "https://cihanenesdurgun.com/api",
    "corsOrigins": ["https://cihanenesdurgun.com"]
  }
}
```

### 5. Node.js Kurulumu
```bash
# Terminal'de proje klasörüne git
cd /home/username/public_html

# Dependencies yükle
npm install

# Production modunda başlat
NODE_ENV=production npm start
```

### 6. İlk Giriş
1. `https://cihanenesdurgun.com/admin/login` adresine git
2. Username: `admin`
3. Password: `.env` dosyasında belirlediğiniz şifre
4. **HEMEN** admin şifresini değiştir

## 🔒 Güvenlik Kontrolü

Güvenlik kontrollerini çalıştır:
```bash
npm run security-check
```

## 📋 Kontrol Listesi

- [ ] ZIP dosyası hazırlandı
- [ ] cPanel'e upload edildi
- [ ] .env dosyası oluşturuldu
- [ ] JWT_SECRET değiştirildi
- [ ] DEFAULT_ADMIN_PASSWORD değiştirildi
- [ ] CORS_ORIGIN güncellendi
- [ ] config.json production domain güncellendi
- [ ] npm install çalıştırıldı
- [ ] npm start çalıştırıldı
- [ ] Admin girişi yapıldı
- [ ] Admin şifresi değiştirildi

## 🚨 Acil Durum

Eğer bir sorun yaşarsanız:
1. Log dosyalarını kontrol edin
2. `.env` dosyasını kontrol edin
3. `config.json` dosyasını kontrol edin
4. Admin şifresini sıfırlayın

---

**Hazır!** 🎉 Projeniz artık herkese açık!


