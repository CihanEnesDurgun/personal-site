# 📘 Proje Özeti (Project Brief)

> [!NOTE]  
> Bu doküman, **DurgunTech Kişisel Blog ve Yönetim Paneli**'nin mimarisini, kapsamını ve teknik yığınını makro seviyede ele alarak yeni geliştiriciler ve paydaşlar için bir referans kaynağı olma amacı taşımaktadır.

---

## 1. Proje Genel Bakış

**🚀 Proje Adı ve Konsepti:** DurgunTech Personal Site & Blog Engine  
**🎯 Temel Amaç:** Tamamen performansa ve bağımsızlığa (vendor lock-in olmadan) odaklanmış bir yayın (publishing) altyapısı kurarak içerik üreticisinin dijital ayak izini yönetmesini sağlamak.  
**👥 Hedef Kitle:** Yazılım geliştiricileri, içerik üreticileri ve bağımsız teknoloji yazarları.  

---

## 2. Proje Kapsamı ve Sınırları

### 🌟 Temel Mimariler (Core Features)
- **Modüler Blog Yönetimi:** Markdown tabanlı, sürükle-bırak destekli canlı önizlemeli (live-preview) blog yazma deneyimi.
- **Admin Control Center:** Token ve server-side session tabanlı, tam izolasyonlu yönetim arayüzü.
- **Dinamik Varlık (Asset) Yönetimi:** Güvenli dosya doğrulama (Magic Bytes) süreçlerinden geçerek resim/dosya yükleme ve sanal klasörleme (Gallery).
- **Esnek Tema Sistemi:** CSS Variable entegrasyonuyla anında aktif olan Dark/Light tema desteği ve palet özelleştirme imkanı.
- **Dahili Analitikler (In-house Analytics):** Harici araçlara (Google Analytics vb.) mecbur bırakmayan temel blog istatistik ve görünüm takip sistemi.

### 🛑 Kapsam Dışı (Out of Scope)
- **Complex Multi-Tenancy:** Şu an için sadece **Single-Admin** (tek mülk sahibi) modeline dayanmaktadır.
- **İleri Seviye E-Ticaret:** E-ticaret entegrasyonu içermemektedir.

---

## 3. Teknik Mimari (Tech Stack)

Sistem, harici bağımlılıkları minimize ederek (Zero-Dependency UI) hızı maksimize edecek şekilde "Monolithic JSON" mimarisinde seçilmiştir.

> [!IMPORTANT]  
> Projede bilerek klasik bir RDBMS (MySQL, PostgreSQL) kullanılmamış, taşınabilirliği en üst seviyede tutmak için **JSON tabanlı dosya izleme** stratejisi (fs-extra) izlenmiştir.

### 🛠️ Kullanılan Teknolojiler
- **Frontend Katmanı:** Semantik HTML5, Modern CSS3 (CSS Variables, Flex/Grid), Vanilla JS (ES6+ Modules)
- **API ve Sunucu:** Node.js, Express.js (Restful Architecture)
- **Veri Deposu:** JSON dosyaları (`posts.json`, `users.json`), Markdown dosyaları (`.md`)
- **Kimlik Doğrulama:** JWT (JSON Web Tokens), `bcryptjs` (şifre hashing - 12 salt rounds)
- **Güvenlik Koruyucuları:** `express-rate-limit` (DDoS), cors, `sanitize-html` / DOMpurify (XSS)

### 📁 Klasör Makro Yapısı
```text
personal-site/
├── admin/                 # Admin panel statikleri (JS/CSS/HTML)
├── content/               # Çekirdek içerik (MD blog dosyaları, site metadata)
├── data/                  # Admin auth ve session verileri, theme ayarları
├── docs/                  # Sistem analiz ve mimari dokümantasyonları
├── images/                # Ortak görünürlüğü olan varlıklar
└── server.js              # Routing ve Core Node.js konfigürasyonları
```

---

## 4. Kullanıcı Deneyimi Akışları (UX Flows)

**✍️ İçerik Üretimi (Yazarlık Akışı):**
1. Admin, `/admin/login.html` üzerinden JWT session'ı başlatır.
2. Gelişmiş Markdown Editör açılarak başlık, özet ve etiketler girilir. (Bu esnada sistem otomatik `slug` üretir).
3. Yazı esnasında canlı önizleme güncellenir.
4. "Yayınla" butonuyla veri `posts.json`'a işlenir ve `.md` dosyası oluşturulur.

**🎨 Arayüz Özelleştirme (Tema Akışı):**
1. Tema Yönetimi sekmesinde Light veya Dark palet seçilir.
2. Form submit edildiğinde Backend `theme.json` dosyasını günceller.
3. İstemci (Frontend) yeniden yüklendiğinde CSS değişkenleri (Variables) güncel verilerle ezilerek (`override`) render edilir.

---

## 5. Güvenlik Perspektifi

Sistemin güvenlik altyapısı "Defense in Depth" yaklaşımıyla üretilmiştir.

- **Rate Limiting:** Sistem genelinde brute-force yavaşlatma mekanizması. `/api/login` route'unda daha agresif limitler.
- **XSS & Veri Sanitizasyonu:** Formdan veya API'den dönen Markdown/HTML içerikleri ekrana asimile edilirken `sanitize-html` türevleriyle filtrelenmektedir.
- **JWT İzolasyonu:** Payload içinde şifre saklanmaz, refresh stratejileriyle periyodik token ölümüne (expiration) izin verilir.

---

## 6. Dağıtım (Deployment) Stratejisi

> [!TIP]  
> Projenin dosya (JSON/MD) tabanlı olması sayesinde paylaşımlı hostinglerdeki (cPanel) standart Node.js toollarını (Phusion Passenger vb.) kullanarak kolayca deploy edebilirsiniz.

- **Ortam Değişkenleri (.env):** Production ortamında mutlak surette kendi şifreleme zinciriniz (`JWT_SECRET`) oluşturulmalıdır.
- **Port ve Reverse Proxy:** Nginx veya Apache üzerinden `localhost:3000` (veya sunulan Port) portuna reverse-proxy edilerek çalıştırılır.

---

## 7. Gelecek Yol Haritası (Roadmap)

Gelecekteki güncellemelerde hedeflenen başlıklar:
- **Çoklu Kullanıcı (Editors & Admins):** Makale onayı bekleyen editör altyapısı.
- **S3 / AWS Entegrasyonu:** Büyük ölçekli medyanın lokaldense bulutta (`bucket`'larda) saklanıp oradan stream edilmesi.
- **Yorumlar ve Etkileşim:** Anti-spam analizine sahip, misafir yorum sistemi altyapısı (GitHub Discussions veya yerleşik in-house motor).

---

## 🏷️ Doküman Bilgileri

- **İlk Oluşturulma:** 22 Ekim 2025
- **Son Güncelleme (Revizyon):** Şubat 2026
- **Mevcut Versiyon Uyum:** v0.1.4.anti
- **Sorumlu:** Cihan Enes Durgun
