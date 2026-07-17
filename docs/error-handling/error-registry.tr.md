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

### Sistem Bilgi Kayıtları (System Info Logs)
- **`ENV-1000`**: Çevresel Değişkenler & Konfigürasyon (Değişken kurulumları)
- **`SYS-2000`**: Sistem Başlatma & İşlemleri (Temizlik, doğrulamalar, periyodik işler)
- **`SYS-8000`**: Sunucu Döngüsü (Sunucunun ayağa kalkması ve modülleri)

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

## ℹ️ 7. Sistem Bilgi Kayıtları (INFO/WARN)
Bu kodlar, sistem günlüklerinde (log) tutarlı filtreleme sağlamak amacıyla kullanılır. Herhangi bir HTTP hatası fırlatmazlar.

### 🌐 Çevresel Değişkenler & Yapılandırma (ENV-1000)
| Kod | Seviye | Mesaj (Türkçe Log) |
| :--- | :--- | :--- |
| **`ENV-1000`** | INFO | Cevresel degiskenler basariyla yuklendi |
| **`ENV-1001`** | INFO | JWT_SECRET: AYARLANDI |
| **`ENV-1002`** | INFO | BCRYPT_SALT_ROUNDS yuklendi |
| **`ENV-1003`** | INFO | NODE_ENV durumu belirlendi |
| **`ENV-1004`** | WARN | Gecersiz BCRYPT_SALT_ROUNDS degeri |

### ⚙️ Sistem Başlatma & İşlemleri (SYS-2000)
| Kod | Seviye | Mesaj (Türkçe Log) |
| :--- | :--- | :--- |
| **`SYS-2000`** | INFO | Oturum Yoneticisi (Session Manager) basariyla baslatildi |
| **`SYS-2001`** | ERROR| Oturum Yoneticisi (Session Manager) baslatilamadi |
| **`SYS-2003`** | INFO | Log Temizleme Yoneticisi (Cleanup Manager) basariyla baslatildi |
| **`SYS-2005`** | INFO | Istatistik veri dogrulamasi basariyla tamamlandi |
| **`SYS-2006`** | INFO | RSS akisi basariyla guncellendi |
| **`SYS-2008`** | INFO | Istatistik verileri dogrulaniyor... |
| **`SYS-2009`** | INFO | Oturum (session) verileri temizleniyor... |
| **`SYS-2012`** | INFO | Yazar tarafindan silinmis ancak istatistigi kalmis (yoksun/orphaned) yazi datalari bulundu |
| **`SYS-2013`** | INFO | Istatistik (stats) kaydi bulunmayan yeni yazilar tespit edildi |
| **`SYS-2014`** | INFO | Site haritasi (sitemap) basariyla guncellendi |
| **`SYS-2015`** | INFO | Analitik veriler (tum zamanlar / gun bazinda) istendi |
| **`SYS-2016`** | INFO | Istatistik verileri basariyla temizlendi |

### 🔐 Kimlik Doğrulama Kayıtları (AUTH-8000)
| Kod | Seviye | Mesaj (Türkçe Log) |
| :--- | :--- | :--- |
| **`AUTH-8000`** | INFO | Giris istegi alindi |
| **`AUTH-8001`** | INFO | Basarili giris |
| **`AUTH-8002`** | INFO | Kullanici basariyla cikis yapti |
| **`AUTH-8003`** | WARN | Erisim token'ı gereklidir |
| **`AUTH-8004`** | WARN | Gecersiz veya suresi dolmus token |
| **`AUTH-8005`** | WARN | Oturum dogrulama basarisiz, JWT ile devam ediliyor |
| **`AUTH-8006`** | ERROR | Kimlik dogrulama hatasi |
| **`AUTH-8007`** | WARN | Hatali giris denemesi |

### 📁 Dosya İşlem Kayıtları (FILE-8000)
| Kod | Seviye | Mesaj (Türkçe Log) |
| :--- | :--- | :--- |
| **`FILE-8000`** | INFO | Dosya basariyla hedef klasore tasindi |
| **`FILE-8001`** | INFO | Hedef klasore dosya yuklemesi basarili |

### 🚀 Sunucu Döngüsü (SYS-8000)
| Kod | Seviye | Mesaj (Türkçe Log) |
| :--- | :--- | :--- |
| **`SYS-8000`** | INFO | Personal Site - Admin API Sunucusu portunda calisiyor |
| **`SYS-8001`** | INFO | Guvenlik ve Oturum Yonetim Sistemi (Session Management) aktif |
| **`SYS-8002`** | INFO | Istatistik Veri Dogrulama ve Temizleme Sistemi aktif |
| **`SYS-8003`** | INFO | Otomatik Oturum Temizleme Sistemi aktif |

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
