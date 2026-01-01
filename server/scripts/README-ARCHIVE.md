# Canlı Destek Mesajları Otomatik Arşivleme Sistemi

Bu sistem, 24 saatten eski canlı destek mesajlarını otomatik olarak JSON dosyalarına arşivler ve veritabanından temizler.

## Özellikler

- ✅ 24 saatten eski mesajları otomatik bulur
- ✅ Mesajları tarih bazlı JSON dosyalarına kaydeder
- ✅ Veritabanından eski mesajları temizler
- ✅ Her gün saat 02:00'de otomatik çalışır
- ✅ Duplicate mesajları önler
- ✅ Arşiv özet dosyası oluşturur

## Arşiv Yapısı

Arşiv dosyaları `server/data/archives/live-support/` klasöründe saklanır:

```
server/data/archives/live-support/
├── live-support-2024-01-15.json
├── live-support-2024-01-16.json
├── archive-summary-2024-01-17.json
└── ...
```

### JSON Dosya Formatı

Her günlük arşiv dosyası şu formattadır:

```json
{
  "archiveDate": "2024-01-17T02:00:00.000Z",
  "date": "2024-01-15",
  "totalMessages": 150,
  "messages": [
    {
      "id": 123,
      "tenantId": 1,
      "userId": 456,
      "userName": "Ahmet Yılmaz",
      "userEmail": "ahmet@example.com",
      "userPhone": "+905551234567",
      "message": "Merhaba, yardıma ihtiyacım var",
      "intent": "live_support",
      "satisfaction": null,
      "productId": null,
      "productName": null,
      "productPrice": null,
      "productImage": null,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Kullanım

### Otomatik Çalıştırma

Sistem otomatik olarak her gün saat 02:00'de çalışır (İstanbul saat dilimi). Sunucu başlatıldığında cron job otomatik olarak başlar.

### Manuel Çalıştırma

Script'i manuel olarak çalıştırmak için:

```bash
cd server/scripts
node archive-live-support-messages.js
```

### Startup'ta Çalıştırma

Sunucu başlatıldığında hemen arşivleme yapmak için `.env` dosyasına ekleyin:

```env
ARCHIVE_ON_STARTUP=true
```

## Cron Job Ayarları

Cron job ayarları `server/server.js` dosyasında tanımlıdır:

```javascript
// Her gün saat 02:00'de çalışır
cron.schedule('0 2 * * *', async () => {
  // Arşivleme işlemi
}, {
  scheduled: true,
  timezone: 'Europe/Istanbul'
});
```

Cron zamanlamasını değiştirmek için:
- `'0 2 * * *'` - Her gün saat 02:00
- `'0 */6 * * *'` - Her 6 saatte bir
- `'0 0 * * 0'` - Her Pazar gecesi saat 00:00

## Güvenlik

- Arşiv dosyaları sadece sunucuda saklanır
- Veritabanından silinen mesajlar geri alınamaz (yedekleme önerilir)
- Arşiv klasörü otomatik oluşturulur

## Sorun Giderme

### Arşiv klasörü oluşturulamıyor

Klasör izinlerini kontrol edin:
```bash
chmod -R 755 server/data/archives/
```

### Cron job çalışmıyor

1. Sunucu loglarını kontrol edin
2. `node-cron` paketinin yüklü olduğundan emin olun
3. Timezone ayarlarını kontrol edin

### Mesajlar silinmiyor

1. Veritabanı bağlantısını kontrol edin
2. `chatbot_analytics` tablosunun yapısını kontrol edin
3. Timestamp alanının doğru formatlandığından emin olun

## Notlar

- Arşivleme işlemi sırasında veritabanı bağlantısı kullanılır
- Büyük miktarda mesaj varsa işlem biraz zaman alabilir
- Arşiv dosyaları kalıcı olarak saklanır (manuel silinmedikçe)
- Her gün için ayrı bir JSON dosyası oluşturulur




