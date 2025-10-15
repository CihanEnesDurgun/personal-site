# cPanel Git Deployment Rehberi

## 1. cPanel Git Kurulumu

### Adım 1: cPanel'de Git Repository Oluşturma
1. cPanel'e giriş yapın
2. **"Git Version Control"** bölümünü bulun
3. **"Create"** butonuna tıklayın
4. Aşağıdaki bilgileri girin:
   - **Repository URL**: `https://github.com/CihanEnesDurgun/personal-site.git`
   - **Repository Name**: `personal-site`
   - **Repository Path**: `/home/yourusername/public_html/personal-site`

### Adım 2: İlk Clone İşlemi
```bash
# cPanel'de otomatik olarak çalışacak:
git clone https://github.com/CihanEnesDurgun/personal-site.git
```

## 2. Otomatik Deployment Kurulumu

### Adım 1: Deployment Script Kurulumu
1. `deploy.sh` dosyasını cPanel File Manager'da açın
2. Dosya yolunu not edin: `/home/yourusername/public_html/personal-site/deploy.sh`
3. Script'e execute izni verin:
```bash
chmod +x /home/yourusername/public_html/personal-site/deploy.sh
```

### Adım 2: Git Hook Oluşturma
cPanel Git bölümünde:
1. Repository'nizi seçin
2. **"Manage"** veya **"Hooks"** sekmesine gidin
3. **"post-receive"** hook'u oluşturun
4. Hook içeriği:
```bash
#!/bin/bash
cd /home/yourusername/public_html/personal-site
./deploy.sh
```

## 3. GitHub Webhook Kurulumu (Opsiyonel)

### Adım 1: GitHub'da Webhook Ekleme
1. GitHub repository'nize gidin: `https://github.com/CihanEnesDurgun/personal-site`
2. **Settings** > **Webhooks** > **Add webhook**
3. Aşağıdaki bilgileri girin:
   - **Payload URL**: `https://yourdomain.com/webhook.php` (opsiyonel)
   - **Content type**: `application/json`
   - **Events**: `Just the push event`

## 4. Manuel Deployment Komutları

### Cursor'dan Deployment
```bash
# Değişiklikleri commit et
git add .
git commit -m "Update: your changes description"
git push origin main
```

### cPanel'de Manuel Pull
```bash
cd /home/yourusername/public_html/personal-site
git pull origin main
./deploy.sh
```

## 5. Test Deployment

1. Cursor'da küçük bir değişiklik yapın
2. Değişiklikleri commit edin ve push edin:
```bash
git add .
git commit -m "Test deployment"
git push origin main
```
3. Sitenizi kontrol edin - değişiklikler otomatik olarak yansımalı

## 6. Sorun Giderme

### Git Credentials
Eğer authentication sorunu yaşarsanız:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Permission Issues
```bash
chmod -R 755 /home/yourusername/public_html/personal-site
chown -R yourusername:yourusername /home/yourusername/public_html/personal-site
```

### Node.js Application
Eğer Node.js uygulamanız çalışmıyorsa:
```bash
# Process kontrolü
ps aux | grep node

# Manuel başlatma
cd /home/yourusername/public_html/personal-site
node server.js
```

## 7. Güvenlik Notları

- `.env` dosyalarını public repository'ye commit etmeyin
- Sensitive bilgileri environment variables olarak ayarlayın
- cPanel'de file permissions'ları düzenli kontrol edin

## 8. Backup Stratejisi

- GitHub repository otomatik backup sağlar
- cPanel'de düzenli backup alın
- Database backup'larını da unutmayın
