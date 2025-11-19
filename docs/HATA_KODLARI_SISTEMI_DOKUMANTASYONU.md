# 🔧 Hata Kodları Sistemi - Teknik Dokümantasyon

**Versiyon:** 1.0  
**Tarih:** 2025-11-06  
**Proje:** Personal Site v2.0.4

## 📋 Genel Bakış

Bu dokümantasyon, sistemdeki hata kodları sisteminin nasıl çalıştığını, hangi dosyaların güncellendiğini ve nasıl kullanılacağını açıklar.

---

## 🎯 Sistem Mimarisi

### 1. Backend (server.js)

Backend'de hata yönetimi `createErrorResponse` fonksiyonu ile standardize edilmiştir:

```javascript
const createErrorResponse = (statusCode, message, details = null, code = null, context = {})
```

**Özellikler:**
- Tüm hata response'ları standart formatta döner
- `code` alanı ile hata kategorisi belirtilir (örn: `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`)
- `requestId` ile her istek takip edilebilir
- `help` alanı ile kullanıcıya yardımcı bilgi verilir

**Kullanım Örneği:**
```javascript
return res.status(400).json(createErrorResponse(
  400, 
  'Başlık en az 3 karakter olmalıdır', 
  null, 
  'VALIDATION_ERROR', 
  context
));
```

### 2. Frontend - Error Code Mapper (admin/js/error-code-mapper.js)

Bu modül, backend'den gelen string hata kodlarını (örn: `VALIDATION_ERROR`) sayısal kodlara (örn: `201`) çevirir.

**İki ana mapping:**
- `ERROR_CODE_MAP`: String kod → Sayısal kod (örn: `'VALIDATION_ERROR': 201`)
- `ERROR_MESSAGE_TO_CODE`: Hata mesajı → Sayısal kod (örn: `'Başlık en az 3 karakter olmalıdır': 203`)

**Fonksiyonlar:**
- `getErrorCode(error)`: Error objesi veya mesajından sayısal kod çıkarır
- `formatErrorMessage(message, code)`: Mesajı hata kodu ile formatlar
- `logErrorWithCode(error, context)`: Console'a detaylı hata logu yazar

### 3. Frontend - API Service (admin/js/admin-api-service.js & admin/admin.js)

API isteklerinde hata yakalandığında:
1. Response'dan `code`, `statusCode`, `details` gibi bilgiler çıkarılır
2. Error objesine `responseData` olarak eklenir
3. Frontend'de hata gösterilirken bu bilgiler kullanılır

**Örnek:**
```javascript
if (!response.ok) {
  const apiError = new Error(data.error || 'API isteği başarısız');
  if (data.code) apiError.code = data.code;
  apiError.responseData = data;
  throw apiError;
}
```

### 4. Frontend - Notification Sistemi (admin/admin.js)

`showNotification` fonksiyonu güncellenmiştir:

```javascript
showNotification(message, type = 'info', errorCode = null, error = null)
```

**Özellikler:**
- Hata kodunu otomatik olarak tespit eder
- Hata mesajının yanına `[Hata Kodu: XXX]` ekler
- Console'a detaylı log yazar

**Kullanım:**
```javascript
catch (error) {
  this.showNotification(`İşlem başarısız: ${error.message}`, 'error', null, error);
}
```

---

## 📁 Güncellenen Dosyalar

### Backend
- ✅ `server.js`: Tüm hata mesajları Türkçe'ye çevrildi, `createErrorResponse` kullanımı yaygınlaştırıldı

### Frontend - Admin Panel
- ✅ `admin/js/error-code-mapper.js`: Yeni oluşturuldu - Hata kodları mapping sistemi
- ✅ `admin/js/admin-api-service.js`: Hata yakalama ve kod ekleme güncellendi
- ✅ `admin/admin.js`: 
  - API service hata yakalama güncellendi
  - `showNotification` fonksiyonu hata kodları desteği eklendi
  - Tüm catch blokları hata kodlarını gösterecek şekilde güncellendi
  - Upload fonksiyonları hata kodları desteği eklendi
- ✅ `admin/login.js`: `showError` fonksiyonu hata kodları desteği eklendi

### HTML Dosyaları
- ✅ `admin/index.html`: `error-code-mapper.js` script'i eklendi
- ✅ `admin/login.html`: `error-code-mapper.js` script'i eklendi

### Dokümantasyon
- ✅ `docs/HATA_KODLARI_REHBERI.md`: Tüm hata kodları, açıklamaları ve çözümleri içeren rehber
- ✅ `docs/HATA_KODLARI_SISTEMI_DOKUMANTASYONU.md`: Bu dosya - Teknik dokümantasyon

---

## 🔄 Hata Akışı

### Senaryo 1: Backend'den Gelen Hata

```
1. Backend (server.js)
   ↓ createErrorResponse(400, 'Başlık en az 3 karakter olmalıdır', null, 'VALIDATION_ERROR')
   
2. Frontend API Service
   ↓ Error objesine code eklenir: error.code = 'VALIDATION_ERROR'
   
3. Error Code Mapper
   ↓ getErrorCode(error) → 201 (VALIDATION_ERROR mapping)
   
4. Notification
   ↓ showNotification(message, 'error', null, error)
   → "Başlık en az 3 karakter olmalıdır [Hata Kodu: 203]"
```

### Senaryo 2: Mesajdan Kod Çıkarma

```
1. Frontend'de hata mesajı: "Dosya çok büyük"
   
2. Error Code Mapper
   ↓ ERROR_MESSAGE_TO_CODE['Dosya çok büyük'] → 301
   
3. Notification
   → "Dosya çok büyük [Hata Kodu: 301]"
```

---

## 🎨 Hata Kodu Kategorileri

| Kategori | Kod Aralığı | Örnek |
|----------|-------------|-------|
| Kimlik Doğrulama | 100-199 | 101: Erişim token'ı gereklidir |
| Doğrulama | 200-299 | 203: Başlık en az 3 karakter olmalıdır |
| Dosya Yükleme | 300-399 | 301: Dosya çok büyük |
| Blog Yazıları | 400-499 | 402: Blog yazısı bulunamadı |
| Yorumlar | 500-599 | 501: Yorumlar alınamadı |
| Galeri | 600-699 | 601: Silinen görseller alınırken hata oluştu |
| İstatistikler | 700-799 | 701: İstatistikler yüklenirken hata oluştu |
| Site Yapılandırma | 800-899 | 801: Site yapılandırması okunamadı |
| Tema | 900-999 | 901: Tema ayarları kaydedilirken hata oluştu |
| Güvenlik | 1000-1099 | 1001: Oturum bilgisi alınamadı |
| Rate Limiting | 1100-1199 | 1101: Çok fazla istek |
| Sistem | 1200-1299 | 1201: Sunucu hatası |
| Loglar | 1300-1399 | 1301: Konsol logları kaydedilemedi |

---

## 🛠️ Yeni Hata Kodu Ekleme

### 1. Backend'de Hata Kodu Tanımla

```javascript
// server.js
return res.status(400).json(createErrorResponse(
  400,
  'Yeni hata mesajı',
  null,
  'YENI_HATA_KODU',  // String kod
  context
));
```

### 2. Error Code Mapper'a Ekle

```javascript
// admin/js/error-code-mapper.js

// String kod → Sayısal kod
const ERROR_CODE_MAP = {
  'YENI_HATA_KODU': 250,  // Uygun kategori aralığında
};

// Mesaj → Sayısal kod (opsiyonel)
const ERROR_MESSAGE_TO_CODE = {
  'Yeni hata mesajı': 250,
};
```

### 3. Dokümantasyona Ekle

`docs/HATA_KODLARI_REHBERI.md` dosyasına yeni hata kodunu ekle:

```markdown
### 250 - Yeni hata mesajı
**Hata Mesajı:** `Yeni hata mesajı`  
**HTTP Kodu:** 400  
**Hata Kodu:** `YENI_HATA_KODU`

**Açıklama:** ...

**Çözüm Adımları:**
1. ...
```

---

## 🔍 Debug İpuçları

### Console'da Hata Kodu Görme

Hata oluştuğunda console'da şu şekilde görünür:

```
🚨 Hata Kodu: 203
📋 Mesaj: Başlık en az 3 karakter olmalıdır
📖 Detaylar için: docs/HATA_KODLARI_REHBERI.md dosyasında "203" kodunu arayın
```

### Hata Kodunu Manuel Kontrol

Browser console'da:

```javascript
// Error objesinden kod çıkar
const error = new Error('Başlık en az 3 karakter olmalıdır');
const code = window.getErrorCode(error);
console.log(code); // 203

// Mapping'leri kontrol et
console.log(window.ERROR_MESSAGE_TO_CODE);
console.log(window.ERROR_CODE_MAP);
```

---

## ⚠️ Önemli Notlar

1. **Hata Kodları Tutarlılığı**: Backend'de gönderilen string kodlar ile frontend'deki mapping'lerin eşleşmesi gerekir.

2. **Mesaj Eşleştirme**: Eğer string kod bulunamazsa, mesajdan kod çıkarma denenir. Bu yüzden mesajların tutarlı olması önemlidir.

3. **Yeni Hata Mesajları**: Yeni bir hata mesajı eklendiğinde, `ERROR_MESSAGE_TO_CODE` mapping'ine de eklenmelidir.

4. **Public Sayfalar**: Şu anda sadece admin panelinde hata kodları gösteriliyor. Public sayfalarda (post.js, blog.js) henüz eklenmemiştir (opsiyonel).

---

## 📊 İstatistikler

- **Toplam Hata Kodu Kategorisi**: 13
- **Toplam Hata Kodu**: ~105
- **Güncellenen Dosya Sayısı**: 8
- **Yeni Dosya Sayısı**: 2

---

## 🚀 Gelecek Geliştirmeler

1. **Public Sayfalarda Hata Kodları**: post.js ve blog.js'de hata kodları gösterimi
2. **Hata İstatistikleri**: Hangi hataların ne sıklıkla oluştuğunu takip etme
3. **Otomatik Hata Raporlama**: Kritik hataların otomatik olarak loglanması
4. **Hata Kodları API**: Frontend'den hata kodları ve çözümlerini çekme endpoint'i

---

**Son Güncelleme:** 2025-11-06  
**Versiyon:** 1.0

