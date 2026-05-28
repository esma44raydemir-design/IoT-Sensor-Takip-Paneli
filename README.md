Sağladığınız kaynak kodlara (HTML, CSS ve JavaScript) dayanarak projeniz için kapsamlı, profesyonel ve modern bir `README.md` şablonu hazırladım. Bu metni kopyalayıp projenizin dizinine `README.md` adıyla kaydedebilirsiniz.

---

# 🌐 IoT Sensör Takip Paneli v2.0

Gerçek zamanlı sıcaklık, nem, ışık ve basınç sensör verilerini izlemek, analiz etmek ve yönetmek için geliştirilmiş modern, duyarlı (responsive) ve kullanıcı dostu bir web arayüzüdür.

## 🚀 Proje Hakkında

Bu proje, IoT cihazlarından gelen verileri anlık olarak takip edebilmeniz için tasarlanmıştır. Gelişmiş grafikler, veri tabloları ve uyarı sistemleriyle donatılmış olup, endüstriyel sistemler, akıllı ev uygulamaları veya kişisel donanım projeleri (Arduino, ESP32 vb.) için mükemmel bir temel dashboard (gösterge paneli) sağlar. İçerisinde bulunan simülasyon motoru sayesinde donanım bağlantısı olmadan da arayüzü test edebilirsiniz.

## ✨ Temel Özellikler

* **📊 Gerçek Zamanlı Gösterge Paneli:** Sıcaklık (°C), Nem (%), Işık Şiddeti (lux) ve Basınç (hPa) verilerini anlık olarak bilgi kartları ve mini "sparkline" grafikleri üzerinden takip etme.


* **📈 Gelişmiş Analizler:** Sensör verileri arasındaki korelasyonu, trend analizlerini ve durum dağılımını (Kritik, Uyarı, Normal) gösteren dinamik Chart.js grafikleri.


* **📡 Donanım Göstergeleri:** Her bir sensör türü için (DHT22, BH1750, BMP280) çalışma aralıklarını, hassasiyet değerlerini ve canlı değer okumalarını gösteren interaktif Gauge (ölçüm) çubukları.


* **🔔 Akıllı Uyarı Sistemi:** Belirlenen eşik değerleri aşıldığında otomatik tetiklenen (Kritik, Uyarı, Bilgi seviyelerinde) bildirimler (toast messages) ve filtrelenebilir uyarı geçmişi kaydı.


* **🗄️ Veri Yönetimi ve Tablolama:** Tüm okumaların kronolojik olarak tutulduğu, sayfalama ve kelime bazlı arama (filtreleme) destekli veri tablosu.


* **💾 Dışa Aktarma (Export):** Toplanan verileri veya uyarı geçmişini tek tıkla **CSV** ve **JSON** formatında bilgisayarınıza indirebilme.


* **⚙️ Kapsamlı Ayarlar Paneli:** Veri güncelleme aralığı (saniye), maksimum grafik noktası limiti, sensörlerin alt/üst limit eşikleri ve veri saklama kapasitesi gibi parametrelerin kullanıcı tarafından özelleştirilebilmesi.


* **🌗 Tema Desteği:** CSS değişkenleri kullanılarak hazırlanmış, tek tıkla geçiş yapılabilen Karanlık (Dark) ve Aydınlık (Light) tema seçenekleri.


* **📱 Tam Uyumlu Tasarım (Responsive):** Mobil cihazlar, tabletler ve masaüstü ekranlar için optimize edilmiş, katlanabilir yan menüye sahip esnek grid mimarisi.



## 🛠️ Kullanılan Teknolojiler

* **HTML5 & CSS3:** Özel CSS Değişkenleri (Custom Properties) ile modern, hızlı ve esnek stil yönetimi.


* **JavaScript (Vanilla JS):** Herhangi bir kütüphane (React, Vue vb.) veya yapılandırma aracına ihtiyaç duymayan, yüksek performanslı ve modülsüz saf JavaScript yapısı.


* **Chart.js (v4.4.4):** Yüksek performanslı ve animasyonlu veri görselleştirme altyapısı.


* **Font Awesome (v6.5.1):** Proje genelindeki vektörel ikon seti.


* **Google Fonts:** "Inter" (genel metinler) ve "JetBrains Mono" (sayısal veri gösterimleri) yazı tipleri.



## 📂 Dosya Yapısı

Proje oldukça sade ve anlaşılır bir yapıya sahiptir. Çalışması için sadece üç ana dosyaya ihtiyaç duyar:

* `index.html`: Uygulamanın ana iskeleti, DOM elementleri ve sayfa yapıları (Dashboard, Analiz, Ayarlar vb.).


* `style.css`: Tüm sayfa stilleri, karanlık/aydınlık tema renk değişkenleri, CSS animasyonları ve mobil uyumluluk (media queries) kuralları.


* `script.js`: Veri simülasyon motoru (timer), Chart.js entegrasyonu, sayfa yönlendirmeleri, DOM manipülasyonları, uyarı sistemi mantığı ve ayarların uygulandığı "State" yönetimi.



## 💻 Kurulum ve Kullanım

Bu proje tamamen tarayıcı (Client-Side) üzerinde çalışmaktadır, arka planda (Backend) bir derleyiciye (Webpack, Vite vs.) veya sunucuya (Node.js, Apache vb.) ihtiyaç duymaz.

1. İlgili dosyaları bilgisayarınıza indirin.
2. Aynı klasör içerisine `index.html`, `style.css` ve `script.js` dosyalarının bulunduğundan emin olun.


3. `index.html` dosyasını modern bir web tarayıcısında (Google Chrome, Firefox, Microsoft Edge, Safari vb.) çift tıklayarak açın.
4. Sol menüyü kullanarak paneller arasında gezinebilir, sağ üstteki çark ikonundan (Ayarlar) "Simülasyon Modu"nu aktif/pasif hale getirebilir veya tema rengini değiştirebilirsiniz.



## 🔌 Gerçek Donanım ile Kullanım (Geliştiriciler İçin Önemli)

Uygulama varsayılan olarak bir *Simülasyon Motoru* ile çalışmakta ve periyodik olarak rastgele mantıklı sensör verileri (Sıcaklık, Nem, Işık, Basınç) üretmektedir. Sistemi gerçek bir donanıma (Örn: ESP32 veya NodeMCU) entegre etmek isterseniz:

1. `script.js` dosyası içindeki `tick()` ve `seedData()` fonksiyonlarını bulun.


2. Bu kısımları silerek/yorum satırına alarak, verilerinizi bir **WebSocket** (örn: Socket.io) dinleyicisi veya bir **REST API** (`fetch()` / `setInterval()`) üzerinden çekecek şekilde güncelleyin.
3. Çektiğiniz verileri arayüzün beklediği formata (örn: `{ id, timestamp, temperature, humidity, light, pressure, status }`) dönüştürüp `STATE.data.push(e)` yöntemi ile sisteme dahil edin ve ardından arayüz tetikleyicilerini (örn: `updateDashboard(e)`) çağırın.
