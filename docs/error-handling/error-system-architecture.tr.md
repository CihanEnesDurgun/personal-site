# 🏗️ Profesyonel Hata Yönetimi ve Loglama Mimarisi (RFC 7807)

Bu belge, projedeki hata işleme (error handling) ve sistem günlüğü (logging) mekanizmalarının nasıl çalıştığını, hangi standartlara dayandığını ve sisteme yeni özellikler eklerken bu altyapının nasıl kullanılması gerektiğini açıklar. Bu altyapı, endüstri standardı olan **RFC 7807 (Problem Details for HTTP APIs)** kurallarına göre inşa edilmiştir.

---

## 🛑 Neden Yeni Bir Sisteme Geçtik? (Eski Sistemin Sorunları)

Önceki yapıda Hata Yönetimi şu sorunlara sahipti:
- **Dağınık Yanıtlar:** Her API uç noktası (`endpoint`) kendi hatasını manuel olarak yazıyordu (`res.status(500).json({error: "Bir hata oldu"})`). Bu da yüzlerce farklı ve tutarsız API yanıtına sebep oluyordu.
- **Konsol Kirliliği:** Hatalar sadece `console.log()` veya `console.error()` ile terminale basılıyordu. Gerçek bir loglama dosyası, hata seviyesi (WARN, INFO, FATAL) yoktu.
- **Takip Edilemezlik:** Ön yüz (Frontend) bir hata aldığında (örneğin 400 Bad Request), hatanın tam olarak içerideki hangi fonksiyondan veya hangi validasyon kuralından koptuğunu metin okuyarak tahmin etmeye çalışıyordu.

---

## ✨ Yeni Sistemin Temel Taşları

Sistem 4 ana bileşenden (modülden) oluşur:

### 1. `lib/logger.js` (Merkezi Loglama Motoru)
Basit `console.log` devri kapandı. Artık özel bir **Logger** sınıfımız var.
- Geliştirme (Development) ortamında terminale renkli ve etiketli okunaklı loglar basar.
- Üretim (Production) ortamında bu logları JSON formatına çevirerek `logs/error.log` klasörüne yazar.
- Beş farklı ciddiyet seviyesi destekler: `INFO`, `DEBUG`, `WARN`, `ERROR` ve `FATAL`.

📝 **Nasıl Kullanılır?:**
```javascript
const Logger = require('./lib/logger');

Logger.info('Sistem başarıyla başlatıldı.');
Logger.warn('Şüpheli bir IP giriş yapmayı denedi.', { ip: req.ip });
Logger.error('Veritabanına bağlanılamadı!', err); // 'err' objesi verilirse tam hatayı loglar.
```

### 2. `lib/errorRegistry.js` (Hata Sözlüğü / Kayıt Defteri)
Sistemde oluşabilecek tüm hatalar artık bu tek dosyada önceden tanımlıdır. Hatalar artık anlamsız sayılar `(örn: Status 500)` değil, **alfanümerik etiketlerdir** `(örn: AUTH-1002)`. Her etiketin kendi açıklayıcı dili vardır.

*Örnek Registry Kaydı:*
```javascript
  'AUTH-1002': {
    type: 'AUTH-1002',       // Eşsiz Kod
    status: 401,             // HTTP Durum Kodu (Yetkisiz)
    title: 'Token Expired',  // Bilgisayarlar için kısa başlık
    detail: 'Oturum süresi dolmuş veya geçersiz token.' // Kullanıcılar için detay
  }
```

### 3. `lib/errorHandler.js` (Küresel Yakalayıcı ve AppError Sınıfı)
Express.js'in can damarı olan global hata yakalama köprüsüdür.
- **`AppError` Sınıfı:** API uç noktalarında hata fırlatmamızı sağlar. Sözlükteki kodlardan birini alıp objeye çevirir.
- **`globalErrorHandler`:** Express rotalarında çöken veya bizim fırlattığımız `AppError`'ları havada yakalar. Yakaladıktan sonra **RFC 7807** standardında, `application/problem+json` formatında mükemmel bir JSON paketi hazırlayıp Frontend'e fırlatır ve arka planda `Logger` ile dosyaya işler.

📝 **Doğru Kullanım (Route İçinde):**
```javascript
app.post('/api/posts', async (req, res, next) => { // 'next' parametresi zorunludur!
  try {
     if (!req.body.title) {
        // Hata fırlatma! Doğrudan sözlükten VAL-2001 (Eksik Alan) kodunu çağır ve 'next' ile aktar:
        return next(new AppError('VAL-2001', 400, 'Başlık alanı zorunludur.')); 
     }
  } catch(error) { // Beklenmedik çökme
     // Orijinal error nesnesini 'error' olarak beslersen, çağrı ağacını (stack trace) da kopyalar.
     next(new AppError('SYS-3001', error, 'Post oluşturulamadı')); 
  }
});
```

### 4. `admin/js/error-code-mapper.js` (Frontend Çevirmeni)
Backend çok temiz bir standart (RFC 7807 Problem Details) JSON gönderiyor. Fakat Admin Panelinin bunu işleyip ekrana uyarı balonu (Toast) çıkarması lazım.

- Frontend API Service, backend'den gelen JSON içerisindeki `code: "AUTH-1001"` veya `type: "VAL-2001"` verisini `error-code-mapper.js`'ye verir.
- Mapper bu kodların ne anlama geldiğini veya daha okunaklı eski sistem diline nasıl çevrileceğini (legacy desteği) bilir.
- Böylece UI `AUTH-1002` aldığında direkt "Oturumunuz doldu, giriş ekranına yönlendiriliyorsunuz" kararı verebilir.

---

## 📡 RFC 7807 - Bir Hata Yanıtı Nasıl Görünür?

Eğer müşteri (Frontend), bulunamayan bir blog yazısı çekmeye çalışırsa sunucu klasik bir `{error:"Bulunamadı"}` yerine şu muazzam RESTFUL paketi gönderir:

**HTTP Status: 404 Not Found**
**Content-Type: application/problem+json**
```json
{
  "type": "https://cihanenesdurgun.com/docs/errors#RES-6001",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "Blog yazısı bulunamadı",
  "instance": "/api/posts/olmayan-bir-slug",
  "requestId": "system",
  "code": "RES-6001"
}
```
* **Status:** Postman, Tarayıcı veya Network panelleri için geçerli HTTP kodu.
* **Code:** Ön yüzün (UI) programatik olarak hangi toast uyarısını açacağını bulması için harf-rakam anahtarı (RES-6001).
* **Detail:** Direkt Frontend ekranına basılabilecek Türkçe veya yerelleştirilmiş, net detay mesajı.
* **Instance:** Hatanın tam olarak hangi adrese atılan istekte yaşandığı. Gece yarısı hata logu okurken hayat kurtarır.

---

## 👨‍💻 Gelecekte Sisteme Yeni Hata Eklemek 

1. `lib/errorRegistry.js` dosyasını aç.
2. Mevcut kategorilerden birine (örn: Dosya hataları için `FILE-5000` serisi) yeni bir satır ekle:
   `'FILE-5004': { type: 'FILE-5004', status: 415, title: 'Unsupported Media', detail: 'Sadece PDF yükleyebilirsiniz.' }`
3. Backend kodunda `server.js` veya diğer rotalarda o anı yakaladığında tek satır çağır:
   `return next(new AppError('FILE-5004'));`
4. Eğer Frontend'in bu duruma özel bir hareketi olacaksa (örneğin PDF yükleme uyarı kutusunu sallamak), sadece `admin.js` içerisinde `if (error.code === 'FILE-5004')` tetikleyicisi yazman yeterlidir!

Bu sistem sayesinde sistemin her zaman kurumsal, öngörülebilir ve kontrol edilebilir olarak kalacaktır.
