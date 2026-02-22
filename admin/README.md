# 🔐 DurgunTech Admin Control Center

[![Status](https://img.shields.io/badge/Status-Active%20Development-success?style=flat-square)]()
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS-yellow?style=flat-square)]()
[![Auth](https://img.shields.io/badge/Auth-JWT%20Protected-red?style=flat-square)]()

Bu dizin, DurgunTech Blog Engine'in kalbi olan yönetim panelinin statik varlıklarını (HTML, CSS, Modüler JS) barındırır. Sistem tamamen **Single Page Application (SPA)** vari bir deneyim sunmak üzere Vanilla JS kullanılarak inşa edilmiştir.

---

## 🚀 Temel Özellikler

### 📊 İzleme & Dashboard
- **Anlık İstatistikler:** Toplam yazı, okunma oranları ve sistem durumunu tek ekranda izleme.
- **Hızlı Aksiyonlar:** Tek tıkla yeni taslak (draft) oluşturabilme.

### 📝 CMS (İçerik Yönetimi)
- **Gelişmiş Datatable:** Blog yazılarını anlık arama, sıralama ve etiket tabanlı filtreleme.
- **Güvenli Silme (Soft-Delete & Hard-Delete):** Yazıların kalıcı silinmeden önce onay mekanizmasından geçirilip, Trash (Çöp Kutusu) klasöründe bekletilmesi (ileriki update).
- **Editör Entegrasyonu:** Markdown editörüyle tam uyumlu çalışarak veriyi doğrudan `posts.json` ve `.md` dosyalarına işleme.

### 🎨 Görsel ve Arayüz (UI/UX)
- **Fluid Responsive Layout:** Mobilde kompakt, masaüstünde geniş dashboard deneyimi.
- **Tema Motoru:** CSS Variables ile yönetilen, kullanıcının sistem tercihini anlayan Dark/Light geçişleri.
- **Bildirimler:** Tüm CRUD işlemleri sonrası çalışan asenkron Toast notification sistemi.

---

## 📁 Mimari Dizilimi

```text
admin/
├── js/                 # API Servisleri, Modül Logic'leri
├── css/                # Dashboard'a özel stiller
├── index.html          # Yetki gerektiren ana dashboard
├── login.html          # JWT doğrulama ekranı
└── README.md           # Bu dosya
```

> [!CAUTION]  
> Bu panel klasörü `public/` servisi yapmaz. Express.js middleware tarafında `/admin/*` yollarından gelen tüm istekler yetkili bir JWT token barındırmıyorsa reddedilir ve `login.html`'e düşürülür.

---

## 🔮 Gelecek Roadmap

- [ ] **Grafiksel İstatistikler:** Chart.js vb. kullanılarak okunma verilerinin görselleştirilmesi.
- [ ] **Toplu İşlemler (Bulk Actions):** Aynı anda birden fazla yazıyı seçip silme/taslağa alma.
- [ ] **Gelişmiş Medya Galerisi:** Sürükle-bırak ile AWS S3 / Local Storage üzerine doğrudan asset yükleyip önizleme yapabilme arayüzü.

---
**Modül Sorumlusu:** Cihan Enes Durgun
