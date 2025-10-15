# Admin Panel - Blog Yönetimi

Bu admin paneli, blog yazılarınızı kolayca yönetmenizi sağlar.

## 🚀 Özellikler

### 📊 Dashboard
- **İstatistikler**: Toplam yazı sayısı, öne çıkan yazılar, bu ayki yazılar, toplam etiket sayısı
- **Hızlı Erişim**: Yeni blog yazısı oluşturma butonu

### 📝 Blog Yönetimi
- **Yazı Listesi**: Tüm blog yazılarını tablo halinde görüntüleme
- **Arama**: Başlık, özet ve etiketlerde arama yapma
- **Filtreleme**: Öne çıkan yazılar, son yazılar vb. filtreleme
- **Düzenleme**: Mevcut yazıları düzenleme
- **Silme**: Yazıları güvenli şekilde silme

### ✨ Yeni Yazı Oluşturma
- **Form Tabanlı**: Kullanıcı dostu form arayüzü
- **Otomatik Slug**: Başlıktan otomatik URL oluşturma
- **Markdown Desteği**: İçerik için Markdown editörü
- **Etiket Yönetimi**: Virgülle ayrılmış etiketler
- **Öne Çıkarma**: Yazıları öne çıkan olarak işaretleme

### 🎨 Modern Arayüz
- **Responsive Tasarım**: Mobil ve desktop uyumlu
- **Dark/Light Tema**: Tema değiştirme özelliği
- **Modern Animasyonlar**: Smooth geçişler ve hover efektleri
- **Modal Pencereler**: Popup formlar ve onay dialogları

## 📁 Dosya Yapısı

```
admin/
├── index.html          # Ana admin panel sayfası
├── admin.css           # Admin panel stilleri
├── admin.js            # Admin panel JavaScript
└── README.md           # Bu dosya
```

## 🔧 Kullanım

### 1. Erişim
Ana sayfadaki "Admin" butonuna tıklayarak veya doğrudan `/admin/` URL'sine giderek erişebilirsiniz.

### 2. Yeni Blog Yazısı Oluşturma
1. "Yeni Blog Yazısı" butonuna tıklayın
2. Formu doldurun:
   - **Başlık**: Yazının başlığı (otomatik slug oluşturur)
   - **URL Slug**: URL için benzersiz tanımlayıcı
   - **Özet**: Yazının kısa özeti
   - **Tarih**: Yayın tarihi
   - **Kapak Görseli**: Görsel dosya yolu
   - **Etiketler**: Virgülle ayrılmış etiketler
   - **İçerik**: Markdown formatında içerik
   - **Öne Çıkan**: Yazıyı öne çıkan olarak işaretleme
3. "Yazıyı Kaydet" butonuna tıklayın

### 3. Mevcut Yazıları Düzenleme
1. Yazı listesinde "Düzenle" butonuna tıklayın
2. Form otomatik olarak mevcut verilerle doldurulur
3. Değişiklikleri yapın
4. "Değişiklikleri Kaydet" butonuna tıklayın

### 4. Yazı Silme
1. Yazı listesinde "Sil" butonuna tıklayın
2. Onay dialogunda "Evet, Sil" butonuna tıklayın

### 5. Arama ve Filtreleme
- **Arama**: Üst kısımdaki arama kutusunu kullanın
- **Filtreleme**: Dropdown menüden filtre seçin

## 🎨 Tema Özellikleri

### Light Tema
- Açık arka plan
- Koyu metin
- Yeşil accent rengi (#84CC16)

### Dark Tema
- Koyu arka plan
- Açık metin
- Aynı accent rengi

## 📱 Responsive Tasarım

### Desktop (1200px+)
- Tam genişlik layout
- Yan yana form alanları
- Hover efektleri

### Tablet (768px - 1199px)
- Orta genişlik layout
- Tek kolon form alanları
- Touch-friendly butonlar

### Mobil (320px - 767px)
- Tam genişlik layout
- Kompakt tasarım
- Touch-optimized arayüz

## 🔒 Güvenlik Notları

⚠️ **Önemli**: Bu admin paneli şu anda frontend-only çalışmaktadır. Gerçek bir uygulamada:

1. **Kimlik Doğrulama**: Login sistemi eklenmelidir
2. **API Entegrasyonu**: Backend API ile entegre edilmelidir
3. **Dosya Yönetimi**: Gerçek dosya sistemi entegrasyonu
4. **CSRF Koruması**: Cross-site request forgery koruması
5. **Input Validation**: Giriş verilerinin doğrulanması

## 🚀 Gelecek Geliştirmeler

- [ ] **Kimlik Doğrulama**: Login sistemi
- [ ] **Dosya Yükleme**: Görsel yükleme özelliği
- [ ] **Markdown Preview**: Canlı önizleme
- [ ] **Bulk Operations**: Toplu işlemler
- [ ] **Analytics**: Yazı performans analizi
- [ ] **Scheduling**: Zamanlanmış yayınlar
- [ ] **Backup**: Otomatik yedekleme

## 📞 Destek

Herhangi bir sorun yaşarsanız veya öneriniz varsa, lütfen iletişime geçin.

---

**Admin Panel v1.0** - Cihan Enes Durgun
