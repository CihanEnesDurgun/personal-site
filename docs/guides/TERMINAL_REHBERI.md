# 🚀 Terminal ve Sistem Yönetim Rehberi

Bu belge, projeniz üzerindeki geliştirme, bakım, başlatma ve durdurma gibi işlemleri yapabilmeniz için gereken tüm komutları adım adım açıklayan profesyonel bir referans dosyasıdır.

---

## 1. 🟢 Sistemi Başlatma Komutları

Bilgisayarınızı yeni açtığınızda veya yepyeni bir terminal penceresi açtığınızda, komutları çalıştırabilmek için **önce projenin bulunduğu klasöre gitmeniz gerekir**.

### 💻 Adım Adım Başlatma (Yeni Terminalde)
Terminali (Cmd veya PowerShell) açtıktan sonra sırasıyla şu iki komutu girin:

1. Önce projenin klasörüne gidin:
```bash
cd Desktop\personal-site-fix-feb\personal-site
```

2. Ardından geliştirici modunda projeyi başlatın:
```bash
npm run dev
```

### 🛠️ Geliştirici (Development) Modunda Başlatma
Geliştirme yaparken en çok bu komutu kullanacaksınız. `nodemon` üzerinden çalışır, yani kodda herhangi bir değişiklik yapıp kaydettiğinizde **sunucu otomatik olarak yeniden başlar**, sizin manuel olarak durdurup başlatmanıza gerek kalmaz.
```bash
npm run dev
```

### 🌍 Canlı (Production) Ortamında Başlatma
Node.js sunucusunu standart bir şekilde, otomatik yeniden başlatma (hot-reload) özelliği olmadan çalıştırır. Canlıya çıkarken kullanılır.
```bash
npm start
```

---

## 2. 🔴 Sistemi Durdurma

Terminalde aktif olarak çalışan bir sunucuyu, işlemi veya scripti durdurmak için klavyeden evrensel durdurma kısayolunu kullanmalısınız:

- **İlk Yöntem (Klavye Kısayolu):** `Ctrl` + `C`
*(Bastıktan sonra sistem size "İşletim dosyasından çıkılsın mı? (Y/N)" diye sorabilir, `Y` tuşuna basıp `Enter`layarak tamamen durdurabilirsiniz.)*

### ⚠️ Port Çakışması (EADDRINUSE) veya Askıda Kalan İşlemler (Hard Reset)
Bazen terminal yanıt vermez veya sunucuyu başlatmaya çalıştığınızda **"EADDRINUSE: address already in use"** (Port dolu) hatası alırsınız. Bu durumda arka planda asılı kalmış Node.js süreçlerini veya portları zorla temizlemeniz gerekir (Hard Reset). Yeni, boş bir terminal (PowerShell) açıp şu yöntemleri kullanabilirsiniz:

**Yöntem 1 (En Hızlı Yol - Tüm Node.js işlemlerini öldürür):**
Bu komut, aktif olarak çalışan tüm Node.js tabanlı sunucuları ve betikleri anında durdurur ve tuttukları portları (3000, 3001 vb.) serbest bırakır.
```powershell
taskkill /F /IM node.exe
```

**Yöntem 2 (Sadece Belirli Portları Kapatmak İçin - PowerShell Scripti):**
Eğer tüm Node işlemlerini değil de sadece belirli portları zorla temizlemek isterseniz PowerShell'e bu kod bloğunu kopyalayıp yapıştırabilirsiniz:
```powershell
$ports = @(3000, 3001, 8000, 8080) # Kapatmak istediğiniz portları buradan belirleyebilirsiniz
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "$port portunu kullanan islem (PID: $($conn.OwningProcess)) sonlandirildi." -ForegroundColor Green
        }
    } else {
        Write-Host "$port portu su an bos." -ForegroundColor Yellow
    }
}
```

*Not: Hard reset işleminden sonra portlar açılacağı için terminalinize dönüp `npm run dev` ile sunucuyu sıfırdan sorunsuzca başlatabilirsiniz.*

---

## 3. 🧹 Sistem Bakım ve Kurulum Komutları (Custom Scripts)

Projenize özel yazılmış komutlar sistemi temizlemek ve kurmak için kullanılır:

### Logları (Kayıtları) Temizleme
Zamanla biriken sunucu loglarını (`error.log` ve `combined.log`) temizler. Terminalinizde yazıları kalabalıklaştıran hataları veya aşırı büyüyen txt dosyalarını sıfırlamak için aralıklarla kullanabilirsiniz.
```bash
npm run clean:logs
```

### Prodüksiyon Kurulumunu Çalıştırma
Sistemin çalışması için gereken temel dizinleri, ortam dosyalarını ve izinleri otomatik olarak ayarlar. Yeni bir ortama geçerken sistemi hazırlar.
```bash
npm run setup
```

### Veritabanı / Manuel Kullanıcı Oluşturma
Panele giriş yapmak üzere manuel (elle) bir kullanıcı (admin vb.) kaydı oluşturmak için kullanılan yapılandırma komutudur.
```bash
npm run setup:users
```

---

## 4. 📦 Paket (Bağımlılık) Yönetimi

Node.js tabanlı olduğu için yeni paketler yüklemek ve silmek NPM üzerinden yapılır.

- **Projenin Gereksinimlerini İlk Kurulumda Yükleme:**
*(Uygulamayı GitHub'dan veya başka bir yerden yeni indirdiğinizde mutlaka ilk çalıştırılacak komuttur)*
```bash
npm install
```

- **Sisteme Yeni Bir Eklenti/Paket Ekleme:**
```bash
npm install <paket_adi>
```

- **Sistemden Kullanılmayan Bir Paketi Silme:**
```bash
npm uninstall <paket_adi>
```

---

## 5. 💻 Temel Terminal (Cmd/PowerShell) Komutları

Geliştiricilerin terminalde en temel gezinme ve düzenleme komutları:

| Komut | Açıklama |
|---|---|
| `cd <klasör_adı>` | Belirtilen bir klasörün içine girer. *(Örn: `cd scripts`)* |
| `cd ..` | Bulunduğunuz klasörden bir üst klasöre geri çıkar. |
| `dir` *(veya `ls`)* | Bulunduğunuz klasördeki tüm dosyaları ve dosyaların listesini gösterir. |
| `cls` *(veya `clear`)* | Terminal ekranındaki kalabalık yazıları silerek temiz bir ekran açar. |
| `mkdir <klasör_adı>` | İçinde bulunduğunuz dizine yeni bir klasör oluşturur. |
| `code .` | Terminalin bulunduğu konumdaki tüm projeyi Visual Studio Code editöründe açar. |

---

## 6. 🌿 Temel Git ve Github Komutları

Kodlarınızda bir değişiklik yaptıktan sonra bunu GitHub'a (Versiyon Kontrol Sistemine) kaydetmek için aşağıdaki sıralamayı takip edebilirsiniz:

1. **Tüm Değişiklikleri Hazırlama (Staging):**
```bash
git add .
```

2. **Değişiklikleri Etiketleyip Kaydetme (Commit):**
```bash
git commit -m "Buraya yaptığınız değişikliğin özetini yazın. Örn: Log temizleme scripti eklendi"
```

3. **Kodları GitHub'a Gönderme (Push):**
```bash
git push
```

4. *(Opsiyonel)* **Sunucudaki Güncel Kodları Bilgisayara Çekme (Pull):**
```bash
git pull
```

---

> 💡 **Önemli İpucu:** Tüm `npm` ve `git` komutlarını çalıştırırken komut satırı yolunuzun projenin ana dizininde (yani `package.json` dosyasını gördüğünüz dizinde) olmasına çok dikkat edin. Aksi halde "no such file or directory" ya da "missing script" hataları alabilirsiniz.
