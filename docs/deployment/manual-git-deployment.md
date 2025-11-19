# 🚀 Manuel Git Deployment Rehberi (cPanel)

Bu rehber, GitHub'daki değişiklikleri cPanel'e manuel olarak Git kullanarak nasıl deploy edeceğinizi gösterir.

---

## 📋 Ön Gereksinimler

1. ✅ cPanel hesabınızda **SSH erişimi** aktif olmalı
2. ✅ cPanel'de **Git** kurulu olmalı (çoğu cPanel'de varsayılan olarak kuruludur)
3. ✅ Projeniz GitHub'da mevcut olmalı

---

## 🔧 İlk Kurulum (Sadece İlk Sefer)

### Adım 1: cPanel'de Proje Klasörüne Git

1. cPanel'de **"Terminal"** veya **"SSH Access"** bölümünü açın
2. Proje klasörünüze gidin:

```bash
cd ~/public_html/personal-site
# veya projenizin bulunduğu klasör
```

### Adım 2: Git Repository'yi Klonlayın (İlk Sefer)

Eğer cPanel'de henüz Git repository yoksa:

```bash
# Mevcut klasörü yedekleyin (eğer varsa)
cd ~/public_html
mv personal-site personal-site-backup

# GitHub'dan klonlayın
git clone https://github.com/CihanEnesDurgun/personal-site.git personal-site

# Proje klasörüne gidin
cd personal-site
```

### Adım 3: Node.js Bağımlılıklarını Yükleyin

```bash
npm install --production
```

### Adım 4: Environment Variables Ayarlayın

cPanel'de **Node.js App** ayarlarından veya `.env` dosyası oluşturarak:

```bash
# .env dosyası oluşturun
cp env.example .env
nano .env  # veya vi .env
```

Gerekli değişkenleri ayarlayın (detaylar için `env.example` dosyasına bakın).

### Adım 5: Dosya İzinlerini Ayarlayın

```bash
chmod -R 755 data/ images/ logs/ content/
chmod 644 *.html *.css *.js *.json *.xml *.md
```

### Adım 6: Node.js Uygulamasını Başlatın

cPanel'de **Node.js App** ayarlarından uygulamayı başlatın.

---

## 🔄 Güncelleme (Her Push Sonrası)

GitHub'a push yaptıktan sonra, cPanel'de şu adımları takip edin:

### Yöntem 1: SSH/Terminal Üzerinden (Önerilen)

1. cPanel'de **Terminal** veya **SSH Access** açın
2. Proje klasörüne gidin:

```bash
cd ~/public_html/personal-site
```

3. GitHub'dan en son değişiklikleri çekin:

```bash
git pull origin main
```

4. Yeni bağımlılıklar varsa yükleyin:

```bash
npm install --production
```

5. Node.js uygulamasını yeniden başlatın:

```bash
# cPanel Node.js App ayarlarından "Restart App" butonuna tıklayın
# veya terminal'den:
pkill -f "node.*server.js" || true
# Sonra cPanel'den uygulamayı yeniden başlatın
```

### Yöntem 2: cPanel File Manager Üzerinden

Eğer SSH erişiminiz yoksa:

1. **cPanel → File Manager** açın
2. Proje klasörünüze gidin (`public_html/personal-site`)
3. `.git` klasörüne sağ tık → **"Change Permissions"** → `755` yapın
4. **Terminal** veya **SSH Access** varsa yukarıdaki komutları çalıştırın

> **Not:** File Manager'dan Git komutları çalıştıramazsınız. SSH/Terminal erişimi gereklidir.

---

## 📝 Hızlı Deployment Komutları

Her push sonrası çalıştırmanız gereken komutlar:

```bash
# 1. Proje klasörüne git
cd ~/public_html/personal-site

# 2. GitHub'dan çek
git pull origin main

# 3. Bağımlılıkları güncelle (gerekirse)
npm install --production

# 4. Uygulamayı yeniden başlat (cPanel'den veya)
# cPanel Node.js App ayarlarından "Restart App"
```

---

## 🔍 Kontrol ve Test

### 1. Git Durumunu Kontrol Edin

```bash
cd ~/public_html/personal-site
git status
```

### 2. Son Commit'i Kontrol Edin

```bash
git log -1
```

### 3. Siteyi Test Edin

- Ana sayfa: `https://cihanenesdurgun.com`
- Blog: `https://cihanenesdurgun.com/blog.html`
- Admin: `https://cihanenesdurgun.com/admin/login.html`
- API: `https://cihanenesdurgun.com/api/health`

---

## ⚠️ Önemli Notlar

### Git Pull Sırasında Çakışma Olursa

Eğer `git pull` sırasında çakışma (conflict) olursa:

```bash
# Yerel değişiklikleri yedekleyin
git stash

# GitHub'dan çekin
git pull origin main

# Yedeklenen değişiklikleri geri yükleyin (gerekirse)
git stash pop
```

### Hassas Dosyalar

Aşağıdaki dosyalar `.gitignore`'da olduğu için Git'e dahil edilmez:
- `data/sessions.json`
- `data/users.json`
- `data/stats.json`
- `.env`

Bu dosyalar cPanel'de manuel olarak oluşturulmalı veya korunmalıdır.

### Node.js Uygulaması Yeniden Başlatma

Her `git pull` sonrası Node.js uygulamasını yeniden başlatmanız gerekebilir:
- cPanel → **Node.js App** → **"Restart App"** butonuna tıklayın

---

## 🐛 Sorun Giderme

### "git: command not found" Hatası

cPanel'de Git kurulu değilse, hosting sağlayıcınızdan Git kurulumu isteyin.

### "Permission denied" Hatası

```bash
# Dosya sahipliğini kontrol edin
ls -la

# Gerekirse izinleri düzeltin
chmod -R 755 .
chown -R $USER:$USER .
```

### "npm install" Başarısız Olursa

```bash
# Node.js versiyonunu kontrol edin
node -v

# npm cache'i temizleyin
npm cache clean --force

# Tekrar deneyin
npm install --production
```

### Uygulama Başlamıyor

1. Logları kontrol edin:
   ```bash
   tail -f logs/app.log
   ```

2. Environment variables'ı kontrol edin
3. Port ayarlarını kontrol edin

---

## 📋 Deployment Kontrol Listesi

Her deployment sonrası:

- [ ] `git pull origin main` başarıyla çalıştı mı?
- [ ] `npm install --production` gerekli miydi? Çalıştı mı?
- [ ] Node.js uygulaması yeniden başlatıldı mı?
- [ ] Ana sayfa açılıyor mu?
- [ ] Blog sayfası çalışıyor mu?
- [ ] Admin panel erişilebilir mi?
- [ ] API endpoint'leri çalışıyor mu?

---

## 🎯 Özet: Hızlı Deployment

```bash
# Tek seferde tüm işlemler:
cd ~/public_html/personal-site && \
git pull origin main && \
npm install --production && \
echo "✅ Deployment tamamlandı! cPanel'den uygulamayı yeniden başlatın."
```

---

**🎉 Başarılı Deployment!**

Artık her push sonrası bu adımları takip ederek sitenizi güncel tutabilirsiniz! 🚀

