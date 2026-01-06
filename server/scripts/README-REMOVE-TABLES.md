# Gereksiz Tabloları Kaldırma Script'i

Bu script, veritabanındaki gereksiz tabloları güvenli bir şekilde kaldırmak için kullanılır.

## Özellikler

- ✅ Tüm tabloları listeler (satır sayısı ve boyut bilgisiyle)
- ✅ Kritik tabloları korur (users, products, orders vb.)
- ✅ Foreign key bağımlılıklarını kontrol eder
- ✅ Backup oluşturma seçeneği
- ✅ Manuel veya toplu silme modları
- ✅ Dosyadan tablo listesi okuma desteği

## ML Analiz Sistemi Tabloları

Script, artık kullanılmayan ML analiz sistemi tablolarını otomatik olarak tespit eder ve özel olarak işaretler:

- `customer_analytics` - Müşteri analitikleri
- `chatbot_analytics` - Chatbot analitikleri
- `recommendations` - ML tabanlı ürün önerileri
- `analytics_events` - Analitik eventler
- `analytics_sessions` - Analitik oturumlar
- `analytics_funnels` - Conversion funnel analizi
- `analytics_cohorts` - Kullanıcı kohort analizi
- `analytics_reports` - Oluşturulan raporlar
- `analytics_alerts` - Metrik bazlı uyarılar
- `analytics_aggregates` - Günlük/haftalık özet veriler
- `device_analytics_aggregates` - Cihaz analitik özetleri
- `user_behavior_events` - Kullanıcı davranış eventleri
- `user_sessions` - Eski kullanıcı oturumları
- `anonymous_devices` - Anonim cihazlar
- `user_events` - Kullanıcı eventleri

Bu tablolar script çalıştığında özel bir kategori olarak gösterilir ve tek seferde silinebilir.

## Kullanım

### 1. ML Analiz Tablolarını Otomatik Silme (Önerilen)

```bash
cd server/scripts
node remove-unused-tables.js
```

Script çalıştığında:
1. Tüm tablolar listelenir (ML analiz tabloları özel kategori olarak gösterilir)
2. Mod seçiminde `5` seçeneğini seçin
3. ML analiz tabloları otomatik olarak seçilir
4. Onay verin ve tablolar silinir

### 2. Manuel Seçim Modu

```bash
cd server/scripts
node remove-unused-tables.js
```

Script çalıştığında:
1. Tüm tablolar listelenir
2. Her tablo için tek tek onay istenir
3. Backup oluşturma seçeneği sunulur
4. Seçilen tablolar silinir

### 2. Toplu Silme Modu

```bash
node remove-unused-tables.js
```

Mod seçiminde `2` seçeneğini seçin ve silinecek tablo numaralarını girin:
```
Silinecek tablo numaralarını girin (virgülle ayırın, örn: 1,3,5): 1,3,5
```

### 3. Dosyadan Okuma Modu

1. `tables-to-delete.txt` dosyasını düzenleyin
2. Silinecek tablo adlarını her satıra bir tane yazın
3. Script'i çalıştırın ve mod seçiminde `3` seçeneğini seçin

**Örnek `tables-to-delete.txt`:**
```
# Eski tablolar
old_orders
old_users
temp_data

# Test tabloları
test_products
dev_cart
```

## Kritik Tablolar

Aşağıdaki tablolar otomatik olarak korunur ve silinemez:

- `tenants`
- `users`
- `user_addresses`
- `products`
- `product_variations`
- `product_variation_options`
- `cart`
- `orders`
- `order_items`
- `reviews`
- `user_wallets`
- `wallet_transactions`
- `payment_transactions`
- `invoices`
- `return_requests`
- `categories`

## Güvenlik Özellikleri

1. **Kritik Tablo Koruması**: Kritik tablolar asla silinmez
2. **Foreign Key Kontrolü**: Başka tablolar tarafından referans edilen tablolar uyarı verir
3. **Backup Seçeneği**: Silmeden önce backup oluşturma seçeneği
4. **Onay Mekanizması**: Her işlem için kullanıcı onayı gerekir
5. **Hata Yönetimi**: Hatalar yakalanır ve raporlanır

## Backup

Backup'lar `server/scripts/backups/` klasörüne kaydedilir. Her backup dosyası timestamp içerir:
```
backup_1703123456789.sql
```

## Örnek Çıktı

```
🔌 Veritabanına bağlanılıyor...
✅ Veritabanı bağlantısı başarılı

📋 Tüm tablolar listeleniyor...

═══════════════════════════════════════════════════════════
📊 VERİTABANI TABLOLARI
═══════════════════════════════════════════════════════════

🔴 KRİTİK TABLOLAR (16 adet) - SİLİNMEYECEK:
   • tenants                                    0 satır |     0.00 MB
   • users                                   1250 satır |     2.45 MB
   ...

📦 DİĞER TABLOLAR (25 adet):
     1. old_orders                             150 satır |     0.50 MB
     2. temp_data                                0 satır |     0.00 MB
     ...
```

## Notlar

- ⚠️ Bu işlem geri alınamaz! Mutlaka backup alın.
- ⚠️ Production ortamında kullanmadan önce test edin.
- ⚠️ Foreign key bağımlılıkları olan tabloları silmek için `force` parametresi gerekebilir.

## Sorun Giderme

### "Tablo başka tablolar tarafından referans ediliyor" hatası

Bu durumda:
1. Önce bağımlı tabloları silin
2. Veya foreign key'leri kaldırın
3. Veya script'i `force` modunda çalıştırın (kod değişikliği gerekir)

### Backup oluşturulamıyor

- `backups/` klasörünün yazma izni olduğundan emin olun
- Disk alanını kontrol edin

