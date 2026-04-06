# 📖 Sürüm Güncelleme ve Yayınlama Rehberi

Bu döküman, projemizde yeni bir sürüm yayına alınırken izlenen standart operasyon prosedürlerini (SOP) ve profesyonel iş akışını teknik detaylarıyla açıklar.

---

## 🏗️ 1. Teşhis ve Planlama (Audit & Planning)

Her yeni sürümden önce yapılan ilk adım, bir önceki sürümden bu yana yapılan kod değişikliklerinin analiz edilmesidir.

- **Analiz:** `git log --oneline -20` ile son commit'ler incelenerek hangi özelliklerin (Feature) eklendiği ve hangi hataların (Bug Fix) giderildiği belirlenir.
- **İsimlendirme (Codename):** Sürüm numarasına 3 harfli bir kod adı eklenir. Kod adı, sürümde kimin/neyin öne çıktığını yansıtır (Örn: `.cla` → Claude, `.anti` → Antigravity).
- **Rutin Belirleme:** Güncellenecek yan dökümanlar (Sitemap, RSS, Güvenlik Raporu vb.) listelenir.

---

## 🔢 2. Versiyon Numaralarının Güncellenmesi (Version Bumping)

Sürüm birliğinin korunması için versiyon numarası **yalnızca şu iki çekirdek dosyada** güncellenir; geri kalan her şey otomatik senkronize olur:

### A. Çekirdek Yapılandırma (Manuel Güncelleme Gerekir)
1. **`src/js/version.js`** — Tek kaynak (Single Source of Truth). Bu dosyadaki `APP_VERSION` değişkeni değiştirildiğinde, `version.js` hem sunucu (`server.js` tarafından `require`) hem de tarayıcı (script tag) tarafından okunduğu için tüm arayüz ve API yanıtları otomatik güncellenir.
2. **`package.json`** — NPM ekosistemi için standart sürüm tanımı.

### B. Dokümantasyon (Manuel Güncelleme Gerekir)
3. **`README.md`** — Badge satırındaki versiyon numarası.
4. **`docs/version-notes/X.X.X.xxx.md`** — Bu sürüme ait yeni versiyon notu dosyası oluşturulur.

### C. Otomatik Güncellenenler (Dokunmaya Gerek Yok)
- Tüm HTML sayfalarındaki (index, blog, post, admin) `.version-info` ve `.version-badge` span'ları, `version.js` script'i sayfa yüklendiğinde otomatik olarak günceller.

---

## 📝 3. Versiyon Notu Oluşturma

Her sürüm için `docs/version-notes/` dizini altında `X.X.X.xxx.md` formatında yeni bir dosya oluşturulur. Standart bölümler:

```
# 📄 Versiyon Notları - vX.X.X.xxx

_Yayın Tarihi: [Ay] [Yıl]_

## 🌟 Genel Bakış
## ✨ Yeni Özellikler ve Geliştirmeler
## 🐛 Giderilen Hatalar
## 📋 Teknik Detaylar
```

---

## ✅ 4. Doğrulama ve Test (Verification)

Sürüm yayına alınmadan önce şu kontroller yapılır:

- **Versiyon Tutarlılığı:** `version.js`, `package.json` ve `README.md`'nin senkron olduğu kontrol edilir.
- **Tema Kontrolü:** Dark/Light mod geçişlerinin sorunsuz çalıştığı doğrulanır.
- **Fonksiyon Testi:** Yeni eklenen özelliklerin stabil çalıştığı doğrulanır.
- **Editör Testi:** Markdown editöründe görsel yükleme ve kaydetme akışı kontrol edilir.

---

## 📤 5. Git ve Yayın Prosedürü (Release)

Tüm değişiklikler hazırlandıktan sonra aşağıdaki komut setiyle süreç tamamlanır:

```bash
# Yalnızca ilgili dosyaları seçerek sahneye al (git add . yerine tercih edilir)
git add src/js/version.js package.json README.md docs/version-notes/X.X.X.xxx.md
git add admin/admin.css admin/admin.js admin/index.html  # Değişen diğer dosyalar

# Standart release commit mesajı
git commit -m "chore(release): vX.X.X.xxx - Kısa açıklama"

# Main branch'e gönder
git push origin main
```

### Commit Mesajı Formatı

| Prefix | Kullanım |
|---|---|
| `chore(release):` | Versiyon yayınlama commit'i |
| `feat:` | Yeni özellik ekleme |
| `fix:` | Hata düzeltme |
| `docs:` | Yalnızca dokümantasyon değişikliği |
| `refactor:` | İşlevsel değişiklik olmadan kod düzenleme |

---

## 💡 İpuçları ve En İyi Pratikler

- **Consistency (Tutarlılık):** Versiyon numarasını `version.js` ve `package.json`'da güncel tutmak yeterlidir; HTML dosyalarına tek tek dokunmayın.
- **Selective Staging:** `git add .` yerine değişen dosyaları tek tek ekleyin — bu, `data/`, `logs/` veya `content/` gibi runtime'da değişen dosyaların yanlışlıkla commit edilmesini önler.
- **Rollback (Geri Dönüş):** `git log --oneline` ile geçmiş commit'ler görülebilir; `git revert <commit-hash>` ile güvenli geri dönüş yapılabilir.
- **Documentation First:** Kod yazmak kadar, o kodu ne amaçla yazdığınızı (Versiyon Notları) dökümante etmek de profesyonelliğin bir parçasıdır.

---

*Bu rehber, proje geliştirme sürecindeki standart operasyon prosedürlerini yansıtacak şekilde güncel tutulmaktadır.*
