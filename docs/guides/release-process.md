# Sürüm Çıkarma Süreci

Projede Semantic Versioning 2.0.0 ve Conventional Commits kullanılır.

## Sürüm numarası nasıl belirlenir

Format: **MAJOR.MINOR.PATCH** (örn. `0.1.13`)

| Değişiklik | Artan | Örnek |
|---|---|---|
| Geriye dönük uyumsuz değişiklik, mimari yeniden yazım, endpoint kaldırma | MAJOR | `1.4.2` → `2.0.0` |
| Yeni özellik, yeni endpoint, uyumlu iyileştirme | MINOR | `1.4.2` → `1.5.0` |
| Hata düzeltmesi, performans, refactor, bağımlılık, dokümantasyon | PATCH | `1.4.2` → `1.4.3` |

Birden fazla değişiklik varsa **en yüksek etkili olan** belirler (MAJOR > MINOR > PATCH).

### v0.x.x özel durumu

Proje şu an 1.0.0 öncesi (başlangıç geliştirme) aşamasında: API kararsız sayılır ve
geriye dönük uyumsuz değişiklikler MINOR artışla yapılabilir (`0.1.0` → `0.2.0`).

1.0.0'a geçiş için: çekirdek özellikler kararlı, dokümantasyon tam, production'da test
edilmiş, public API tanımlı.

## Commit mesajlarından sürüm etkisi

| Commit tipi | Etki |
|---|---|
| `feat:` | MINOR |
| `fix:`, `perf:`, `refactor:` | PATCH |
| `docs:`, `style:`, `test:`, `chore:` | PATCH veya etkisiz |
| Gövdesinde `BREAKING CHANGE:` | v1.0.0 sonrası MAJOR, öncesinde MINOR |

## Adımlar

**1. Değişiklikleri topla.** Son sürümden bu yana ne değişti:

```bash
git log --oneline $(git describe --tags --abbrev=0)..HEAD
```

**2. Sürümü belirle.** Yukarıdaki tabloya göre artışa karar ver.

**3. Sürüm numarasını her yerde güncelle** — hepsi aynı olmalı, yoksa sitede görünen
sürüm ile paketinki ayrışır. `README.md`'deki rozet unutulmaya en müsait olanı.

- `package.json` → `"version": "0.1.14"`
- `src/js/version.js` → `const APP_VERSION = 'v0.1.14'`
- `README.md` → sürüm rozeti (`Version-v0.1.14-blue`)

Kaçırılan yer kalmadığını doğrulamak için:

```bash
git grep -n "0\.1\.13" -- ':!docs/release-notes' ':!CHANGELOG.md'
```

(Eski sürümü örnek olarak anan `docs/` dosyaları hariç, hiçbir eşleşme çıkmamalı.)

> Sürüm numarasına araç/asistan eki (`-cla`, `.anti` gibi) **eklenmez**. Sürüm, kodun
> durumunu anlatır; hangi araçla yazıldığını değil.

**4. `CHANGELOG.md`'yi güncelle.** [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/)
formatı: `Eklendi` / `Değiştirildi` / `Düzeltildi` / `Kaldırıldı` / `Güvenlik` başlıkları.

**5. Doğrula.** Sunucuyu başlat, sürümün log'da ve sayfa altbilgisinde doğru göründüğünü
gör, admin girişini dene:

```bash
npm run dev
curl -s localhost:3000/api/version
```

**6. Commit'le ve etiketle:**

```bash
git commit -m "chore(release): v0.1.14"
git tag -a v0.1.14 -m "Release v0.1.14"
git push && git push --tags
```

## Yayına alma

`main`'e push, cPanel'de otomatik deploy'u tetikler. Ayrıntılar:
`docs/deployment/cpanel-deploy.md`.
