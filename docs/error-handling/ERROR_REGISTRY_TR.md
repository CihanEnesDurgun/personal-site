# 🚨 Hata Kayıtları (RFC 7807)

Bu doküman, kişisel site sistemindeki tüm uygulama hataları için **Tek Gerçek Kaynak (Single Source of Truth)** niteliğindedir. İşbu doküman [RFC 7807 (Problem Details for HTTP APIs)](https://datatracker.ietf.org/doc/html/rfc7807) standardına uygun olarak hazırlanmıştır.

## 📌 Sınıflandırma Yapısı (Taksonomi)

Hatalar, bir alfanumerik ön ek (prefix) ve onu takip eden 4 haneli bir sayı ile kategorize edilir:

- **`AUTH-1000`**: Kimlik Doğrulama & Yetkilendirme (Giriş, token'lar, izinler)
- **`VAL-2000`**: Doğrulama & Geçersiz İstekler (Eksik alanlar, hatalı JSON)
- **`SYS-3000`**: Sistem & Sunucu (Dahili çökmeler, DB okuma/yazma sorunları)
- **`SEC-4000`**: Güvenlik & Hız Sınırı (CORS, Kaba kuvvet (Brute-force) koruması)
- **`FILE-5000`**: Dosya İşlemleri (Yükleme sınırları, geçersiz uzantılar)
- **`RES-6000`**: Kaynak İşlemleri (404 Bulunamadı, 409 Çakışmalar)

---

## 🔐 1. Kimlik Doğrulama & Yetkilendirme (AUTH-1000)
| Kod | HTTP Durumu | Başlık | Açıklama / Detay |
| :--- | :--- | :--- | :--- |
| **`AUTH-1001`** | 401 | Yetkisiz Erişim | Bu kaynağa erişmek için kimlik doğrulaması gereklidir. |
| **`AUTH-1002`** | 401 | Token Süresi Doldu | Sağlanan kimlik doğrulama token'ının süresi dolmuş. |
| **`AUTH-1003`** | 401 | Geçersiz Token | Sağlanan kimlik doğrulama token'ı geçersiz veya hatalı formatta. |
| **`AUTH-1004`** | 401 | Geçersiz Kimlik Bilgileri | Sağlanan kullanıcı adı veya şifre yanlış. |
| **`AUTH-1005`** | 403 | Yasaklandı | Bu eylemi gerçekleştirmek için izniniz yok. |
| **`AUTH-1006`** | 401 | Oturum Süresi Doldu veya Geçersiz | Oturumunuzun süresi doldu veya artık geçerli değil. |

## ✍️ 2. Doğrulama & Geçersiz İstekler (VAL-2000)
| Kod | HTTP Durumu | Başlık | Açıklama / Detay |
| :--- | :--- | :--- | :--- |
| **`VAL-2001`** | 400 | Doğrulama Başarısız | Bir veya daha fazla alan doğrulama adımından geçemedi. Lütfen sağlanan verileri kontrol edin. |
| **`VAL-2002`** | 400 | Eksik Zorunlu Alan | İstekte zorunlu tutulan bir alan eksik. |
| **`VAL-2003`** | 400 | Hatalı İstek | İstek yükü (payload) hatalı formatta ya da çözümlenemiyor. |

## 🖥️ 3. Sistem & Sunucu Hataları (SYS-3000)
| Kod | HTTP Durumu | Başlık | Açıklama / Detay |
| :--- | :--- | :--- | :--- |
| **`SYS-3001`** | 500 | Dahili Sunucu Hatası | Sunucuda beklenmeyen bir hata oluştu. |
| **`SYS-3002`** | 500 | Veri Okuma Hatası | Veri depolama sisteminden (veritabanı vb.) veri okunamadı. |
| **`SYS-3003`** | 500 | Veri Yazma Hatası | Veri depolama sistemine (veritabanı vb.) veri yazılamadı. |

## 🛡️ 4. Güvenlik & Hız Sınırı (SEC-4000)
| Kod | HTTP Status | Başlık | Açıklama / Detay |
| :--- | :--- | :--- | :--- |
| **`SEC-4001`** | 429 | Hız Sınırı Aşıldı | Bu IP adresinden çok fazla istek yapıldı. Lütfen bekleyin. |
| **`SEC-4002`** | 403 | CORS Politika İhlali | Bu istek Kaynaklar Arası Paylaşım (CORS) politikasını ihlal ediyor. |

## 📁 5. Dosya İşlemleri (FILE-5000)
| Kod | HTTP Durumu | Başlık | Açıklama / Detay |
| :--- | :--- | :--- | :--- |
| **`FILE-5001`** | 413 | Dosya Çok Büyük | Yüklenen dosya boyutu izin verilen maksimum sınırı aşıyor. |
| **`FILE-5002`** | 415 | Geçersiz Dosya Türü | Yüklenen dosyanın türüne veya uzantısına izin verilmiyor. |
| **`FILE-5003`** | 400 | Dosya Yüklenmedi | Yükleme isteğinde herhangi bir dosya bulunamadı. |

## 📦 6. Kaynak İşlemleri (RES-6000)
| Kod | HTTP Durumu | Başlık | Açıklama / Detay |
| :--- | :--- | :--- | :--- |
| **`RES-6001`** | 404 | Kaynak Bulunamadı | İstediğiniz kaynak bulunamadı. |
| **`RES-6002`** | 409 | Kaynak Çakışması | Zaten var olan bir kaynağı yeniden oluşturmaya çalışmak gibi bir çakışma meydana geldi. |

---

## 🛠️ Geliştirici Kılavuzu

### Hata Fırlatma (Backend - Node.js)
Backend tarafında standart bir hata fırlatmak için:
```javascript
const { AppError } = require('./lib/errorHandler');

// Örnek: Eksik zorunlu alan
if (!title) {
    throw new AppError('VAL-2002', null, 'Başlık (title) alanı istek yükünde (payload) bulunamadı.');
}
```

### Yanıt Formatı (Problem Details JSON Formatı)
Geliştirilen Evrensel Hata Yakalayıcı (Global Error Handler), fırlatılan `AppError` sınıflarını yakalar ve otomatik olarak HTTP yanıtını `application/problem+json` formatında döndürür:

```json
{
  "type": "https://cihanenesdurgun.com/docs/errors#VAL-2002",
  "title": "Missing Required Field",
  "status": 400,
  "detail": "A required field is missing from the request. Details: Başlık (title) alanı istek yükünde (payload) bulunamadı.",
  "instance": "/api/admin/blog",
  "requestId": "2b6db9a3f80c657a82b",
  "code": "VAL-2002"
}
```
*Not: En sondaki `code` alanı, RFC 7807 standardına eklenmiş özel bir uzantıdır. Frontend tarafında çalışan `error-code-mapper.js` kütüphanesinin hataları kolayca ayrıştırabilmesi için eklenmiştir.*
