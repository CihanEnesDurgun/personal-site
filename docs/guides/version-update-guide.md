# 📖 Sürüm Güncelleme ve Yayınlama Rehberi (v0.1.7+)

Bu döküman, projemizde yeni bir sürüm yayına alınırken izlenen standart operasyon prosedürlerini (SOP) ve profesyonel iş akışını teknik detaylarıyla açıklar.

---

## 🏗️ 1. Teşhis ve Planlama (Audit & Planning)
Her yeni sürümden önce yapılan ilk adım, bir önceki sürümden bu yana yapılan kod değişikliklerinin analiz edilmesidir.

- **Analiz:** `git log` ve son commit'ler incelenerek hangi özelliklerin (Feature) eklendiği ve hangi hataların (Bug Fix) giderildiği belirlenir.
- **İsimlendirme (Codename):** Sürüme karakteristik bir kod adı verilir (Örn: *v0.1.7.anti - Prism Resize*).
- **Rutin Belirleme:** Güncellenecek yan dökümanlar (Sitemap, Güvenlik Raporu vb.) listelenir.

---

## 🔢 2. Versiyon Numaralarının Güncellenmesi (Version Bumping)
Sürüm birliğinin korunması için versiyon numarası senkronize olarak şu dosyalarda güncellenmelidir:

### A. Çekirdek Yapılandırma
1. **`src/js/version.js`:** Hem sunucu hem de istemci tarafında kullanılan ana versiyon değişkeni (`APP_VERSION`).
2. **`package.json`:** NPM tabanlı projeler için standart sürüm tanımı.

### B. Dokümantasyon ve RSS
3. **`README.md`:** Proje ana sayfasındaki görsel badge'lerin güncellenmesi.
4. **`rss.xml`:** RSS feed jeneratör bilgisinin güncellenmesi.
5. **`docs/project/project-brief.md`:** Proje kapsam dökümanının güncellenmesi.
6. **`docs/reports/GUVENLIK_DENETIM_RAPORU.md`:** Güvenlik uyumluluk versiyonunun güncellenmesi.

### C. UI / Arayüz Bileşenleri
7. **HTML Footer'lar:** Tüm sayfalardaki (index, blog, post, admin) `version-info` span etiketlerinin sürüm numarası ile güncellenmesi.

---

## 📝 3. Profesyonel Versiyon Notlarının Oluşturulması
Her sürüm için `docs/version-notes/` dizini altında yeni bir `.md` dosyası oluşturulur. Bu döküman şu standart bölümleri içermelidir:
- **Genel Bakış:** Sürümün ana amacı.
- **Teknik Detaylar:** Yapılan kod bazlı geliştirmeler.
- **UX/UI Geliştirmeleri:** Görsel ve kullanıcı deneyimi odaklı değişiklikler.
- **Bug Fixes:** Giderilen hataların listesi.

---

## ✅ 4. Doğrulama ve Test (Verification)
Sürüm yayına alınmadan önce şu kontroller yapılır:
- **Tema Kontrolü:** Varsayılan tema tercihlerinin (Dark/Light) doğru yüklendiğinden emin olunur.
- **Fonksiyon Testi:** Yeni eklenen özelliklerin (Örn: Resize Toolbar) stabil çalıştığı doğrulanır.
- **Markdown Uyumluluğu:** HTML'den Markdown'a dönüşümün veri kaybı yaşatmadığı kontrol edilir.

---

## 📤 5. Git ve Yayın Prosedürü (Release)
Tüm değişiklikler hazırlandıktan sonra aşağıdaki komut setiyle süreç tamamlanır:

```bash
# Tüm değişiklikleri sahneye al
git add .

# Standart release commit mesajı oluştur
git commit -m "chore(release): vX.X.X.anti - [Kod Adı]"

# Sunucuya gönder
git push
```

---

## 💡 İpuçları ve En İyi Pratikler
- **Consistency (Tutarlılık):** Versiyon numarasını asla tek bir dosyada bırakmayın, tüm ekosistemde güncelleyin.
- **Rollback (Geri Dönüş):** Önemli bir sürüm öncesi her zaman yedek alın veya commit geçmişinizi temiz tutun.
- **Documentation First:** Kod yazmak kadar, o kodu ne amaçla yazdığınızı (Versiyon Notları) dökümante etmek de profesyonelliğin bir parçasıdır.

---
*Bu rehber, Antigravity AI tarafından profesyonel full-stack geliştirme standartlarına uygun olarak hazırlanmıştır.*
