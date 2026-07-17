# Geliştirici Dokümantasyonu

Projenin mimari, güvenlik, sürüm ve dağıtım dokümanları.

## İçindekiler

### [project/](./project/)
- [`project-brief.md`](./project/project-brief.md) — Teknik yığın ve mimari özet. **Buradan başlayın.**

### [deployment/](./deployment/)
- [`cpanel-deploy.md`](./deployment/cpanel-deploy.md) — cPanel kurulumu, push-to-deploy akışı,
  içerik senkronizasyonu ve sorun giderme

### [guides/](./guides/)
- [`release-process.md`](./guides/release-process.md) — Sürüm çıkarma adımları (SemVer + Conventional Commits)
- [`terminal-guide.md`](./guides/terminal-guide.md) — Terminal kullanımı ve otomasyon script'leri

### [security/](./security/)
- [`security-setup.md`](./security/security-setup.md) — Güvenlik sıkılaştırma ve SSL rehberi
- [`env-information.md`](./security/env-information.md) — Ortam değişkenlerinin işlevi ve yaşam döngüsü

> Güncel ve kodla birebir uyumlu değişken listesi için [`env.example`](../env.example)'a bakın.

### [error-handling/](./error-handling/)
- [`error-registry.md`](./error-handling/error-registry.md) — Hata kodları kayıt defteri (EN)
- [`error-registry.tr.md`](./error-handling/error-registry.tr.md) — Hata kodları kayıt defteri (TR)
- [`error-system-architecture.tr.md`](./error-handling/error-system-architecture.tr.md) — Hata yakalama ve loglama mimarisi

### [release-notes/](./release-notes/)
Her sürümün ayrıntılı notları (`0.1.13.md` biçiminde). Özet ve sürüm listesi için kök
dizindeki [`CHANGELOG.md`](../CHANGELOG.md).

### [reports/](./reports/)
Belirli bir tarihte alınmış anlık görüntülerdir; güncel durumu değil, o günkü durumu yansıtır.
- [`security-audit-2026-02.md`](./reports/security-audit-2026-02.md) — Defense in Depth güvenlik denetimi
- [`system-analysis-2026-02.md`](./reports/system-analysis-2026-02.md) — Kapsamlı sistem analizi

## Nereden başlamalı

| Amacın | Oku |
|---|---|
| Projeyi anlamak | [project-brief.md](./project/project-brief.md) → kök [README.md](../README.md) |
| Katkı/geliştirme kuralları | Kök [CLAUDE.md](../CLAUDE.md) |
| Siteyi yayına almak | [cpanel-deploy.md](./deployment/cpanel-deploy.md) |
| Yeni sürüm çıkarmak | [release-process.md](./guides/release-process.md) |
| Bir hata kodunun anlamı | [error-registry.tr.md](./error-handling/error-registry.tr.md) |

## Kök dizin bağlantıları

- [README.md](../README.md) — Proje tanıtımı
- [CLAUDE.md](../CLAUDE.md) — Proje kuralları ve mimari özet
- [CHANGELOG.md](../CHANGELOG.md) — Sürüm geçmişi
- [admin/README.md](../admin/README.md) — Admin paneli
