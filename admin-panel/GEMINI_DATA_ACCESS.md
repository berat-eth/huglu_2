# Gemini API - Erişilebilir Veri Türleri

## 📊 Gemini API'nin İşleyebileceği Veri Türleri

### 1. **Metin Verileri** ✅
- **Düz metin**: Herhangi bir metin içeriği
- **JSON verileri**: API yanıtları, veritabanı sonuçları
- **HTML içerik**: Web sayfaları, e-posta şablonları
- **Kod**: Programlama dilleri, SQL sorguları
- **Markdown**: Dokümantasyon, notlar

### 2. **Dosya Yükleme (Multimodal)** ✅
Gemini API aşağıdaki dosya türlerini destekler:

#### **Görsel Dosyalar**
- `image/jpeg` - JPEG resimler
- `image/png` - PNG resimler
- `image/gif` - GIF animasyonlar
- `image/webp` - WebP resimler
- `image/heic` - HEIC resimler

#### **Döküman Dosyaları**
- `application/pdf` - PDF dosyaları
- `text/plain` - Metin dosyaları
- `text/csv` - CSV verileri
- `text/html` - HTML dosyaları
- `application/json` - JSON dosyaları

#### **Office Dosyaları**
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - Word (.docx)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - Excel (.xlsx)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` - PowerPoint (.pptx)

### 3. **Projede Kullanılan Veri Kaynakları**

#### **ProjectAjax Sayfası - Otomatik Veri Çekme**

Gemini, kullanıcı mesajına göre otomatik olarak aşağıdaki API'lerden veri çekiyor:

##### **Satış Verileri**
- **Endpoint**: `/api/admin/orders`
- **Tetikleyici**: "satış", "trend", "analiz" kelimeleri
- **Veri**: Sipariş ID, toplam tutar, durum, oluşturulma tarihi
- **Kullanım**: Satış analizi, trend raporları

##### **Ürün Verileri**
- **Endpoint**: `/api/products`
- **Tetikleyici**: "ürün", "product", "stok" kelimeleri
- **Veri**: Ürün ID, isim, fiyat, stok, kategori
- **Kullanım**: Ürün önerileri, stok analizi

##### **Müşteri Verileri**
- **Endpoint**: `/api/admin/users`
- **Tetikleyici**: "müşteri", "customer", "segment" kelimeleri
- **Veri**: Müşteri ID, isim, e-posta, kayıt tarihi
- **Kullanım**: Müşteri segmentasyonu, analiz

##### **Kategori Verileri**
- **Endpoint**: `/api/categories`
- **Tetikleyici**: "kategori", "category", "kamp" kelimeleri
- **Veri**: Kategori bilgileri
- **Kullanım**: Kategori analizi, kampanya önerileri

##### **Stok Verileri**
- **Endpoint**: `/api/products/low-stock`
- **Tetikleyici**: "stok", "stock", "düşük" kelimeleri
- **Veri**: Düşük stoklu ürünler
- **Kullanım**: Stok uyarıları, sipariş önerileri

#### **Ticimax Sipariş Verileri**
- **Endpoint**: `/api/admin/ticimax-orders`
- **Tetikleyici**: "ticimax", "ticimax sipariş" kelimeleri
- **Veri**: Ticimax sipariş ID, harici sipariş ID, sipariş numarası, toplam tutar, durum, müşteri bilgileri, şehir, ilçe, sipariş tarihi
- **Kullanım**: Ticimax sipariş analizi, raporlama

#### **Trendyol Sipariş Verileri**
- **Endpoint**: `/api/admin/marketplace-orders?provider=trendyol`
- **Tetikleyici**: "trendyol", "trendyol sipariş" kelimeleri
- **Veri**: Trendyol sipariş ID, harici sipariş ID, toplam tutar, durum, müşteri bilgileri, şehir, ilçe, senkronizasyon tarihi
- **Kullanım**: Trendyol sipariş analizi, performans takibi

#### **Hepsiburada Sipariş Verileri**
- **Endpoint**: `/api/admin/hepsiburada-orders`
- **Tetikleyici**: "hepsiburada", "hepsiburada sipariş", "hepsi burada" kelimeleri
- **Veri**: Hepsiburada sipariş ID, harici sipariş ID, toplam tutar, durum, müşteri bilgileri, şehir, ilçe, senkronizasyon tarihi
- **Kullanım**: Hepsiburada sipariş analizi, raporlama

#### **Tüm Marketplace Siparişleri**
- **Endpoint**: Tüm marketplace endpoint'leri paralel olarak çağrılır
- **Tetikleyici**: "marketplace", "pazaryeri", "tüm sipariş", "hepsi sipariş" kelimeleri
- **Veri**: Ticimax, Trendyol ve Hepsiburada sipariş verilerinin birleşik özeti
- **Kullanım**: Marketplace karşılaştırması, genel sipariş analizi

### 4. **Veri İşleme Özellikleri**

#### **Metin İşleme**
- ✅ Uzun metin analizi (max 8192 token)
- ✅ Çoklu dil desteği (Türkçe dahil)
- ✅ Kod analizi ve öneriler
- ✅ Veri formatlama ve dönüştürme

#### **Görsel İşleme**
- ✅ Görsel analizi ve açıklama
- ✅ OCR (metin tanıma)
- ✅ Görsel içerik anlama
- ✅ Ürün görseli analizi

#### **Döküman İşleme**
- ✅ PDF içerik analizi
- ✅ Excel/CSV veri analizi
- ✅ Word doküman işleme
- ✅ Tablo verilerini anlama

### 5. **Veri Limitleri**

#### **Token Limitleri**
- **gemini-2.5-flash**: 8192 token (giriş + çıkış)
- **gemini-3-flash-preview**: 8192+ token
- **gemini-2.5-flash-lite**: Daha küçük limit

#### **Dosya Boyutu Limitleri**
- **Görsel**: Maksimum 20MB
- **PDF**: Maksimum 20MB
- **Toplam**: İstek başına birden fazla dosya gönderilebilir

### 6. **Projede Kullanım Örnekleri**

#### **Örnek 1: Satış Analizi**
```
Kullanıcı: "Bu ayın satış analizini yap"
Gemini Alır:
- Satış API'sinden son siparişler
- Tarih, tutar, durum bilgileri
- Analiz ve öneriler üretir
```

#### **Örnek 2: Ürün Görseli Analizi**
```
Kullanıcı: [Ürün görseli yükler] "Bu ürün hakkında bilgi ver"
Gemini Alır:
- Görsel dosyası (base64)
- Görsel analizi yapar
- Ürün özelliklerini çıkarır
```

#### **Örnek 3: E-posta Oluşturma**
```
Kullanıcı: "Yeni ürün lansmanı için e-posta oluştur"
Gemini Alır:
- Ürün verileri (API'den)
- E-posta şablon gereksinimleri
- HTML e-posta kodu üretir
```

#### **Örnek 4: Ticimax Sipariş Analizi**
```
Kullanıcı: "Ticimax siparişlerini analiz et"
Gemini Alır:
- Ticimax sipariş API'sinden son siparişler
- Sipariş durumları, tutarlar, müşteri bilgileri
- Analiz ve öneriler üretir
```

#### **Örnek 5: Marketplace Karşılaştırması**
```
Kullanıcı: "Tüm marketplace siparişlerini karşılaştır"
Gemini Alır:
- Ticimax, Trendyol ve Hepsiburada sipariş verileri
- Platform bazlı karşılaştırma
- Performans analizi ve öneriler
```

### 7. **Veri Güvenliği**

- ✅ API key server-side'da saklanıyor
- ✅ Hassas veriler filtreleniyor
- ✅ Dosyalar base64 encoding ile güvenli gönderiliyor
- ✅ CSP kuralları ile güvenlik sağlanıyor

### 8. **Kullanım Senaryoları**

1. **Veri Analizi**: API'lerden gelen verileri analiz etme
2. **Rapor Oluşturma**: Verilerden otomatik rapor üretme
3. **Görsel Analizi**: Ürün görsellerini analiz etme
4. **Döküman İşleme**: PDF, Excel dosyalarını işleme
5. **E-posta Oluşturma**: Pazarlama e-postaları oluşturma
6. **Kod Üretme**: SQL, HTML, JavaScript kodu üretme

### 9. **Sınırlamalar**

- ❌ Gerçek zamanlı veritabanı erişimi yok (sadece API üzerinden)
- ❌ Dosya sistemi erişimi yok
- ❌ İnternet tarama özelliği yok (sadece verilen veriler)
- ❌ Canlı web sayfası erişimi yok

### 10. **Gelecek Geliştirmeler**

- 📊 Daha fazla API endpoint entegrasyonu
- 📁 Daha fazla dosya formatı desteği
- 🔄 Gerçek zamanlı veri akışı
- 📈 Gelişmiş analitik özellikler

