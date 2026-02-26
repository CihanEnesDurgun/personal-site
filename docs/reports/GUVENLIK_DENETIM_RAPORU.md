# 🛡️ Sistem Güvenlik Mimarisi ve Altyapı Raporu

**Tarih:** Şubat 2026  
**Versiyon Uyum:** v0.1.6.anti  
**Kapsam:** Ağ, Veri, İstemci ve Uygulama Güvenliği

---

## 1. Yönetici Özeti (Executive Summary)

Sistemimiz, modern siber tehditlere karşı çok katmanlı bir güvenlik yaklaşımı (**Defense in Depth**) ile tasarlanmış ve OWASP prensipleriyle sıkılaştırılmıştır. Bu rapor, uygulamanın temel güvenlik bileşenlerini ve alınan proaktif koruma önlemlerini özetlemektedir. 

> [!CAUTION]  
> Kötü niyetli aktörlerin istismar edebileceği içsel algoritma detayları, secret seed'leri ve sunucu içi mutlak path'ler (dizin yolları) sistem güvenliği politikaları gereği bu rapora yansıtılmamış, gizli tutulmuştur.

---

## 2. Ağ ve Erişim Güvenliği (Network Security)

- 🚦 **Gelişmiş İstek Sınırlandırma (DDoS ve Spam Koruması):** Uygulama geneline yayılan kademeli hız sınırlama (`express-rate-limit`) politikaları ile *Distributed Denial of Service (DDoS)* ve *Brute-Force* saldırılarına karşı koruma sağlanmaktadır. Kimlik doğrulama, yorum gönderimi gibi maliyetli işlemler için çok daha dar ve katı sınırlar belirlenmiştir.
- 🚷 **Dinamik IP Engelleme:** Sık başarısız login girişimlerinde bulunan zararlı aktivite merkezli IP adresleri, memory üzerinde geçici ban yiyerek (`Rate Limiter Window`) devre dışı kalırlar. 
- 🔒 **Yetkisiz Erişim (Path Traversal) Koruması:** Sistem konfigürasyon (`/data/`, `.env`) dizinlerine veya Express üzerinden root ötesi dizinlere erişim (Örn: `../../etc/passwd`) engellenmiştir. Statik asset'ler izole edilmiş `/images/` klasöründen okunur.

---

## 3. Veri ve Kimlik Doğrulama Katmanı (Data & Auth Layer)

- 🔑 **Modern Oturum Yönetimi (JWT + Session Guard):** Stateful bir database olmamasına rağmen, Node.js memory üzerinden veya fiziki `sessions.json` üzerinden token'ların ömrü takip edilmektedir. Token ele geçirilse bile session revoke edilebilme (iptal edilme) özelliği getirilmiştir.
- 🛡️ **Parola Hashing (Bcrypt):** Şifreler düz metin olarak değil, `bcryptjs` paketi kullanılarak en az **12 round** salt mekanizması ile tek yönlü (irreversible) olarak hash'lenip saklanır. Rainbow table tarzı çözme atakları teorik olarak engellenir.
- 📦 **Bütünlük (HMAC) / Opsiyonel:** Sistem CI/CD webhook'larıyla harici dünyadan tetikleneceği senaryolarda `X-Hub-Signature-256` doğrulaması arayacak şekilde mimari planlanmıştır.

---

## 4. Uygulama ve Girdi Güvenliği (App & Input Protection)

> [!IMPORTANT]  
> Siber güvenlikteki en yaygın açıkların %90'ı kullanıcıdan alınan input'ların güvenilmesinden (Never Trust User Input) kaynaklanır.

- 🧼 **XSS Koruması (Girdi Temizleme):** Front-end ve Back-end hatlarında, `.innerHTML` render edilen blog içerikleri potansiyel tehlike arz edebileceğinden, inputlar `DOMPurify` / `sanitize-html` standartlarına uygun şekilde AST tabanlı temizlemeye tabi tutulur.
- 🖼️ **Güvenli Dosya (Medya) Yükleme Kontrolü:** İstemcilerden sunucuya gelen Multer FormData içerikleri (resimler) yalnızca dosya isminin `-*.jpg` olmasından ziyade, ilk byte imzalarına (**Magic Bytes**) bakılarak Buffer seviyesinde kontrol edilir. İçerisinde PHP veya Perl kodu barındıran sahte PNG'ler engellenir.
- ⚖️ **Payload Body Limits:** Bellek taşması (*Memory Exhaustion*) veya *Slowloris* tipi saldırıları engellemek adına JSON Request / Form veri boyutları Node.js katmanında MB limitiyle sınırlandırılmıştır.

---

## 5. Çevresel Güvenlik ve Hataların Maskelenmesi

- 🤐 **Stack Trace Masking:** Sistem hata (Exception/HTTP 500) verdiğinde, `error.stack` detaylı sunucu hatası (satır numaraları vb.) Response olarak döndürülmez. Üretim ortamında (`NODE_ENV=production`) sadece genel bir "Server Error" mesajı döndürülerek mimari haritası gizlenir.
- 🧪 **İzole Geliştirme Ortamı:** Geliştiricilerin debug logları sadece `NODE_ENV=development` modunda aktiftir.

---

## 6. Özet Sonuç

Sistem yapı taşları; Node.js v14+ mimarisi, Express middleware savunmaları ve dosya tabanlı kısıtlamalar birleştirilerek, veri sızıntılarına (data-leak) ve istismarlara (exploit) karşı **sıfır tolerans** odaklı inşa edilmiştir. Mevcut haliyle bir dış denetime (Penetration Test) hazır, Enterprise-grade seviyeye yakın bir altyapı sergilemektedir.
