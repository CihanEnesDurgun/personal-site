---
description: Yabancı AI Asistanlar ve Antigravity için Yeni Sürüm (Release) Yayınlama Rutini
---

Bu workflow, projede yeni bir versiyon güncellemesi ve yayını yapılacağı zaman, AI Asistanı (Antigravity vb.) tarafından **eksiksiz** takip edilmesi gereken zorunlu adımları içerir.

### 1. Analiz ve Planlama (PLANNING Modu)
- Projede son yayından (Örn: v0.1.7.anti) bu yana yapılan tüm değişiklikleri `git log`, `walkthrough.md.resolved` veya kullanıcının verdiği özet bilgilerden oku ve teşhis et.
- Yeni versiyon numarasını belirle (Örn: `v0.1.8.anti`) ve uygun bir **Kod Adı (Codename)** seç.
- Bu değişiklikleri ve yayın planını içeren bir `implementation_plan.md` oluştur. Plan, kullanıcı (USER) tarafından onaylanmadan asla kod değişikliklerine (2. adıma) geçme.

### 2. Versiyon Numaralarının Güncellenmesi (EXECUTION Modu)
Aşağıdaki kritik dosyalardaki tüm eski versiyon numaralarını, yeni versiyon numarası ile titizlikle (multi_replace_file_content veya benzeri tool'lar kullanarak) değiştir:
- `src/js/version.js` içindeki `APP_VERSION` değişkeni.
- `package.json` içindeki `version` değeri (`0.1.8-anti` tireli formatta).
- `README.md` tablosundaki veya başındaki `Version` badge'i.
- `rss.xml` içindeki `<generator>` etiketi.
- `docs/project/project-brief.md` içindeki "Mevcut Versiyon Uyum" satırı.
- `docs/reports/GUVENLIK_DENETIM_RAPORU.md` içindeki "Versiyon Uyum" satırı.
- Bütün ana HTML sayfalarının (`index.html`, `blog.html`, `post.html`, `markdown-editor/index.html`, `admin/login.html`) alt kısmındaki (footer) `<span class="version-info">` içeriği.

### 3. Sürüm Notlarının (Release Notes) Oluşturulması
- Yeni versiyon için `docs/version-notes/` dizininde `[versiyon].md` (Örn: `0.1.8.anti.md`) isimli bir dosya yarat.
- Sektör standartlarına uygun profesyonel içerikle; "Genel Bakış", "Eklenen Özellikler", "Teknik İyileştirmeler" gibi başlıklarla yapılanları harika bir dille aktar.

### 4. Git Commit ve Push Süreci
Yayına almak için ilgili `run_command` yetkilerini kullanarak aşağıdaki git işlemlerini yap (Kullanıcıdan onay alarak veya turbo yetkisi varsa otomatik):

// turbo
```bash
git add .
git commit -m "chore(release): [VERSIYON_NUMARASI] - [KOD_ADI]"
git push
```

### 5. Final Walkthrough ve Bildirim (VERIFICATION Modu)
- Artık bir `walkthrough.md` oluşturup yayınla. Dosya içinde nelerin başarıyla yayınlandığını yaz.
- İşlemler bittiğinde `notify_user` komutu ile kullanıcıya coşkulu bir dille versiyon yayınını müjdele.
