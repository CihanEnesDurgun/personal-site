# 📚 DurgunTech Geliştirici Dokümantasyonu

Bu klasör, projenin kurumsal düzeydeki tüm dokümantasyon dosyalarını, analizlerini ve sistem mimarisi raporlarını içerir.

---

## 📁 Klasör Hiyerarşisi (Index)

### 📦 [deployment/](./deployment/)
Sunucuya yükleme ve canlı ortama çıkış (DevOps) rehberleri:
- `quick-start-cpanel.md` - Paylaşımlı hosting (cPanel) için pratik Node.js başlangıç rehberi
- `cpanel-manual-upload-guide.md` - Git olmayan cPanel ortamları için manuel yükleme yönergeleri
- `cpanel-npm-install-fix.md` - Sunucu taraflı paket kurulum (npm) sorunlarına çözüm
- `deployment-checklist.md` - Canlıya çıkmadan önceki (Pre-flight) kontrol listesi
- `deployment-security-guide.md` - Webhook ve production ortamına ait güvenli deployment esasları

### 🔒 [security/](./security/)
Siber güvenlik ve ortam değişkenleri konfigürasyonları:
- `security-setup.md` - Güvenlik kurulum, hardening (sıkılaştırma) ve SSL rehberi
- `env-information.md` - `.env` dosyasındaki tüm degişkenlerin işlev ve yaşam döngüleri

### 📋 [project/](./project/)
Projenin temel vizyonu, kapsamı ve makro seviyede sistem analizleri:
- `project-brief.md` - **[Önemli]** Projenin teknik yığını ve mimari özeti
- `personal-site.docx` - Projenin dökümantasyonunun raw (Word) hali

### 🛡️ [reports/](./reports/)
- `GUVENLIK_DENETIM_RAPORU.md` - Sistemin *Defense in Depth* odaklı genel siber güvenlik denetim (audit) raporu

---

## 🚀 Hızlandırılmış Yönlendirmeler

**1. Sunucuya Format Atıp Kurulum Yapıyorsanız:**
İlk olarak [Project Brief](./project/project-brief.md) dosyasını okuyun. Teknoloji bağımlılıklarını anladıktan sonra doğrudan [Quick Start cPanel](./deployment/quick-start-cpanel.md) adımlarına geçin.

**2. Güvenlik Denetimi veya Zafiyet Testi Yapıyorsanız:**
Lütfen kodları incelemeden önce doğrudan [Güvenlik Denetim Raporu](./reports/GUVENLIK_DENETIM_RAPORU.md) ve [Sistem Analizi](./project/sistem-analizi.md) makalelerini referans alın.

---

## 📝 Versiyon Geçmişi (Changelog)

Projenin semantik versiyonlama sürecindeki her patch/minor/major güncellemesi kök dizindeki [`../version-notes/`](../version-notes/) klasöründe tasnif edilmiştir.

---

## 🔗 Hızlı Linkler (Kök Dizin)

- [Ana Proje (Root) README](../README.md)
- [Node.js Package Registry](../package.json)
- [Admin CMS](../admin/README.md)
