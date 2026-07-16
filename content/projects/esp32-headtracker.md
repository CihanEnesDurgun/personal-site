## Proje Hakkında

Bu proje, bir **IMU sensöründen** (MPU6050) alınan baş hareketlerini gerçek zamanlı olarak okuyup, **ESP-NOW** protokolü üzerinden ikinci bir ESP32'ye ileten kablosuz bir headtracker sistemidir. Uçuş simülatörleri ve FPV uygulamalarında, başın yaw/pitch/roll hareketlerini kameraya veya oyun içi bakış açısına yansıtmak için kullanılır.

### Neden ESP-NOW?

Geleneksel Wi-Fi bağlantısının aksine ESP-NOW, bir router'a ihtiyaç duymadan cihazdan cihaza doğrudan haberleşme sağlar. Bu sayede:

- **Düşük gecikme:** ~2-5 ms mertebesinde uçtan uca gecikme
- **Bağımsızlık:** Herhangi bir ağ altyapısı gerektirmez
- **Düşük güç:** Pil ile uzun süreli çalışma

### Sistem Mimarisi

Verici tarafında IMU sensörü I2C üzerinden okunur, Madgwick filtresiyle sensör füzyonu yapılır ve elde edilen açılar 100 Hz frekansında alıcıya gönderilir. Alıcı taraf bu verileri USB HID veya seri port üzerinden bilgisayara aktarır.

> Tasarım sürecinde en çok zorlandığım kısım, IMU'nun drift problemini gidermek için doğru filtre katsayılarını bulmaktı.

### Geliştirme Notları

Projeyi geliştirirken karşılaştığım en önemli ders, kablosuz sistemlerde **paket kaybına karşı dayanıklılık** kurmanın kritik olduğuydu. Kaybolan paketleri tolere eden bir yumuşatma (smoothing) katmanı ekleyerek titremeyi ortadan kaldırdım.
