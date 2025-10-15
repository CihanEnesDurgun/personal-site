### ESP-NOW Nedir?

**ESP-NOW**, Espressif Systems tarafından geliştirilen, kablosuz ağ üzerinden cihazdan cihaza veri göndermeyi sağlayan hızlı ve düşük maliyetli bir haberleşme protokolüdür. Geleneksel Wi-Fi veya Bluetooth gibi daha karmaşık protokollerin aksine, ESP-NOW, bir router veya merkezi bir erişim noktasına (AP) ihtiyaç duymadan doğrudan cihazlar arasında iletişim kurar. Bu özellik, özellikle nesnelerin interneti (IoT) projelerinde, sensör verilerinin hızla toplanması veya cihazlar arasında basit kontrol komutlarının iletilmesi gerektiğinde büyük avantaj sağlar.

---

### Nasıl Çalışır?

ESP-NOW, **2.4 GHz** Wi-Fi bandını kullanır, ancak Wi-Fi ağına bağlanmak için gerekli olan karmaşık el sıkışma ve yönetim süreçlerini atlar. Cihazlar, birbirlerinin MAC adreslerini (cihazın benzersiz fiziksel adresi) bilerek doğrudan eşleşirler. Bir cihaz, paketi hedefin MAC adresini belirterek yayınladığında, hedef cihaz bu paketi alır ve işler. Bu doğrudan iletişim, veri iletim gecikmesini (latency) minimuma indirir ve enerji tüketimini oldukça düşürür. Bu da özellikle pille çalışan cihazlar için idealdir. ESP-NOW, yayın (broadcast), unicast (tek bir cihaza) ve grup (group) iletişimlerini destekler, böylece birden fazla cihazla esnek bir şekilde haberleşilebilir.

---

### ESP-NOW'un Avantajları

* **Düşük Güç Tüketimi:** Wi-Fi'daki gibi sürekli bağlantı kurma ve yönetme süreçleri olmadığı için ESP-NOW oldukça az enerji harcar. Bu, özellikle pille çalışan sensör düğümleri gibi uygulamalar için çok önemlidir.
* **Hızlı İletişim:** Bir router'a veya sunucuya ihtiyaç duymadan doğrudan iletişim kurulduğu için veri iletimi çok hızlı gerçekleşir. Bu, anlık tepki gerektiren uygulamalar için idealdir.
* **Ağ Bağımsızlığı:** Wi-Fi ağının menzili veya mevcudiyeti, ESP-NOW iletişimi için bir sorun teşkil etmez. Cihazlar kendi aralarında, bir Wi-Fi ağı yokken bile haberleşebilir.
* **Basit Kullanım:** ESP-NOW'u uygulamak, Wi-Fi veya Bluetooth'a göre daha az kod ve konfigürasyon gerektirir. ESP32 ve ESP8266 gibi Espressif çiplerle kolayca entegre edilebilir.

<div class="image-container">
  <img src="images/blog-covers/elektronikSema.png" alt="ESP-NOW Elektronik Şema" class="centered-image">
  <p class="image-caption">ESP-NOW protokolü ile cihazlar arası doğrudan iletişim şeması</p>
</div>

---

### Kullanım Alanları

ESP-NOW, pek çok farklı alanda kullanılabilir. Örneğin, bir ev otomasyon sisteminde bir sensörden aldığı veriyi doğrudan bir aktüatöre (örneğin, bir ışık anahtarı) gönderebilir. Bir robotik projesinde, robot kollarını anlık olarak kontrol etmek veya kablosuz bir kumanda ile robotu yönlendirmek için kullanılabilir. Ayrıca, tarımsal IoT uygulamalarında, uzaktaki sensörlerden sulama sistemlerini tetiklemek gibi görevlerde de etkili bir çözümdür. Kısacası, basit, hızlı ve düşük maliyetli kablosuz iletişime ihtiyaç duyulan her yerde ESP-NOW tercih edilebilir.
