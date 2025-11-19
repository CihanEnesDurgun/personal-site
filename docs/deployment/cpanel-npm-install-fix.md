# 🔧 cPanel'de npm: command not found Çözümü

## ❌ Sorun
Terminal'de `npm install` çalıştırınca "command not found" hatası alıyorsunuz.

## ✅ Çözüm Yöntemleri

### Yöntem 1: cPanel Node.js App Üzerinden npm Install (ÖNERİLEN)

1. **cPanel → Node.js Selector** veya **Setup Node.js App** bölümüne gidin
2. Oluşturduğunuz uygulamayı bulun
3. Uygulama yanında **"Run npm install"** veya **"npm install"** butonu olmalı
4. Bu butona tıklayın - cPanel otomatik olarak doğru Node.js versiyonuyla npm install çalıştıracak

### Yöntem 2: Node.js PATH'ini Kullanarak Terminal'den

Terminal'de Node.js'in tam yolunu kullanın:

```bash
# Node.js versiyonunu bul (genellikle ~/.nvm/ veya /opt/cpanel/ altında)
# cPanel Node.js Selector'dan hangi versiyonu seçtiğinizi kontrol edin

# Örnek: Node.js 18.x kullanıyorsanız
~/.nvm/versions/node/v18.x.x/bin/npm install --production

# Veya genel Node.js path:
/opt/cpanel/ea-nodejs18/bin/npm install --production
```

**cPanel'de Node.js versiyonunuzu kontrol etmek için:**
- Node.js App ayarlarına gidin
- "Node.js Version" bilgisini görün
- Genellikle `/opt/cpanel/ea-nodejs[VERSIYON]/bin/` altında bulunur

### Yöntem 3: Node.js Selector Console Kullanma

1. Node.js App ayarlarında **"Console"** veya **"Run Console"** butonuna tıklayın
2. Bu console otomatik olarak doğru Node.js ortamını kullanır
3. Bu console'da şu komutu çalıştırın:
   ```bash
   npm install --production
   ```

### Yöntem 4: Environment PATH Ekleme (Kalıcı Çözüm)

Terminal'de geçici olarak PATH'e ekleyin:

```bash
# Node.js 18 için (versiyonunuza göre değiştirin)
export PATH=$PATH:/opt/cpanel/ea-nodejs18/bin

# Şimdi npm install çalıştır
cd ~/public_html/personal-site
npm install --production
```

**Kalıcı yapmak için `.bashrc` dosyasına ekleyin:**
```bash
echo 'export PATH=$PATH:/opt/cpanel/ea-nodejs18/bin' >> ~/.bashrc
source ~/.bashrc
```

---

## 🎯 En Kolay Yöntem (ÖNERİLEN)

**cPanel Node.js App arayüzünden:**

1. Node.js App'inizi bulun
2. **"Run npm install"** butonuna tıklayın
3. İşlem otomatik tamamlanır

Bu yöntem en güveniliridir çünkü cPanel doğru Node.js versiyonunu ve path'ini otomatik kullanır.

---

## 🔍 Node.js Versiyonunu Kontrol Etme

Terminal'de şu komutları deneyin:

```bash
# Node.js'in kurulu olup olmadığını kontrol et
which node
which npm

# Veya cPanel Node.js path'lerini ara
ls -la /opt/cpanel/ea-nodejs*/

# Node.js versiyonunu kontrol et (eğer PATH'te varsa)
node --version
npm --version
```

---

## ✅ Başarılı npm Install Sonrası

npm install başarıyla tamamlandıktan sonra:

1. Node.js App ayarlarına gidin
2. **"Restart App"** butonuna tıklayın
3. Uygulamanın başladığını kontrol edin

---

## 🆘 Hala Çalışmıyorsa

1. cPanel destek ekibine başvurun - Node.js desteği aktif mi?
2. Hosting sağlayıcınızın Node.js dokümantasyonunu kontrol edin
3. Node.js App'in doğru oluşturulduğundan emin olun

