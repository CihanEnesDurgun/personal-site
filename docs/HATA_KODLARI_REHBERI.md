# 🔧 Hata Kodları ve Çözüm Rehberi

**Versiyon:** 1.1  
**Son Güncelleme:** 2025-11-06  
**Proje:** Personal Site v2.0.4

Bu dokümantasyon, sistemde karşılaşılabilecek tüm hata mesajlarını, hata kodlarını ve çözüm önerilerini içermektedir.

## 📌 Hata Kodlarını Nasıl Görebilirim?

Sistemde bir hata ile karşılaştığınızda, hata mesajının yanında **`[Hata Kodu: XXX]`** formatında hata kodu görünecektir.

**Örnek:**
- `Blog yazısı kaydedilirken hata oluştu: Başlık en az 3 karakter olmalıdır [Hata Kodu: 203]`
- `Dosya çok büyük [Hata Kodu: 301]`
- `Kullanıcı adı veya şifre hatalı. [Hata Kodu: 110]`

Hata kodunu gördükten sonra, bu rehberde ilgili hata kodunu arayarak detaylı çözüm adımlarını bulabilirsiniz.

---

## 📋 İçindekiler

1. [Kimlik Doğrulama ve Yetkilendirme Hataları (100-199)](#1-kimlik-doğrulama-ve-yetkilendirme-hataları-100-199)
2. [Doğrulama Hataları (200-299)](#2-doğrulama-hataları-200-299)
3. [Dosya Yükleme Hataları (300-399)](#3-dosya-yükleme-hataları-300-399)
4. [Blog Yazıları Hataları (400-499)](#4-blog-yazıları-hataları-400-499)
5. [Yorum Sistemi Hataları (500-599)](#5-yorum-sistemi-hataları-500-599)
6. [Galeri ve Görsel Hataları (600-699)](#6-galeri-ve-görsel-hataları-600-699)
7. [İstatistik ve Analitik Hataları (700-799)](#7-istatistik-ve-analitik-hataları-700-799)
8. [Site Yapılandırma Hataları (800-899)](#8-site-yapılandırma-hataları-800-899)
9. [Tema Yönetimi Hataları (900-999)](#9-tema-yönetimi-hataları-900-999)
10. [Güvenlik ve Oturum Hataları (1000-1099)](#10-güvenlik-ve-oturum-hataları-1000-1099)
11. [Rate Limiting Hataları (1100-1199)](#11-rate-limiting-hataları-1100-1199)
12. [Sistem ve Sunucu Hataları (1200-1299)](#12-sistem-ve-sunucu-hataları-1200-1299)
13. [Log Yönetimi Hataları (1300-1399)](#13-log-yönetimi-hataları-1300-1399)

---

## 1. Kimlik Doğrulama ve Yetkilendirme Hataları (100-199)

### 101 - Erişim token'ı gereklidir
**Hata Mesajı:** `Erişim token'ı gereklidir`  
**HTTP Kodu:** 401  
**Hata Kodu:** `AUTHENTICATION_ERROR`

**Açıklama:** API isteği yapılırken Authorization header'ında token bulunamadı.

**Olası Sebepler:**
- Kullanıcı giriş yapmamış
- Token localStorage'dan silinmiş
- Token gönderilmemiş

**Çözüm Adımları:**
1. Admin paneline giriş yapın (`/admin/login.html`)
2. Tarayıcı konsolunu kontrol edin (F12)
3. localStorage'da `admin_token` anahtarının varlığını kontrol edin
4. Token varsa, API isteğinde `Authorization: Bearer <token>` header'ının gönderildiğinden emin olun

---

### 102 - Geçersiz veya süresi dolmuş token
**Hata Mesajı:** `Geçersiz veya süresi dolmuş token`  
**HTTP Kodu:** 401  
**Hata Kodu:** `AUTHENTICATION_ERROR`

**Açıklama:** Gönderilen token geçersiz veya süresi dolmuş.

**Olası Sebepler:**
- Token süresi dolmuş (varsayılan: 24 saat)
- Token formatı hatalı
- Token değiştirilmiş veya bozulmuş

**Çözüm Adımları:**
1. Çıkış yapıp tekrar giriş yapın
2. Tarayıcı konsolunda token'ı kontrol edin
3. Token'ı localStorage'dan silip yeniden giriş yapın:
   ```javascript
   localStorage.removeItem('admin_token');
   window.location.href = '/admin/login.html';
   ```

---

### 103 - Geçersiz token
**Hata Mesajı:** `Geçersiz token`  
**HTTP Kodu:** 401  
**Hata Kodu:** `INVALID_TOKEN`

**Açıklama:** JWT token formatı geçersiz veya imzası hatalı.

**Olası Sebepler:**
- Token manuel olarak değiştirilmiş
- JWT_SECRET değişmiş
- Token formatı bozulmuş

**Çözüm Adımları:**
1. Token'ı localStorage'dan temizleyin
2. Yeniden giriş yapın
3. Sunucu tarafında JWT_SECRET'ın değişmediğinden emin olun

---

### 104 - Token süresi dolmuş
**Hata Mesajı:** `Token süresi dolmuş`  
**HTTP Kodu:** 401  
**Hata Kodu:** `TOKEN_EXPIRED`

**Açıklama:** Token'ın süresi dolmuş, yeni bir token alınması gerekiyor.

**Olası Sebepler:**
- Token'ın expire süresi geçmiş
- Uzun süre işlem yapılmamış

**Çözüm Adımları:**
1. Otomatik olarak login sayfasına yönlendirilirsiniz
2. Tekrar giriş yapın
3. "Beni Hatırla" seçeneğini kullanarak token süresini uzatabilirsiniz

---

### 105 - Oturum süresi dolmuş veya geçersiz
**Hata Mesajı:** `Oturum süresi dolmuş veya geçersiz`  
**HTTP Kodu:** 403  
**Hata Kodu:** `INVALID_SESSION`

**Açıklama:** Server-side session doğrulaması başarısız.

**Olası Sebepler:**
- Session dosyasında kayıt bulunamadı
- Session IP adresi değişmiş
- Session User-Agent değişmiş
- Session süresi dolmuş

**Çözüm Adımları:**
1. Tekrar giriş yapın
2. Aynı IP adresinden bağlandığınızdan emin olun
3. Tarayıcı değiştirdiyseniz yeniden giriş yapın

---

### 106 - Kimlik doğrulama başarısız
**Hata Mesajı:** `Kimlik doğrulama başarısız`  
**HTTP Kodu:** 401  
**Hata Kodu:** `AUTH_ERROR`

**Açıklama:** Genel kimlik doğrulama hatası.

**Olası Sebepler:**
- Token doğrulama sırasında beklenmeyen hata
- Session yönetimi hatası

**Çözüm Adımları:**
1. Tekrar giriş yapın
2. Sunucu loglarını kontrol edin
3. Session dosyasını kontrol edin (`data/sessions.json`)

---

### 107 - Erişim reddedildi
**Hata Mesajı:** `Erişim reddedildi`  
**HTTP Kodu:** 403  
**Hata Kodu:** `AUTHORIZATION_ERROR`

**Açıklama:** Kullanıcının bu işlemi yapma yetkisi yok.

**Olası Sebepler:**
- Yetkisiz endpoint erişimi
- Dosya izinleri yetersiz

**Çözüm Adımları:**
1. Giriş yapıp yapmadığınızı kontrol edin
2. Admin yetkilerinizin olduğundan emin olun
3. İşlemi tekrar deneyin

---

### 108 - İzin reddedildi
**Hata Mesajı:** `İzin reddedildi`  
**HTTP Kodu:** 403  
**Hata Kodu:** `PERMISSION_DENIED`

**Açıklama:** Dosya sistemi izin hatası.

**Olası Sebepler:**
- Dosya/dizin yazma izni yok
- Dosya/dizin okuma izni yok

**Çözüm Adımları:**
1. Dosya izinlerini kontrol edin
2. Sunucu dosya sistem izinlerini kontrol edin
3. Gerekirse dosya sahipliğini düzeltin

---

### 109 - Kullanıcı adı ve şifre gereklidir
**Hata Mesajı:** `Kullanıcı adı ve şifre gereklidir.`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Login formunda kullanıcı adı veya şifre boş bırakılmış.

**Çözüm Adımları:**
1. Kullanıcı adı ve şifre alanlarını doldurun
2. Form validasyonunu kontrol edin

---

### 110 - Kullanıcı adı veya şifre hatalı
**Hata Mesajı:** `Kullanıcı adı veya şifre hatalı.`  
**HTTP Kodu:** 401  
**Hata Kodu:** `AUTHENTICATION_ERROR`

**Açıklama:** Giriş bilgileri yanlış.

**Olası Sebepler:**
- Yanlış kullanıcı adı
- Yanlış şifre
- Büyük/küçük harf duyarlılığı

**Çözüm Adımları:**
1. Kullanıcı adı ve şifreyi kontrol edin
2. Caps Lock'un açık olmadığından emin olun
3. Şifreyi sıfırlamayı düşünün (`data/users.json` dosyasını kontrol edin)

---

### 111 - Çıkış yapılamadı
**Hata Mesajı:** `Çıkış yapılamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `LOGOUT_ERROR`

**Açıklama:** Logout işlemi sırasında hata oluştu.

**Çözüm Adımları:**
1. Sayfayı yenileyin
2. localStorage'dan token'ı manuel olarak silin:
   ```javascript
   localStorage.removeItem('admin_token');
   window.location.href = '/admin/login.html';
   ```

---

## 2. Doğrulama Hataları (200-299)

### 201 - Doğrulama Hatası
**Hata Mesajı:** `Doğrulama Hatası`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Gönderilen veri formatı veya içeriği geçersiz.

**Olası Sebepler:**
- Eksik gerekli alanlar
- Yanlış veri tipi
- Format hatası

**Çözüm Adımları:**
1. Gönderilen veriyi kontrol edin
2. Tüm gerekli alanların doldurulduğundan emin olun
3. Veri formatını kontrol edin

---

### 202 - Eksik gerekli alanlar
**Hata Mesajı:** `Eksik gerekli alanlar: <alan1>, <alan2>`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Formda zorunlu alanlar boş bırakılmış.

**Çözüm Adımları:**
1. Hata mesajında belirtilen alanları doldurun
2. Form validasyonunu kontrol edin

---

### 203 - Başlık en az 3 karakter olmalıdır
**Hata Mesajı:** `Başlık en az 3 karakter olmalıdır`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Blog yazısı başlığı çok kısa.

**Çözüm Adımları:**
1. Başlığı en az 3 karakter yapın
2. Başlığın anlamlı olduğundan emin olun

---

### 204 - Özet en az 10 karakter olmalıdır
**Hata Mesajı:** `Özet en az 10 karakter olmalıdır`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Blog yazısı özeti çok kısa.

**Çözüm Adımları:**
1. Özeti en az 10 karakter yapın
2. Özetin yazıyı açıklayıcı olduğundan emin olun

---

### 205 - İçerik en az 50 karakter olmalıdır
**Hata Mesajı:** `İçerik en az 50 karakter olmalıdır`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Blog yazısı içeriği çok kısa.

**Çözüm Adımları:**
1. İçeriği en az 50 karakter yapın
2. Yazının yeterince detaylı olduğundan emin olun

---

### 206 - Öne çıkarılan durumu boolean olmalıdır
**Hata Mesajı:** `Öne çıkarılan durumu boolean olmalıdır`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Featured status değeri boolean (true/false) olmalı.

**Çözüm Adımları:**
1. Featured değerini `true` veya `false` olarak gönderin
2. String veya number değil, boolean kullanın

---

### 207 - Geçersiz durum
**Hata Mesajı:** `Geçersiz durum`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Blog yazısı durumu geçersiz (draft, published, scheduled, deleted dışında).

**Çözüm Adımları:**
1. Durumu şunlardan biri yapın: `draft`, `published`, `scheduled`, `deleted`
2. Büyük/küçük harf duyarlılığına dikkat edin

---

### 208 - Zamanlanmış yazılar için yayın tarihi gereklidir
**Hata Mesajı:** `Zamanlanmış yazılar için yayın tarihi gereklidir`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Status `scheduled` ise publishDate zorunlu.

**Çözüm Adımları:**
1. Yayın tarihini seçin
2. Tarihin gelecekte olduğundan emin olun
3. ISO formatında gönderin: `YYYY-MM-DDTHH:mm:ss.sssZ`

---

### 209 - İsim, e-posta ve içerik gereklidir
**Hata Mesajı:** `İsim, e-posta ve içerik gereklidir`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Yorum formunda zorunlu alanlar boş.

**Çözüm Adımları:**
1. İsim, e-posta ve yorum alanlarını doldurun
2. Tüm alanların dolu olduğundan emin olun

---

### 210 - Yorum en az 3 karakter olmalıdır
**Hata Mesajı:** `Yorum en az 3 karakter olmalıdır`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Yorum içeriği çok kısa.

**Çözüm Adımları:**
1. Yorumu en az 3 karakter yapın
2. Anlamlı bir yorum yazın

---

### 211 - Yorum 1000 karakterden az olmalıdır
**Hata Mesajı:** `Yorum 1000 karakterden az olmalıdır`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Yorum çok uzun.

**Çözüm Adımları:**
1. Yorumu 1000 karakterden kısa yapın
2. Gerekirse yorumu bölün

---

### 212 - Geçersiz e-posta formatı
**Hata Mesajı:** `Geçersiz e-posta formatı`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** E-posta adresi formatı geçersiz.

**Çözüm Adımları:**
1. E-posta formatını kontrol edin (örn: `user@example.com`)
2. @ işaretinin varlığından emin olun
3. Domain kısmının doğru olduğundan emin olun

---

### 213 - Kullanıcı adı en az 3 karakter olmalıdır
**Hata Mesajı:** `Kullanıcı adı en az 3 karakter olmalıdır`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Hesap güncelleme sırasında kullanıcı adı çok kısa.

**Çözüm Adımları:**
1. Kullanıcı adını en az 3 karakter yapın
2. Kullanıcı adının benzersiz olduğundan emin olun

---

### 214 - Yeni şifre en az 6 karakter olmalıdır
**Hata Mesajı:** `Yeni şifre en az 6 karakter olmalıdır`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Şifre değiştirme sırasında yeni şifre çok kısa.

**Çözüm Adımları:**
1. Yeni şifreyi en az 6 karakter yapın
2. Güçlü bir şifre seçin (harf, rakam, özel karakter)

---

### 215 - Geçersiz log verisi
**Hata Mesajı:** `Geçersiz log verisi`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Log kaydetme isteğinde veri formatı hatalı.

**Çözüm Adımları:**
1. Log verisinin array formatında olduğundan emin olun
2. Her log entry'nin gerekli alanları içerdiğinden emin olun

---

### 216 - Geçersiz log giriş formatı
**Hata Mesajı:** `Geçersiz log giriş formatı`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Log entry'sinde gerekli alanlar eksik (id, timestamp, level, message).

**Çözüm Adımları:**
1. Her log entry'nin şu alanları içerdiğinden emin olun:
   - `id`: Benzersiz ID
   - `timestamp`: Zaman damgası
   - `level`: Log seviyesi (error, warn, info, log, debug)
   - `message`: Log mesajı

---

### 217 - Geçersiz saklama günü değeri
**Hata Mesajı:** `Geçersiz saklama günü değeri`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Log cleanup için retentionDays değeri geçersiz (1'den küçük veya number değil).

**Çözüm Adımları:**
1. retentionDays değerini 1 veya daha büyük bir sayı yapın
2. Number tipinde olduğundan emin olun

---

### 218 - Geçersiz tema verisi
**Hata Mesajı:** `Geçersiz tema verisi`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Tema verisi eksik veya hatalı format.

**Çözüm Adımları:**
1. Tema verisinin `light` ve `dark` objelerini içerdiğinden emin olun
2. Her tema objesinin gerekli renk alanlarını içerdiğinden emin olun

---

### 219 - Eksik gerekli hero alanları
**Hata Mesajı:** `Eksik gerekli hero alanları`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Site config'de hero bölümü eksik veya hatalı.

**Çözüm Adımları:**
1. Hero objesinin `name`, `headline`, `bio` alanlarını içerdiğinden emin olun
2. Tüm alanların dolu olduğundan emin olun

---

### 220 - Eksik gerekli site alanları
**Hata Mesajı:** `Eksik gerekli site alanları`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Site config'de site bölümü eksik veya hatalı.

**Çözüm Adımları:**
1. Site objesinin `title` ve `description` alanlarını içerdiğinden emin olun
2. Tüm alanların dolu olduğundan emin olun

---

## 3. Dosya Yükleme Hataları (300-399)

### 301 - Dosya çok büyük
**Hata Mesajı:** `Dosya çok büyük`  
**HTTP Kodu:** 400  
**Hata Kodu:** `FILE_SIZE_LIMIT`

**Açıklama:** Yüklenen dosya maksimum boyutu (5MB) aşıyor.

**Olası Sebepler:**
- Dosya boyutu 5MB'dan büyük
- Görsel sıkıştırılmamış

**Çözüm Adımları:**
1. Dosyayı sıkıştırın (ör: TinyPNG, Squoosh)
2. Dosya boyutunu 5MB'ın altına düşürün
3. Gerekirse görseli yeniden boyutlandırın

---

### 302 - Dosya tipi izin verilmiyor
**Hata Mesajı:** `Dosya tipi izin verilmiyor. İzin verilen tipler: image/jpeg, image/jpg, image/png, image/gif, image/webp`  
**HTTP Kodu:** 400  
**Hata Kodu:** `FILE_TYPE_NOT_ALLOWED`

**Açıklama:** Yüklenen dosya tipi izin verilenler arasında değil.

**İzin Verilen Tipler:**
- image/jpeg
- image/jpg
- image/png
- image/gif
- image/webp

**Çözüm Adımları:**
1. Dosyayı izin verilen formattan birine dönüştürün
2. PNG veya JPEG formatını kullanın
3. WebP formatı önerilir (daha küçük boyut)

---

### 303 - Dosya uzantısı izin verilmiyor
**Hata Mesajı:** `Dosya uzantısı izin verilmiyor. İzin verilen uzantılar: .jpg, .jpeg, .png, .gif, .webp`  
**HTTP Kodu:** 400  
**Hata Kodu:** `FILE_EXTENSION_NOT_ALLOWED`

**Açıklama:** Dosya uzantısı izin verilenler arasında değil.

**Çözüm Adımları:**
1. Dosyayı izin verilen uzantılardan biriyle kaydedin
2. Dosya adını kontrol edin (uzantı küçük harf olmalı)

---

### 304 - Dosya yükleme başarısız
**Hata Mesajı:** `Dosya yükleme başarısız`  
**HTTP Kodu:** 400  
**Hata Kodu:** `UPLOAD_ERROR`

**Açıklama:** Dosya yükleme sırasında genel hata.

**Olası Sebepler:**
- Disk alanı dolmuş
- Dosya sistemi hatası
- Network hatası

**Çözüm Adımları:**
1. Disk alanını kontrol edin
2. İnternet bağlantısını kontrol edin
3. Dosyayı tekrar yüklemeyi deneyin
4. Sunucu loglarını kontrol edin

---

### 305 - Dosya yüklenmedi
**Hata Mesajı:** `Dosya yüklenmedi`  
**HTTP Kodu:** 400  
**Hata Kodu:** `NO_FILE`

**Açıklama:** Yükleme isteğinde dosya bulunamadı.

**Çözüm Adımları:**
1. Dosya seçildiğinden emin olun
2. FormData'da `image` field'ının olduğundan emin olun
3. Dosya seçimini tekrar yapın

---

### 306 - Çok fazla dosya
**Hata Mesajı:** `Çok fazla dosya`  
**HTTP Kodu:** 400  
**Hata Kodu:** `FILE_COUNT_LIMIT`

**Açıklama:** Aynı anda birden fazla dosya yüklenmeye çalışıldı (maksimum: 1).

**Çözüm Adımları:**
1. Tek seferde bir dosya yükleyin
2. Birden fazla dosya için ayrı ayrı yükleme yapın

---

### 307 - Dosya hedef klasöre kaydedilirken hata oluştu
**Hata Mesajı:** `Dosya hedef klasöre kaydedilirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `FOLDER_SAVE_ERROR`

**Açıklama:** Dosya yüklendi ancak hedef klasöre taşınamadı.

**Olası Sebepler:**
- Klasör izinleri yetersiz
- Disk alanı dolmuş
- Klasör mevcut değil

**Çözüm Adımları:**
1. Klasör izinlerini kontrol edin (`images/` alt klasörleri)
2. Disk alanını kontrol edin
3. Klasörlerin mevcut olduğundan emin olun:
   - `images/system/`
   - `images/profile/`
   - `images/blog-covers/`
   - `images/blog-content/`

---

### 308 - Yüklenen dosya işlenirken hata oluştu
**Hata Mesajı:** `Yüklenen dosya işlenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `PROCESSING_ERROR`

**Açıklama:** Dosya işleme sırasında sunucu hatası.

**Çözüm Adımları:**
1. Sunucu loglarını kontrol edin
2. Dosyayı tekrar yüklemeyi deneyin
3. Farklı bir dosya ile deneyin

---

## 4. Blog Yazıları Hataları (400-499)

### 401 - Blog yazıları yüklenirken hata oluştu
**Hata Mesajı:** `Blog yazıları yüklenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Blog yazıları listesi yüklenirken hata.

**Olası Sebepler:**
- `content/posts.json` dosyası bozuk
- Dosya okuma izni yok
- JSON formatı hatalı

**Çözüm Adımları:**
1. `content/posts.json` dosyasını kontrol edin
2. JSON formatının geçerli olduğundan emin olun
3. Dosya izinlerini kontrol edin
4. Dosyayı yedekten geri yükleyin

---

### 402 - Blog yazısı bulunamadı
**Hata Mesajı:** `Blog yazısı bulunamadı`  
**HTTP Kodu:** 404  
**Hata Kodu:** `NOT_FOUND`

**Açıklama:** İstenen slug'a sahip blog yazısı bulunamadı.

**Olası Sebepler:**
- Slug yanlış
- Yazı silinmiş
- Yazı henüz oluşturulmamış

**Çözüm Adımları:**
1. Slug'ı kontrol edin
2. Yazının mevcut olduğundan emin olun
3. Yazı listesini kontrol edin

---

### 403 - Blog yazısı yüklenirken hata oluştu
**Hata Mesajı:** `Blog yazısı yüklenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Tek bir blog yazısı yüklenirken hata.

**Çözüm Adımları:**
1. Markdown dosyasının mevcut olduğundan emin olun
2. Dosya okuma izinlerini kontrol edin
3. Markdown dosyasının bozuk olmadığından emin olun

---

### 404 - Bu başlıkta bir blog yazısı zaten mevcut
**Hata Mesajı:** `Bu başlıkta bir blog yazısı zaten mevcut`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Aynı başlıkta başka bir yazı var (slug çakışması).

**Çözüm Adımları:**
1. Başlığı değiştirin
2. Mevcut yazıyı kontrol edin
3. Slug'ın benzersiz olduğundan emin olun

---

### 405 - Blog yazısı metadata kaydedilirken hata oluştu
**Hata Mesajı:** `Blog yazısı metadata kaydedilirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** `posts.json` dosyasına yazma hatası.

**Olası Sebepler:**
- Dosya yazma izni yok
- Disk alanı dolmuş
- JSON formatı hatalı

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. Disk alanını kontrol edin
3. JSON formatını kontrol edin
4. Dosyayı yedekten geri yükleyin

---

### 406 - Blog yazıları metadata kaydedilirken hata oluştu
**Hata Mesajı:** `Blog yazıları metadata kaydedilirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Tüm yazılar listesi kaydedilirken hata.

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. Disk alanını kontrol edin
3. JSON formatını kontrol edin

---

### 407 - Blog yazısı oluşturulurken hata oluştu
**Hata Mesajı:** `Blog yazısı oluşturulurken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Yeni blog yazısı oluşturulurken hata.

**Çözüm Adımları:**
1. Tüm gerekli alanların dolu olduğundan emin olun
2. Markdown dosyası oluşturma izinlerini kontrol edin
3. İşlemi tekrar deneyin

---

### 408 - Blog yazısı güncellenirken hata oluştu
**Hata Mesajı:** `Blog yazısı güncellenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Mevcut blog yazısı güncellenirken hata.

**Çözüm Adımları:**
1. Yazının mevcut olduğundan emin olun
2. Dosya yazma izinlerini kontrol edin
3. İşlemi tekrar deneyin

---

### 409 - Öne çıkarılan durum güncellenirken hata oluştu
**Hata Mesajı:** `Öne çıkarılan durum güncellenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Featured status güncellenirken hata.

**Çözüm Adımları:**
1. Yazının mevcut olduğundan emin olun
2. Featured değerinin boolean olduğundan emin olun
3. İşlemi tekrar deneyin

---

### 410 - Blog yazısı silinirken hata oluştu
**Hata Mesajı:** `Blog yazısı silinirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Blog yazısı geri dönüşüm kutusuna taşınırken hata.

**Çözüm Adımları:**
1. Yazının mevcut olduğundan emin olun
2. Dosya yazma izinlerini kontrol edin
3. İşlemi tekrar deneyin

---

### 411 - Blog yazısı yayınlanırken hata oluştu
**Hata Mesajı:** `Blog yazısı yayınlanırken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Blog yazısı yayınlanırken hata.

**Çözüm Adımları:**
1. Yazının mevcut olduğundan emin olun
2. Status değerinin geçerli olduğundan emin olun
3. İşlemi tekrar deneyin

---

### 412 - Blog yazısı geri yüklenirken hata oluştu
**Hata Mesajı:** `Blog yazısı geri yüklenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Geri dönüşüm kutusundan blog yazısı geri yüklenirken hata.

**Çözüm Adımları:**
1. Yazının geri dönüşüm kutusunda olduğundan emin olun
2. Dosya yazma izinlerini kontrol edin
3. İşlemi tekrar deneyin

---

### 413 - Blog yazısı geri dönüşüm kutusunda değil
**Hata Mesajı:** `Blog yazısı geri dönüşüm kutusunda değil`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Geri yükleme işlemi için yazı geri dönüşüm kutusunda değil.

**Çözüm Adımları:**
1. Yazının status'unun `deleted` olduğundan emin olun
2. Yazı listesinde geri dönüşüm kutusunu kontrol edin

---

### 414 - Blog yazısı kalıcı olarak silinirken hata oluştu
**Hata Mesajı:** `Blog yazısı kalıcı olarak silinirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Blog yazısı kalıcı olarak silinirken hata.

**Çözüm Adımları:**
1. Yazının geri dönüşüm kutusunda olduğundan emin olun
2. Markdown dosyası silme izinlerini kontrol edin
3. İşlemi tekrar deneyin

---

## 5. Yorum Sistemi Hataları (500-599)

### 501 - Yorumlar alınamadı
**Hata Mesajı:** `Yorumlar alınamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Blog yazısı yorumları yüklenirken hata.

**Olası Sebepler:**
- `data/comments.json` dosyası bozuk
- Dosya okuma izni yok
- JSON formatı hatalı

**Çözüm Adımları:**
1. `data/comments.json` dosyasını kontrol edin
2. JSON formatının geçerli olduğundan emin olun
3. Dosya izinlerini kontrol edin

---

### 502 - Yorum eklenirken hata oluştu
**Hata Mesajı:** `Yorum eklenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Yeni yorum eklenirken hata.

**Çözüm Adımları:**
1. Tüm gerekli alanların dolu olduğundan emin olun
2. Dosya yazma izinlerini kontrol edin
3. İşlemi tekrar deneyin

---

### 503 - Üst yorum bulunamadı
**Hata Mesajı:** `Üst yorum bulunamadı`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Yanıt verilmeye çalışılan yorum bulunamadı.

**Olası Sebepler:**
- parent_id yanlış
- Yorum silinmiş
- Yorum henüz onaylanmamış

**Çözüm Adımları:**
1. parent_id'nin doğru olduğundan emin olun
2. Yorumun mevcut olduğundan emin olun
3. Yorumun onaylandığından emin olun

---

### 504 - Maksimum yanıt derinliğine ulaşıldı
**Hata Mesajı:** `Maksimum yanıt derinliğine ulaşıldı`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Yanıt derinliği limiti (2 seviye) aşıldı.

**Açıklama:** Sistem maksimum 2 seviye yanıt derinliğine izin verir:
- Seviye 1: Ana yoruma yanıt
- Seviye 2: Yanıta yanıt
- Seviye 3: İzin verilmez

**Çözüm Adımları:**
1. Yeni bir yorum olarak gönderin
2. Daha üst seviyede bir yoruma yanıt verin

---

### 505 - Yorum güncellenirken hata oluştu
**Hata Mesajı:** `Yorum güncellenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Yorum onay/red işlemi sırasında hata.

**Çözüm Adımları:**
1. Yorumun mevcut olduğundan emin olun
2. Dosya yazma izinlerini kontrol edin
3. İşlemi tekrar deneyin

---

### 506 - Yorum bulunamadı
**Hata Mesajı:** `Yorum bulunamadı`  
**HTTP Kodu:** 404  
**Hata Kodu:** `NOT_FOUND`

**Açıklama:** İstenen ID'ye sahip yorum bulunamadı.

**Çözüm Adımları:**
1. Yorum ID'sini kontrol edin
2. Yorumun mevcut olduğundan emin olun
3. Yorum listesini kontrol edin

---

### 507 - Yorum silinirken hata oluştu
**Hata Mesajı:** `Yorum silinirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Yorum silinirken hata.

**Çözüm Adımları:**
1. Yorumun mevcut olduğundan emin olun
2. Dosya yazma izinlerini kontrol edin
3. İşlemi tekrar deneyin

---

## 6. Galeri ve Görsel Hataları (600-699)

### 601 - Silinen görseller alınırken hata oluştu
**Hata Mesajı:** `Silinen görseller alınırken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `GALLERY_ERROR`

**Açıklama:** Silinen görseller listesi yüklenirken hata.

**Çözüm Adımları:**
1. `images/deleted/` klasörünün mevcut olduğundan emin olun
2. Klasör okuma izinlerini kontrol edin
3. `data/deleted-images.json` dosyasını kontrol edin

---

### 602 - Galeri görselleri alınırken hata oluştu
**Hata Mesajı:** `Galeri görselleri alınırken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `GALLERY_ERROR`

**Açıklama:** Galeri klasöründeki görseller yüklenirken hata.

**Olası Sebepler:**
- Klasör mevcut değil
- Klasör okuma izni yok
- Geçersiz klasör adı

**Çözüm Adımları:**
1. Klasör adının geçerli olduğundan emin olun:
   - `system`
   - `profile`
   - `blog-covers`
   - `blog-content`
2. Klasörün mevcut olduğundan emin olun
3. Klasör okuma izinlerini kontrol edin

---

### 603 - Geçersiz klasör
**Hata Mesajı:** `Geçersiz klasör`  
**HTTP Kodu:** 400  
**Hata Kodu:** `INVALID_FOLDER`

**Açıklama:** Belirtilen klasör adı geçersiz.

**Geçerli Klasörler:**
- `system`
- `profile`
- `blog-covers`
- `blog-content`

**Çözüm Adımları:**
1. Klasör adını geçerli olanlardan biri yapın
2. Büyük/küçük harf duyarlılığına dikkat edin

---

### 604 - Silinen klasörde dosya bulunamadı
**Hata Mesajı:** `Silinen klasörde dosya bulunamadı`  
**HTTP Kodu:** 404  
**Hata Kodu:** `FILE_NOT_FOUND`

**Açıklama:** Silinen klasörde belirtilen dosya bulunamadı.

**Çözüm Adımları:**
1. Dosya adını kontrol edin
2. Dosyanın `images/deleted/` klasöründe olduğundan emin olun
3. Dosya adının doğru yazıldığından emin olun

---

### 605 - Silinen görsel için metadata bulunamadı
**Hata Mesajı:** `Silinen görsel için metadata bulunamadı`  
**HTTP Kodu:** 400  
**Hata Kodu:** `NO_METADATA`

**Açıklama:** Görsel geri yüklenirken metadata bulunamadı.

**Olası Sebepler:**
- `data/deleted-images.json` dosyasında kayıt yok
- Metadata dosyası bozuk

**Çözüm Adımları:**
1. `data/deleted-images.json` dosyasını kontrol edin
2. Dosyanın geçerli JSON formatında olduğundan emin olun
3. Görselin metadata'sını manuel olarak ekleyin

---

### 606 - Dosya orijinal konumunda zaten mevcut
**Hata Mesajı:** `Dosya orijinal konumunda zaten mevcut`  
**HTTP Kodu:** 400  
**Hata Kodu:** `FILE_EXISTS`

**Açıklama:** Görsel geri yüklenirken orijinal konumda aynı isimde dosya var.

**Çözüm Adımları:**
1. Orijinal konumdaki dosyayı kontrol edin
2. Gerekirse dosyayı farklı bir isimle geri yükleyin
3. Orijinal dosyayı silip tekrar deneyin

---

### 607 - Görsel geri yüklenirken hata oluştu
**Hata Mesajı:** `Görsel geri yüklenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `RESTORE_ERROR`

**Açıklama:** Görsel silinen klasörden orijinal konuma taşınırken hata.

**Çözüm Adımları:**
1. Dosya taşıma izinlerini kontrol edin
2. Orijinal klasörün mevcut olduğundan emin olun
3. Disk alanını kontrol edin

---

### 608 - Görsel kalıcı olarak silinirken hata oluştu
**Hata Mesajı:** `Görsel kalıcı olarak silinirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `DELETE_ERROR`

**Açıklama:** Görsel kalıcı olarak silinirken hata.

**Çözüm Adımları:**
1. Dosya silme izinlerini kontrol edin
2. Dosyanın mevcut olduğundan emin olun
3. İşlemi tekrar deneyin

---

### 609 - Dosya bulunamadı
**Hata Mesajı:** `Dosya bulunamadı`  
**HTTP Kodu:** 404  
**Hata Kodu:** `FILE_NOT_FOUND`

**Açıklama:** Belirtilen görsel dosyası bulunamadı.

**Çözüm Adımları:**
1. Dosya yolunu kontrol edin
2. Dosyanın mevcut olduğundan emin olun
3. Dosya adının doğru yazıldığından emin olun

---

### 610 - Görsel silinen klasöre taşınırken hata oluştu
**Hata Mesajı:** `Görsel silinen klasöre taşınırken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `DELETE_ERROR`

**Açıklama:** Görsel silinen klasöre taşınırken hata.

**Çözüm Adımları:**
1. `images/deleted/` klasörünün mevcut olduğundan emin olun
2. Klasör yazma izinlerini kontrol edin
3. Disk alanını kontrol edin

---

## 7. İstatistik ve Analitik Hataları (700-799)

### 701 - İstatistikler yüklenirken hata oluştu
**Hata Mesajı:** `İstatistikler yüklenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Dashboard istatistikleri yüklenirken hata.

**Olası Sebepler:**
- `data/stats.json` dosyası bozuk
- Dosya okuma izni yok
- JSON formatı hatalı

**Çözüm Adımları:**
1. `data/stats.json` dosyasını kontrol edin
2. JSON formatının geçerli olduğundan emin olun
3. Dosya izinlerini kontrol edin
4. Dosyayı yedekten geri yükleyin

---

### 702 - Sayfa parametresi gereklidir
**Hata Mesajı:** `Sayfa parametresi gereklidir`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Sayfa görüntüleme takibi için page parametresi eksik.

**Çözüm Adımları:**
1. İstek body'sinde `page` parametresini gönderin
2. Geçerli bir sayfa adı kullanın (örn: `blog`, `post`, `index`)

---

### 703 - Sayfa görüntüleme takip edilemedi
**Hata Mesajı:** `Sayfa görüntüleme takip edilemedi`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Sayfa görüntüleme istatistiği kaydedilirken hata.

**Çözüm Adımları:**
1. `data/stats.json` dosyası yazma izinlerini kontrol edin
2. Disk alanını kontrol edin
3. JSON formatını kontrol edin

---

### 704 - Slug parametresi gereklidir
**Hata Mesajı:** `Slug parametresi gereklidir`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Blog yazısı görüntüleme takibi için slug parametresi eksik.

**Çözüm Adımları:**
1. İstek body'sinde `slug` parametresini gönderin
2. Geçerli bir blog yazısı slug'ı kullanın

---

### 705 - Blog yazısı görüntüleme takip edilemedi
**Hata Mesajı:** `Blog yazısı görüntüleme takip edilemedi`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Blog yazısı görüntüleme istatistiği kaydedilirken hata.

**Çözüm Adımları:**
1. `data/stats.json` dosyası yazma izinlerini kontrol edin
2. Slug'ın geçerli olduğundan emin olun
3. Disk alanını kontrol edin

---

### 706 - Analitik veriler alınamadı
**Hata Mesajı:** `Analitik veriler alınamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Analitik verileri hesaplanırken hata.

**Çözüm Adımları:**
1. `data/stats.json` dosyasını kontrol edin
2. İstatistik verilerinin geçerli olduğundan emin olun
3. Sunucu loglarını kontrol edin

---

### 707 - İstatistik verileri temizlenirken hata oluştu
**Hata Mesajı:** `İstatistik verileri temizlenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** İstatistik verileri temizlenirken hata.

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. İstatistik verilerini yedekleyin
3. İşlemi tekrar deneyin

---

### 708 - İstatistik verisi doğrulaması başarısız
**Hata Mesajı:** `İstatistik verisi doğrulaması başarısız`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** İstatistik verilerinde tutarsızlık var (orphaned data).

**Olası Sebepler:**
- Silinmiş blog yazıları için istatistik verisi kalmış
- Veri bütünlüğü bozulmuş

**Çözüm Adımları:**
1. İstatistik temizleme işlemini çalıştırın
2. Orphaned verileri manuel olarak temizleyin
3. İstatistik doğrulama işlemini tekrar çalıştırın

---

### 709 - İstatistik verileri doğrulanamadı
**Hata Mesajı:** `İstatistik verileri doğrulanamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** İstatistik verileri doğrulanırken hata.

**Çözüm Adımları:**
1. `data/stats.json` dosyasını kontrol edin
2. JSON formatının geçerli olduğundan emin olun
3. Dosya izinlerini kontrol edin

---

### 710 - Önbellek istatistikleri alınamadı
**Hata Mesajı:** `Önbellek istatistikleri alınamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Önbellek istatistikleri hesaplanırken hata.

**Çözüm Adımları:**
1. Önbellek sistemini kontrol edin
2. Sunucu loglarını kontrol edin

---

### 711 - Önbellek temizlenirken hata oluştu
**Hata Mesajı:** `Önbellek temizlenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Önbellek temizlenirken hata.

**Çözüm Adımları:**
1. Önbellek sistemini kontrol edin
2. İşlemi tekrar deneyin

---

## 8. Site Yapılandırma Hataları (800-899)

### 801 - Site yapılandırması okunamadı
**Hata Mesajı:** `Site yapılandırması okunamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** `content/site.json` dosyası okunamadı.

**Olası Sebepler:**
- Dosya mevcut değil
- Dosya okuma izni yok
- JSON formatı hatalı

**Çözüm Adımları:**
1. `content/site.json` dosyasının mevcut olduğundan emin olun
2. Dosya okuma izinlerini kontrol edin
3. JSON formatını kontrol edin
4. Dosya yoksa varsayılan config oluşturulur

---

### 802 - Site yapılandırması güncellenirken hata oluştu
**Hata Mesajı:** `Site yapılandırması güncellenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Site config güncellenirken hata.

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. Config verisinin geçerli olduğundan emin olun
3. Disk alanını kontrol edin

---

### 803 - Dosya adı gereklidir
**Hata Mesajı:** `Dosya adı gereklidir`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** Sistem ikonu ayarlanırken filename parametresi eksik.

**Çözüm Adımları:**
1. İstek body'sinde `filename` parametresini gönderin
2. Dosya adının geçerli olduğundan emin olun

---

### 804 - İkon dosyası bulunamadı
**Hata Mesajı:** `İkon dosyası bulunamadı`  
**HTTP Kodu:** 404  
**Hata Kodu:** `FILE_NOT_FOUND`

**Açıklama:** Belirtilen ikon dosyası `images/system/` klasöründe bulunamadı.

**Çözüm Adımları:**
1. Dosyanın `images/system/` klasöründe olduğundan emin olun
2. Dosya adını kontrol edin
3. Dosya uzantısını kontrol edin (.png önerilir)

---

### 805 - Sistem ikonu ayarlanırken hata oluştu
**Hata Mesajı:** `Sistem ikonu ayarlanırken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** HTML dosyalarındaki favicon referansları güncellenirken hata.

**Çözüm Adımları:**
1. HTML dosyalarının yazma izinlerini kontrol edin
2. Dosyaların mevcut olduğundan emin olun
3. İşlemi tekrar deneyin

---

### 806 - Kullanıcı bilgileri kaydedilemedi
**Hata Mesajı:** `Kullanıcı bilgileri kaydedilemedi`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Hesap güncelleme sırasında kullanıcı bilgileri kaydedilemedi.

**Çözüm Adımları:**
1. `data/users.json` dosyası yazma izinlerini kontrol edin
2. Disk alanını kontrol edin
3. JSON formatını kontrol edin

---

### 807 - Hesap güncellenirken hata oluştu
**Hata Mesajı:** `Hesap güncellenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Hesap güncelleme işlemi sırasında genel hata.

**Çözüm Adımları:**
1. Mevcut şifrenin doğru olduğundan emin olun
2. Yeni kullanıcı adı ve şifre gereksinimlerini kontrol edin
3. İşlemi tekrar deneyin

---

### 808 - Kullanıcı bilgileri alınamadı
**Hata Mesajı:** `Kullanıcı bilgileri alınamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Kullanıcı bilgileri yüklenirken hata.

**Çözüm Adımları:**
1. `data/users.json` dosyasını kontrol edin
2. Dosya okuma izinlerini kontrol edin
3. Kullanıcının mevcut olduğundan emin olun

---

### 809 - Kullanıcı bulunamadı
**Hata Mesajı:** `Kullanıcı bulunamadı`  
**HTTP Kodu:** 404  
**Hata Kodu:** `NOT_FOUND`

**Açıklama:** Belirtilen kullanıcı adına sahip kullanıcı bulunamadı.

**Çözüm Adımları:**
1. Kullanıcı adını kontrol edin
2. `data/users.json` dosyasında kullanıcının mevcut olduğundan emin olun

---

### 810 - Mevcut şifre yanlış
**Hata Mesajı:** `Mevcut şifre yanlış`  
**HTTP Kodu:** 401  
**Hata Kodu:** `AUTHENTICATION_ERROR`

**Açıklama:** Hesap güncelleme sırasında mevcut şifre doğrulanamadı.

**Çözüm Adımları:**
1. Mevcut şifreyi kontrol edin
2. Büyük/küçük harf duyarlılığına dikkat edin
3. Caps Lock'un kapalı olduğundan emin olun

---

## 9. Tema Yönetimi Hataları (900-999)

### 901 - Tema ayarları kaydedilirken hata oluştu
**Hata Mesajı:** `Tema ayarları kaydedilirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Tema ayarları `data/theme.json` dosyasına kaydedilirken hata.

**Çözüm Adımları:**
1. `data/theme.json` dosyası yazma izinlerini kontrol edin
2. Disk alanını kontrol edin
3. Tema verisinin geçerli formatında olduğundan emin olun

---

### 902 - Tema ayarları güncellenirken hata oluştu
**Hata Mesajı:** `Tema ayarları güncellenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Tema ayarları güncellenirken hata.

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. Tema verisinin geçerli olduğundan emin olun
3. İşlemi tekrar deneyin

---

### 903 - Tema sıfırlanırken hata oluştu
**Hata Mesajı:** `Tema sıfırlanırken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Tema varsayılan ayarlara döndürülürken hata.

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. İşlemi tekrar deneyin

---

## 10. Güvenlik ve Oturum Hataları (1000-1099)

### 1001 - Oturum bilgisi alınamadı
**Hata Mesajı:** `Oturum bilgisi alınamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `SESSION_INFO_ERROR`

**Açıklama:** Oturum bilgileri yüklenirken hata.

**Olası Sebepler:**
- `data/sessions.json` dosyası bozuk
- Dosya okuma izni yok

**Çözüm Adımları:**
1. `data/sessions.json` dosyasını kontrol edin
2. JSON formatını kontrol edin
3. Dosya izinlerini kontrol edin

---

### 1002 - Oturum istatistikleri alınamadı
**Hata Mesajı:** `Oturum istatistikleri alınamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `SESSION_STATS_ERROR`

**Açıklama:** Oturum istatistikleri hesaplanırken hata.

**Çözüm Adımları:**
1. `data/sessions.json` dosyasını kontrol edin
2. İstatistik hesaplama kodunu kontrol edin

---

### 1003 - Oturum bulunamadı
**Hata Mesajı:** `Oturum bulunamadı`  
**HTTP Kodu:** 404  
**Hata Kodu:** `NOT_FOUND`

**Açıklama:** Belirtilen session ID'ye sahip oturum bulunamadı.

**Çözüm Adımları:**
1. Session ID'yi kontrol edin
2. Oturumun mevcut olduğundan emin olun
3. Oturum listesini kontrol edin

---

### 1004 - Oturum sonlandırılırken hata oluştu
**Hata Mesajı:** `Oturum sonlandırılırken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Oturum sonlandırılırken hata.

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. Session ID'nin geçerli olduğundan emin olun
3. İşlemi tekrar deneyin

---

### 1005 - Oturumlar sonlandırılırken hata oluştu
**Hata Mesajı:** `Oturumlar sonlandırılırken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Tüm oturumlar sonlandırılırken hata.

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. İşlemi tekrar deneyin

---

### 1006 - IP adresi gerekli
**Hata Mesajı:** `IP adresi gerekli`  
**HTTP Kodu:** 400  
**Hata Kodu:** `VALIDATION_ERROR`

**Açıklama:** IP engelleme işlemi için IP adresi parametresi eksik.

**Çözüm Adımları:**
1. İstek body'sinde `ip` parametresini gönderin
2. Geçerli bir IP adresi formatı kullanın

---

### 1007 - IP engellenirken hata oluştu
**Hata Mesajı:** `IP engellenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** IP adresi engellenirken hata.

**Çözüm Adımları:**
1. IP adresinin geçerli formatında olduğundan emin olun
2. İşlemi tekrar deneyin

---

### 1008 - Loglar temizlenirken hata oluştu
**Hata Mesajı:** `Loglar temizlenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Hatalı giriş logları temizlenirken hata.

**Çözüm Adımları:**
1. Dosya yazma izinlerini kontrol edin
2. İşlemi tekrar deneyin

---

### 1009 - Güvenlik verileri alınamadı
**Hata Mesajı:** `Güvenlik verileri alınamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Güvenlik verileri (aktif oturumlar, login geçmişi, başarısız girişler) yüklenirken hata.

**Çözüm Adımları:**
1. `data/sessions.json` dosyasını kontrol edin
2. Dosya okuma izinlerini kontrol edin
3. JSON formatını kontrol edin

---

## 11. Rate Limiting Hataları (1100-1199)

### 1101 - Bu IP adresinden çok fazla istek gönderildi
**Hata Mesajı:** `Bu IP adresinden çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.`  
**HTTP Kodu:** 429  
**Hata Kodu:** `RATE_LIMIT_EXCEEDED`

**Açıklama:** Rate limit aşıldı (production'da 1000 istek/15 dakika).

**Olası Sebepler:**
- Çok fazla API isteği yapıldı
- Bot veya otomatik istekler
- Aynı IP'den çoklu kullanıcı

**Çözüm Adımları:**
1. Belirtilen süre kadar bekleyin (retryAfter saniye)
2. İstek sıklığını azaltın
3. Gerekirse farklı bir IP adresinden deneyin

---

### 1102 - Çok fazla giriş denemesi yapıldı
**Hata Mesajı:** `Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.`  
**HTTP Kodu:** 429  
**Hata Kodu:** `RATE_LIMIT_EXCEEDED`

**Açıklama:** Login rate limit aşıldı (50 deneme/15 dakika).

**Olası Sebepler:**
- Çok fazla başarısız giriş denemesi
- Brute force saldırısı
- Yanlış şifre ile çok deneme

**Çözüm Adımları:**
1. 15 dakika bekleyin
2. Şifrenizi kontrol edin
3. Gerekirse şifre sıfırlama işlemi yapın

---

## 12. Sistem ve Sunucu Hataları (1200-1299)

### 1201 - Sunucu hatası
**Hata Mesajı:** `Sunucu hatası`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Genel sunucu hatası (production modunda detaylı hata mesajı gösterilmez).

**Olası Sebepler:**
- Beklenmeyen kod hatası
- Veritabanı hatası
- Dosya sistemi hatası

**Çözüm Adımları:**
1. Development modunda çalıştırıp detaylı hata mesajını görün
2. Sunucu loglarını kontrol edin
3. Hatanın hangi endpoint'te oluştuğunu belirleyin
4. İlgili dosyayı kontrol edin

---

### 1202 - Kaynak bulunamadı
**Hata Mesajı:** `Kaynak bulunamadı`  
**HTTP Kodu:** 404  
**Hata Kodu:** `NOT_FOUND`

**Açıklama:** İstenen kaynak (endpoint, dosya, veri) bulunamadı.

**Çözüm Adımları:**
1. URL'yi kontrol edin
2. Endpoint'in mevcut olduğundan emin olun
3. Kaynağın silinmediğinden emin olun

---

### 1203 - Production modunda origin header gereklidir
**Hata Mesajı:** `Production modunda origin header gereklidir`  
**HTTP Kodu:** 400  
**Hata Kodu:** `CORS_ERROR`

**Açıklama:** Production modunda CORS kontrolü için origin header gerekiyor.

**Çözüm Adımları:**
1. İsteğe `Origin` header'ı ekleyin
2. Origin'in CORS ayarlarında izin verilenler arasında olduğundan emin olun

---

### 1204 - Geçersiz origin formatı
**Hata Mesajı:** `Geçersiz origin formatı`  
**HTTP Kodu:** 400  
**Hata Kodu:** `CORS_ERROR`

**Açıklama:** Origin header formatı geçersiz.

**Çözüm Adımları:**
1. Origin formatını kontrol edin: `http://domain.com` veya `https://domain.com`
2. Geçerli bir domain kullanın

---

### 1205 - CORS politikası ihlali
**Hata Mesajı:** `CORS politikası ihlali - Origin '<origin>' izin verilmemiş`  
**HTTP Kodu:** 400  
**Hata Kodu:** `CORS_ERROR`

**Açıklama:** İstek yapılan origin CORS ayarlarında izin verilmemiş.

**Çözüm Adımları:**
1. Origin'in `.env` dosyasındaki `CORS_ORIGIN` değişkeninde tanımlı olduğundan emin olun
2. Development modunda localhost otomatik izinlidir
3. Production'da origin'i CORS ayarlarına ekleyin

---

### 1206 - RSS feed oluşturulurken hata oluştu
**Hata Mesajı:** `RSS feed oluşturulurken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** RSS feed dosyası oluşturulurken hata.

**Olası Sebepler:**
- `rss.xml` dosyası yazma izni yok
- Blog yazıları yüklenemiyor
- XML formatı hatası

**Çözüm Adımları:**
1. `rss.xml` dosyası yazma izinlerini kontrol edin
2. Blog yazılarının yüklenebildiğinden emin olun
3. İşlemi tekrar deneyin

---

## 13. Log Yönetimi Hataları (1300-1399)

### 1301 - Konsol logları kaydedilemedi
**Hata Mesajı:** `Konsol logları kaydedilemedi`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Client-side console logları sunucuya kaydedilirken hata.

**Olası Sebepler:**
- `logs/` klasörü yazma izni yok
- Disk alanı dolmuş
- Log verisi formatı hatalı

**Çözüm Adımları:**
1. `logs/` klasörünün mevcut olduğundan emin olun
2. Klasör yazma izinlerini kontrol edin
3. Disk alanını kontrol edin
4. Log verisinin geçerli formatında olduğundan emin olun

---

### 1302 - Konsol logları okunamadı
**Hata Mesajı:** `Konsol logları okunamadı`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Konsol logları yüklenirken hata.

**Olası Sebepler:**
- `logs/` klasörü okuma izni yok
- Log dosyaları bozuk
- JSON formatı hatalı

**Çözüm Adımları:**
1. `logs/` klasörünün mevcut olduğundan emin olun
2. Klasör okuma izinlerini kontrol edin
3. Log dosyalarının geçerli JSON formatında olduğundan emin olun

---

### 1303 - Loglar temizlenirken hata oluştu
**Hata Mesajı:** `Loglar temizlenirken hata oluştu`  
**HTTP Kodu:** 500  
**Hata Kodu:** `INTERNAL_ERROR`

**Açıklama:** Eski log dosyaları temizlenirken hata.

**Olası Sebepler:**
- Dosya silme izni yok
- Dosya kilitli
- Disk hatası

**Çözüm Adımları:**
1. Dosya silme izinlerini kontrol edin
2. Dosyaların kilitli olmadığından emin olun
3. İşlemi tekrar deneyin

---

## 🔍 Hata Ayıklama İpuçları

### Genel Kontrol Listesi

1. **HTTP Status Kodunu Kontrol Edin**
   - 400: Client hatası (yanlış istek)
   - 401: Kimlik doğrulama hatası
   - 403: Yetkilendirme hatası
   - 404: Kaynak bulunamadı
   - 429: Rate limit aşıldı
   - 500: Sunucu hatası

2. **Hata Kodunu Kontrol Edin**
   - Hata koduna göre yukarıdaki rehberden detaylı bilgi alın
   - Hata kodunu loglarda arayın

3. **Sunucu Loglarını Kontrol Edin**
   - `logs/console-YYYY-MM-DD.json` dosyalarını kontrol edin
   - Server console çıktısını kontrol edin
   - Hata stack trace'ini inceleyin

4. **Dosya İzinlerini Kontrol Edin**
   - `data/` klasörü: Okuma/Yazma
   - `content/` klasörü: Okuma/Yazma
   - `images/` klasörü: Okuma/Yazma
   - `logs/` klasörü: Okuma/Yazma

5. **JSON Dosyalarını Kontrol Edin**
   - JSON formatının geçerli olduğundan emin olun
   - JSON validator kullanın
   - Yedekten geri yükleyin

6. **Environment Variables'ı Kontrol Edin**
   - `.env` dosyasının mevcut olduğundan emin olun
   - Gerekli değişkenlerin tanımlı olduğundan emin olun
   - `JWT_SECRET` en az 32 karakter olmalı

---

## 📞 Destek

Hata devam ederse:

1. Hata kodunu not edin
2. Hata mesajını kopyalayın
3. Sunucu loglarını toplayın
4. Hatanın hangi işlem sırasında oluştuğunu belirleyin
5. İlgili dosyaları kontrol edin

---

**Son Güncelleme:** 2025-11-06  
**Dokümantasyon Versiyonu:** 1.0

