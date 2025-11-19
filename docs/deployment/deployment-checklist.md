# ✅ cPanel Deployment Kontrol Listesi

## 📦 Yükleme Öncesi Hazırlık

- [ ] `node_modules/` klasörü ZIP'e dahil edilmedi
- [ ] `.env` dosyası ZIP'e dahil edilmedi (lokal kalsın)
- [ ] `.git/` klasörü ZIP'e dahil edilmedi
- [ ] Tüm gerekli dosya ve klasörler hazır
- [ ] `config.json` production domain ile güncellendi
- [ ] ZIP dosyası oluşturuldu

## 📤 cPanel Yükleme

- [ ] File Manager'a giriş yapıldı
- [ ] `public_html` veya hedef klasöre gidildi
- [ ] ZIP dosyası yüklendi
- [ ] ZIP dosyası extract edildi
- [ ] ZIP dosyası silindi

## ⚙️ Node.js Kurulumu

- [ ] Node.js App oluşturuldu
- [ ] Node.js versiyonu seçildi (18.x veya 20.x)
- [ ] Application Mode: Production seçildi
- [ ] Application Root ayarlandı
- [ ] Startup File: `server.js` olarak ayarlandı

## 🔐 Environment Variables

- [ ] `NODE_ENV=production` eklendi
- [ ] `JWT_SECRET` eklendi ve değiştirildi (min 32 karakter)
- [ ] `DEFAULT_ADMIN_PASSWORD` eklendi ve değiştirildi
- [ ] `BCRYPT_SALT_ROUNDS=12` eklendi
- [ ] `CORS_ORIGIN=https://cihanenesdurgun.com` eklendi
- [ ] `PORT=3000` eklendi
- [ ] Diğer environment variables eklendi

## 📦 Bağımlılıklar

- [ ] Terminal/SSH açıldı
- [ ] Proje klasörüne gidildi (`cd ~/public_html`)
- [ ] `npm install --production` çalıştırıldı
- [ ] Kurulum hatasız tamamlandı

## 🔒 Dosya İzinleri

- [ ] `data/` klasörü → 755 veya 775
- [ ] `images/` klasörü → 755 veya 775
- [ ] `logs/` klasörü → 755 veya 775
- [ ] `content/` klasörü → 755

## 🚀 Uygulama Başlatma

- [ ] Node.js App'te "Restart App" yapıldı
- [ ] Uygulama aktif durumda (yeşil ışık)
- [ ] Log dosyaları kontrol edildi (hata yok)

## 🌐 Domain ve SSL

- [ ] SSL sertifikası kuruldu (Let's Encrypt)
- [ ] Domain Node.js uygulamasına yönlendirildi
- [ ] HTTPS çalışıyor

## 🧪 Testler

- [ ] Ana sayfa açılıyor: `https://cihanenesdurgun.com`
- [ ] Blog sayfası açılıyor: `https://cihanenesdurgun.com/blog.html`
- [ ] Admin login açılıyor: `https://cihanenesdurgun.com/admin/login.html`
- [ ] Admin girişi yapılabiliyor
- [ ] Admin şifresi değiştirildi
- [ ] API çalışıyor: `/api/posts`
- [ ] Resim yükleme çalışıyor

## 🔐 Güvenlik Kontrolleri

- [ ] Varsayılan admin şifresi değiştirildi
- [ ] JWT_SECRET güçlü ve benzersiz
- [ ] .env dosyası public'te değil
- [ ] SSL aktif ve çalışıyor
- [ ] Dosya izinleri doğru

---

## 🎯 Hızlı Komutlar

### Terminal'de Çalıştırılacak Komutlar

```bash
# Proje klasörüne git
cd ~/public_html

# Bağımlılıkları yükle
npm install --production

# Logları kontrol et
tail -f logs/app.log

# Uygulama durumunu kontrol et
ps aux | grep node
```

### Node.js App Ayarları

- **Restart App:** Uygulamayı yeniden başlatır
- **Stop App:** Uygulamayı durdurur
- **View Logs:** Log dosyalarını görüntüler
- **Edit Settings:** Ayarları düzenler

---

## 🆘 Acil Durum Komutları

### Uygulama Çalışmıyor

```bash
# Logları kontrol et
cat logs/app.log

# Port'u kontrol et
netstat -tulpn | grep node

# Manuel başlat (test için)
node server.js
```

### Şifre Sıfırlama

1. `data/users.json` dosyasını düzenle
2. Veya `.env` dosyasındaki `DEFAULT_ADMIN_PASSWORD` ile tekrar giriş yap

---

**📅 Deployment Tarihi:** ________________

**✅ Deployment Tamamlandı:** ________________

**🔍 Son Kontrol:** ________________

