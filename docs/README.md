# 📚 DurgunTech Geliştirici Dokümantasyonu

Bu klasör, projenin kurumsal düzeydeki tüm dokümantasyon dosyalarını, analizlerini ve sistem mimarisi raporlarını içerir.

---

## 📁 Klasör Hiyerarşisi (Index)

### 📋 [project/](./project/)
Projenin temel vizyonu, kapsamı ve makro seviyede sistem analizleri:
- `project-brief.md` - **[Önemli]** Projenin teknik yığını ve mimari özeti

### 🛠️ [error-handling/](./error-handling/)


Hata yönetimi, registry ve mimari detaylar:
- `ERROR_REGISTRY.md` - Sistem hatalarının merkezi kayıt defteri
- `ERROR_REGISTRY_TR.md` - Merkezi kayıt defteri (Türkçe)
- `ERROR_SYSTEM_ARCHITECTURE_TR.md` - Hata yakalama ve loglama mimarisi

### 📖 [guides/](./guides/)
Kullanım kılavuzları ve teknik rehberler:
- `TERMINAL_REHBERI.md` - Terminal kullanımı ve otomasyon scriptleri rehberi

### 🔒 [security/](./security/)
Siber güvenlik ve ortam değişkenleri konfigürasyonları:
- `security-setup.md` - Güvenlik kurulum, hardening (sıkılaştırma) ve SSL rehberi
- `env-information.md` - `.env` dosyasındaki tüm degişkenlerin işlev ve yaşam döngüleri

### 🛡️ [reports/](./reports/)
- `GUVENLIK_DENETIM_RAPORU.md` - Sistemin *Defense in Depth* odaklı genel siber güvenlik denetim (audit) raporu

---

## 🚀 Hızlandırılmış Yönlendirmeler

**1. Projeyi Yeni Kuruyorsanız:**
İlk olarak [Project Brief](./project/project-brief.md) dosyasını okuyun. Teknoloji bağımlılıklarını anladıktan sonra doğrudan kök dizindeki README dosyasını inceleyin.

**2. Güvenlik Denetimi veya Zafiyet Testi Yapıyorsanız:**
Lütfen kodları incelemeden önce doğrudan [Güvenlik Denetim Raporu](./reports/GUVENLIK_DENETIM_RAPORU.md) dokümanını referans alın.

---

## 📝 Versiyon Geçmişi (Changelog)

Projenin semantik versiyonlama sürecindeki her patch/minor/major güncellemesi bu klasör altındaki [`./version-notes/`](./version-notes/) dizininde tasnif edilmiştir.

---

## 🔗 Hızlı Linkler (Kök Dizin)

- [Ana Proje (Root) README](../README.md)
- [Node.js Package Registry](../package.json)
- [Admin CMS](../admin/README.md)

