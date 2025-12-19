# Mobil Uygulama API Endpointleri

Bu dokümanda mobil uygulamanın kullandığı tüm API endpointleri listelenmiştir.

**Base URL:** `https://api.huglutekstil.com/api`

---

## 📱 Genel Endpointler

### Health Check
- **GET** `/health` - Sunucu sağlık kontrolü

### Bakım Modu
- **GET** `/maintenance/status?platform=mobile` - Bakım modu durumu kontrolü

---

## 👤 Kullanıcı İşlemleri (User)

### Kimlik Doğrulama
- **POST** `/users` - Yeni kullanıcı kaydı (register)
- **POST** `/users/login` - Kullanıcı giriş
- **GET** `/users/:userId` - Kullanıcı bilgilerini getir
- **PUT** `/users/:userId` - Kullanıcı bilgilerini güncelle
  - Body: `{ name, email, phone, dateOfBirth, height, weight }`

### Kullanıcı Profili
- **GET** `/users/:userId/homepage-products` - Kullanıcıya özel anasayfa ürünleri
- **GET** `/users/:userId/purchases/:productId` - Kullanıcının belirli ürünü satın alma kontrolü
- **GET** `/users/:userId/purchases` - Kullanıcının tüm satın almaları
- **GET** `/users/search` - Kullanıcı arama (transfer için)

### Favoriler
- **GET** `/favorites/user/:userId` - Kullanıcının favori ürünleri
- **POST** `/favorites` - Favorilere ürün ekle
  - Body: `{ userId, productId }`
- **DELETE** `/favorites/:favoriteId` - Favorilerden ürün çıkar
- **DELETE** `/favorites/:favoriteId` - Favorilerden ürün çıkar

---

## 🛍️ Ürün İşlemleri (Product)

### Ürün Listeleme
- **GET** `/products` - Tüm ürünleri getir (pagination destekli)
- **GET** `/products/:productId` - Belirli bir ürünü getir
- **GET** `/products/category/:category` - Kategoriye göre ürünleri getir
- **GET** `/products/search` - Ürün arama
- **GET** `/products/filter` - Ürün filtreleme

### Ürün Varyasyonları
- **GET** `/products/:productId/variations` - Ürün varyasyonlarını getir

### Kategoriler ve Markalar
- **GET** `/categories` - Tüm kategorileri getir
- **GET** `/brands` - Tüm markaları getir
- **GET** `/products/price-range` - Fiyat aralığını getir

---

## 🛒 Sepet İşlemleri (Cart)

### Sepet Yönetimi
- **GET** `/cart/:userId` - Kullanıcının sepetini getir
  - Response: `{ success: true, cart: { items: [...], totalAmount: 0 } }`
  
- **POST** `/cart` - Sepete ürün ekle
  - Body: `{ userId, productId, quantity, selectedVariations }`
  - Response: `{ success: true, message: "Ürün sepete eklendi" }`
  
- **PUT** `/cart/:cartItemId` - Sepetteki ürün miktarını güncelle
  - Body: `{ quantity }`
  - Response: `{ success: true, message: "Miktar güncellendi" }`
  
- **DELETE** `/cart/:cartItemId` - Sepetten ürün çıkar
  - Response: `{ success: true, message: "Ürün sepetten çıkarıldı" }`
  
- **DELETE** `/cart/user/:userId` - Sepeti temizle
  - Response: `{ success: true, message: "Sepet temizlendi" }`

### Sepet Bilgileri
- **GET** `/cart/:userId/total` - Sepet toplamını getir
  - Response: `{ success: true, total: 0, itemCount: 0 }`
  
- **POST** `/cart/check-before-logout` - Çıkış öncesi sepet kontrolü
  - Body: `{ userId }`
  - Response: `{ success: true, hasItems: true, itemCount: 3 }`

---

## 📦 Sipariş İşlemleri (Order)

### Sipariş Yönetimi
- **POST** `/orders` - Yeni sipariş oluştur
- **GET** `/orders/user/:userId` - Kullanıcının siparişlerini getir
- **GET** `/orders/:orderId` - Belirli bir siparişi getir
- **PUT** `/orders/:orderId/cancel` - Siparişi iptal et
- **PUT** `/orders/:orderId/status` - Sipariş durumunu güncelle

### Faturalar
- **GET** `/invoices/:userId` - Kullanıcının faturaları
- **GET** `/billing/invoices/:userId` - Fatura bilgileri
- **GET** `/orders/:userId/invoices` - Sipariş faturaları

---

## 💰 Cüzdan İşlemleri (Wallet)

### Bakiye ve İşlemler
- **GET** `/wallet/balance/:userId` - Kullanıcının cüzdan bakiyesi
- **GET** `/wallet/transactions/:userId` - Cüzdan işlem geçmişi
- **POST** `/wallet/recharge-request` - Bakiye yükleme talebi
- **POST** `/wallet/gift-card` - Hediye kartı kullanımı
- **GET** `/wallet/transfers` - Transfer geçmişi

---

## ⭐ Yorum İşlemleri (Review)

- **GET** `/products/:productId/reviews` - Ürün yorumlarını getir
- **POST** `/reviews` - Yeni yorum ekle
- **PUT** `/reviews/:reviewId` - Yorumu güncelle
- **DELETE** `/reviews/:reviewId` - Yorumu sil

---

## ❓ Ürün Soru-Cevap İşlemleri (Product Questions)

### Soru Yönetimi
- **GET** `/product-questions?productId=:productId` - Ürün sorularını getir
  - Query: `?productId=123`
  - Response: `{ success: true, data: [...] }`
  
- **POST** `/product-questions` - Yeni soru sor
  - Body: `{ productId, userId, question }`
  - Response: `{ success: true, data: { id, productId, userId, question, createdAt } }`

### Cevap Yönetimi
- **POST** `/product-questions/:questionId/answer` - Soruya cevap ver
  - Body: `{ answer, answeredBy }`
  - Response: `{ success: true, message: "Cevap eklendi" }`

### Diğer İşlemler
- **DELETE** `/product-questions/:questionId` - Soruyu sil
- **POST** `/product-questions/:questionId/helpful` - Soruyu faydalı işaretle
  - Body: `{ userId }`

---

## 🎯 Kampanya İşlemleri (Campaign)

### Müşteri Segmentasyonu
- **GET** `/campaigns/segments` - Müşteri segmentlerini getir
- **POST** `/campaigns/segments` - Yeni segment oluştur
- **PUT** `/campaigns/segments/:segmentId` - Segment güncelle

### Kampanya Yönetimi
- **GET** `/campaigns` - Tüm kampanyaları getir
- **GET** `/campaigns/available/:userId` - Kullanıcıya uygun kampanyalar
- **POST** `/campaigns` - Yeni kampanya oluştur
- **PUT** `/campaigns/:campaignId` - Kampanya güncelle
- **POST** `/campaigns/usage` - Kampanya kullanımı kaydet

### Ürün Önerileri
- **GET** `/recommendations/user/:userId` - Kullanıcıya özel ürün önerileri

---

## 🔔 Bildirim İşlemleri (Notification)

- **POST** `/notifications/system` - Sistem bildirimi oluştur
- **PUT** `/notifications/:notificationId/read` - Bildirimi okundu işaretle
- **PUT** `/notifications/read-all` - Tüm bildirimleri okundu işaretle

---

## 🔄 İade İşlemleri (Return)

- **GET** `/returns/user/:userId` - Kullanıcının iade talepleri
- **GET** `/returns/returnable-orders/:userId` - İade edilebilir siparişler
- **POST** `/returns` - Yeni iade talebi oluştur
- **PUT** `/returns/:returnRequestId/cancel` - İade talebini iptal et

---

## 🎁 Özel Üretim (Custom Production)

- **GET** `/custom-production/requests/:userId` - Kullanıcının özel üretim talepleri
- **GET** `/custom-production/requests/:requestId` - Belirli bir talebi getir
- **POST** `/custom-production/requests` - Yeni özel üretim talebi
- **PUT** `/custom-production/requests/:requestId` - Talebi güncelle

---

## 🏢 Bayilik Başvuruları (Dealership)

- **GET** `/dealership/applications/user/:email` - Kullanıcının bayilik başvuruları
- **GET** `/dealership/applications/:id/user/:email` - Belirli bir başvuruyu getir
- **POST** `/dealership/applications` - Yeni bayilik başvurusu

---

## 📊 Kullanıcı Seviyesi (User Level)

- **GET** `/user-level/:userId` - Kullanıcının seviye bilgileri
- **GET** `/user-level/:userId/history` - EXP geçmişi
- **GET** `/user-level/:userId/stats` - Seviye istatistikleri
- **POST** `/user-level/:userId/add-exp` - EXP ekle
- **POST** `/user-level/:userId/purchase-exp` - Alışveriş EXP'si ekle
- **POST** `/user-level/:userId/invitation-exp` - Davet EXP'si ekle
- **POST** `/user-level/:userId/social-share-exp` - Sosyal paylaşım EXP'si ekle
- **POST** `/user-level/:userId/claim-rewards` - Seviye ödüllerini al

---

## 🎡 Flash İndirimler (Flash Deals)

- **GET** `/flash-deals` - Aktif flash indirimleri getir

---

## 📸 Sosyal Medya (Social)

### Instagram Hikayeleri
- **GET** `/social/instagram/stories` - Instagram hikayelerini getir
- **POST** `/social/instagram/stories/:storyId/seen` - Hikayeyi görüldü işaretle

---

## 🎨 Admin İçerik Yönetimi

### Slider'lar
- **GET** `/sliders` - Slider'ları getir

### Popup'lar
- **GET** `/popups` - Popup'ları getir
- **POST** `/popups/:popupId/stats` - Popup istatistikleri (view/click/dismissal)

### Hikayeler (Stories)
- **GET** `/stories` - Hikayeleri getir
- **GET** `/admin/stories/all` - Tüm hikayeleri getir (admin)
- **POST** `/admin/stories` - Yeni hikaye oluştur
- **PUT** `/admin/stories/:storyId` - Hikaye güncelle
- **DELETE** `/admin/stories/:storyId` - Hikaye sil
- **PATCH** `/admin/stories/:storyId/toggle` - Hikaye durumunu değiştir
- **PATCH** `/admin/stories/reorder` - Hikayeleri yeniden sırala

---

## 🤖 Chatbot

- **POST** `/chatbot/message` - Chatbot'a mesaj gönder
- **POST** `/chatbot/analytics` - Chatbot analitik verisi gönder

---

## 🧠 AI Servisleri

### Ollama (AI Model)
- **POST** `/ollama/generate` - AI model ile metin üret

---

## 📍 Canlı Kullanıcı Takibi (Live Users)

- **POST** `/live-users` - Kullanıcı aktivitesi kaydet
- **PATCH** `/live-users/:sessionId` - Oturum güncelle

---

## 📊 Kullanıcı Davranış Takibi (User Behavior)

- **POST** `/user-data/behavior/track` - Kullanıcı davranışı kaydet
- **POST** `/user-data/behavior/session/start` - Oturum başlat

---

## 🎯 Özel Kampanya Türleri

### İndirim Çarkı (Discount Wheel)
- **GET** `/discount-wheel/user/:userId` - Kullanıcının çark durumu
- **POST** `/discount-wheel/spin` - Çarkı çevir
- **POST** `/discount-wheel/claim` - Ödülü al

### Grup İndirimleri (Group Discount)
- **GET** `/group-discount/active` - Aktif grup indirimleri
- **POST** `/group-discount/join` - Grup indiriminekatıl

### Birlikte Al Kampanyaları (Buy Together)
- **GET** `/buy-together/product/:productId` - Ürün için birlikte al önerileri

### Alışveriş Yarışmaları (Shopping Competition)
- **GET** `/shopping-competition/active` - Aktif yarışmalar
- **POST** `/shopping-competition/join` - Yarışmaya katıl

---

## 🎁 Referans Sistemi (Referral)

- **GET** `/referral/:userId` - Kullanıcının referans bilgileri
- **POST** `/referral/track` - Referans takibi

---

## 📱 Sosyal Paylaşım

- **POST** `/social-sharing/track` - Sosyal paylaşım takibi
- **GET** `/social-sharing/stats/:userId` - Kullanıcının paylaşım istatistikleri

---

## 🌍 Topluluk (Community/UGC)

### Gönderi İşlemleri
- **GET** `/community/posts` - Tüm gönderileri getir (pagination destekli)
  - Query: `?page=1&limit=10&category=Hiking`
- **GET** `/community/posts/:postId` - Belirli bir gönderiyi getir
- **POST** `/community/posts` - Yeni gönderi oluştur
  - Body: `{ userId, image, caption, location, category, productId, hashtags }`
- **PUT** `/community/posts/:postId` - Gönderiyi güncelle
- **DELETE** `/community/posts/:postId` - Gönderiyi sil

### Etkileşim İşlemleri
- **POST** `/community/posts/:postId/like` - Gönderiyi beğen
- **DELETE** `/community/posts/:postId/like` - Beğeniyi geri al
- **POST** `/community/posts/:postId/comment` - Yorum ekle
  - Body: `{ userId, comment }`
- **GET** `/community/posts/:postId/comments` - Yorumları getir
- **DELETE** `/community/comments/:commentId` - Yorumu sil

### Kullanıcı İşlemleri
- **GET** `/community/users/:userId/posts` - Kullanıcının gönderileri
- **POST** `/community/users/:userId/follow` - Kullanıcıyı takip et
- **DELETE** `/community/users/:userId/follow` - Takibi bırak
- **GET** `/community/users/:userId/followers` - Takipçileri getir
- **GET** `/community/users/:userId/following` - Takip edilenleri getir

---

## 🔐 Güvenlik ve Kimlik Doğrulama

### API Anahtarları
Tüm isteklerde aşağıdaki header'lar kullanılır:
```
X-API-Key: [API_KEY]
X-Tenant-Id: [TENANT_ID]
Authorization: Bearer [API_KEY]
Content-Type: application/json
Accept: application/json
```

---

## 📝 Notlar

1. **Pagination**: Çoğu liste endpoint'i `page` ve `limit` parametrelerini destekler
2. **Filtreleme**: Ürün listeleme endpoint'leri çeşitli filtre parametrelerini destekler
3. **Offline Desteği**: Uygulama offline modda çalışabilir ve istekleri kuyruğa alır
4. **Cache**: Sık kullanılan veriler cache'lenir (15 dakika TTL)
5. **Error Handling**: Tüm endpoint'ler standart hata formatı döner:
   ```json
   {
     "success": false,
     "message": "Hata mesajı",
     "error": "Detaylı hata"
   }
   ```

---

## 🔄 Yanıt Formatı

Başarılı yanıtlar:
```json
{
  "success": true,
  "data": { ... },
  "message": "İşlem başarılı"
}
```

Hatalı yanıtlar:
```json
{
  "success": false,
  "message": "Hata mesajı",
  "error": "Detaylı hata açıklaması"
}
```

---

**Son Güncelleme:** 17 Aralık 2024
