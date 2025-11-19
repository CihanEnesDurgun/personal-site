# ⚡ cPanel Hızlı Başlangıç

## 🎯 5 Dakikada Deployment

### 1️⃣ Dosyaları Hazırla (2 dk)
```bash
# Tüm dosyaları ZIP'le (node_modules hariç!)
# Windows: Tüm dosyaları seç → Sağ tık → "Sıkıştır"
# Mac: Tüm dosyaları seç → Sağ tık → "Compress"
```

### 2️⃣ cPanel'e Yükle (1 dk)
- cPanel → **File Manager** → `public_html`
- **Upload** → ZIP'i seç → Yükle
- ZIP'e sağ tık → **Extract**
- ZIP'i sil

### 3️⃣ Node.js App Oluştur (1 dk)
- cPanel → **Node.js Selector** → **Create Application**
- Node Version: **18.x** veya **20.x**
- Mode: **Production**
- Startup File: **server.js**
- Root: **public_html**

### 4️⃣ Environment Variables Ekle (1 dk)
Node.js App → **Environment Variables** → Ekle:

```
NODE_ENV=production
JWT_SECRET=değiştir-min-32-karakter-güçlü-şifre-BURAYA
DEFAULT_ADMIN_PASSWORD=değiştir-güçlü-admin-şifresi-BURAYA
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=https://cihanenesdurgun.com
PORT=3000
```

### 5️⃣ Kur ve Başlat (1 dk)
```bash
# Terminal/SSH'da:
cd ~/public_html
npm install --production
```

- Node.js App → **Restart App**

### 6️⃣ Test Et
✅ `https://cihanenesdurgun.com` → Ana sayfa  
✅ `https://cihanenesdurgun.com/admin/login.html` → Admin giriş  
✅ Admin şifresini değiştir!

---

## 🔐 ÖNEMLİ GÜVENLİK

⚠️ **MUTLAKA DEĞİŞTİR:**
- `JWT_SECRET` (en az 32 karakter, güçlü şifre)
- `DEFAULT_ADMIN_PASSWORD` (güçlü şifre)

---

## 📋 Detaylı Rehber

Tam detaylar için: `CPANEL_MANUAL_UPLOAD_GUIDE.md`

---

**🎉 Hazır! Site yayında!**

