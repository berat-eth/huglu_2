# Detaylı Analitik Servisi Entegrasyonu

## 📊 Genel Bakış

Mobil uygulamaya kapsamlı analitik veri toplama sistemi entegre edilmiştir. Bu sistem kullanıcı davranışlarını, performans metriklerini ve hata durumlarını detaylı şekilde takip eder.

## 🏗️ Mimari

### Backend Servisleri

1. **EventTracker** (`server/services/event-tracker.js`)
   - Tekil ve toplu event kaydetme
   - Session yönetimi
   - Event validasyonu
   - Otomatik temizleme

2. **Events Routes** (`server/routes/events.js`)
   - `POST /api/events/track` - Tekil event
   - `POST /api/events/batch` - Toplu event (max 100)
   - `POST /api/events/session/start` - Session başlatma
   - `POST /api/events/session/end` - Session bitirme

3. **Platform Brain Event Adapter** (`server/services/platform-brain/event-adapter.js`)
   - Mevcut backend aksiyonlarını normalize eder
   - Feature flag kontrolü ile aktif/pasif

### Mobil Uygulama Servisleri

1. **AnalyticsService** (`src/services/analytics.js`)
   - Singleton pattern ile tek instance
   - Otomatik session yönetimi
   - Batch event processing (20 event veya 30 saniye)
   - Device ID yönetimi
   - Performance tracking

2. **Analytics Hooks** (`src/hooks/useAnalytics.js`)
   - `useScreenTracking` - Ekran görüntüleme takibi
   - `usePerformanceTracking` - Performans metrikleri
   - `useScrollTracking` - Scroll derinliği takibi
   - `useErrorTracking` - Hata takibi
   - `useAnalytics` - Genel analytics fonksiyonları

## 📈 Track Edilen Event'ler

### Screen Events
- `screen_view` - Ekran görüntüleme
- `screen_exit` - Ekran çıkışı (otomatik)

### Product Events
- `product_view` - Ürün görüntüleme
- `add_to_cart` - Sepete ekleme
- `remove_from_cart` - Sepetten çıkarma
- `purchase` - Satın alma

### User Interaction Events
- `search` - Arama
- `filter` - Filtreleme
- `click` - Tıklama
- `scroll` - Scroll (her %25'te bir)

### System Events
- `error` - Hata durumları
- `performance` - Performans metrikleri

## 🔧 Kullanım Örnekleri

### 1. Screen Tracking

```javascript
import { useScreenTracking } from '../hooks/useAnalytics';

export default function HomeScreen({ navigation }) {
  useScreenTracking('HomeScreen', {
    category: 'main',
    section: 'home'
  });
  
  // Component kodları...
}
```

### 2. Product View Tracking

```javascript
import { useAnalytics } from '../hooks/useAnalytics';

export default function ProductDetailScreen({ navigation, route }) {
  const analytics = useAnalytics();
  
  useEffect(() => {
    if (product) {
      analytics.trackProductView(product.id, {
        name: product.name,
        categoryId: product.categoryId,
        price: product.price
      });
    }
  }, [product]);
}
```

### 3. Add to Cart Tracking

```javascript
const handleAddToCart = async () => {
  // ... cart logic ...
  
  if (success) {
    analytics.trackAddToCart(productId, quantity, price);
  }
};
```

### 4. Error Tracking

```javascript
import { useErrorTracking } from '../hooks/useAnalytics';

export default function MyComponent() {
  const { trackError } = useErrorTracking();
  
  try {
    // ... code ...
  } catch (error) {
    trackError(error, {
      action: 'fetch_data',
      context: 'home_screen'
    });
  }
}
```

### 5. Performance Tracking

```javascript
import { usePerformanceTracking } from '../hooks/useAnalytics';

export default function ProductDetailScreen() {
  usePerformanceTracking('product_detail_load');
  
  // Component otomatik olarak yükleme süresini track eder
}
```

### 6. Click Tracking

```javascript
import analyticsService from '../services/analytics';

const handleButtonClick = () => {
  analyticsService.trackClick('checkout_button', {
    screen: 'cart',
    value: cartTotal
  });
  
  // ... button logic ...
};
```

## 📊 Veri Yapısı

### Event Formatı

```javascript
{
  tenantId: 1,
  userId: 123,
  deviceId: "device_ios_1234567890_abc123",
  sessionId: "session_1234567890_xyz789",
  eventType: "product_view",
  screenName: "ProductDetailScreen",
  properties: {
    productId: 456,
    productName: "Ürün Adı",
    price: 99.99,
    timestamp: "2024-01-01T12:00:00.000Z"
  },
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

### Session Formatı

```javascript
{
  tenantId: 1,
  userId: 123,
  deviceId: "device_ios_1234567890_abc123",
  sessionId: "session_1234567890_xyz789",
  startTime: "2024-01-01T12:00:00.000Z",
  endTime: "2024-01-01T12:30:00.000Z",
  duration: 1800000, // milliseconds
  eventCount: 45,
  metadata: {
    platform: "ios",
    deviceModel: "iPhone 14 Pro",
    screenHistory: ["HomeScreen", "ProductDetailScreen"],
    performanceMetrics: {
      "product_detail_load_duration": { value: 250, unit: "ms" }
    }
  }
}
```

## 🚀 Otomatik Özellikler

### Batch Processing
- Event'ler otomatik olarak queue'ya eklenir
- 20 event'e ulaşıldığında veya 30 saniye geçtiğinde otomatik gönderilir
- Uygulama kapanırken kalan event'ler gönderilir

### Session Management
- Uygulama açıldığında otomatik session başlatılır
- Uygulama kapandığında otomatik session bitirilir
- Session ID her session için benzersizdir

### Device ID Management
- Her cihaz için benzersiz ID oluşturulur
- AsyncStorage'da saklanır
- Cihaz değişmediği sürece aynı kalır

### Error Handling
- Network hatalarında event'ler queue'da tutulur
- Başarısız gönderimler tekrar denenir
- Kritik olmayan hatalar sessizce loglanır

## 📱 Entegre Edilen Ekranlar

1. **HomeScreen**
   - Screen view tracking
   - Product click tracking (ProductSlider üzerinden)

2. **ProductDetailScreen**
   - Screen view tracking
   - Product view tracking
   - Add to cart tracking
   - Error tracking
   - Performance tracking

3. **ProductSlider Component**
   - Product click tracking

## 🔄 Gelecek Entegrasyonlar

Aşağıdaki ekranlara da entegrasyon eklenebilir:

- CartScreen - Sepet görüntüleme, ürün çıkarma
- CheckoutScreen - Checkout süreci, ödeme
- SearchScreen - Arama tracking
- CategoryScreen - Kategori görüntüleme
- ProfileScreen - Profil görüntüleme
- OrderScreen - Sipariş görüntüleme

## 📝 Notlar

- Analytics servisi non-blocking çalışır
- Event tracking performansı etkilemez
- Batch processing ile network trafiği optimize edilir
- Session metadata'sında screen history ve performance metrics saklanır
- Tüm event'ler backend'de `user_events` tablosunda saklanır
- Session'lar `user_sessions_v2` tablosunda saklanır

## 🛠️ Geliştirme

### Yeni Event Type Ekleme

1. `server/services/event-tracker.js` içinde `validEventTypes` array'ine ekle
2. `src/services/analytics.js` içinde ilgili tracking metodunu ekle
3. İlgili ekran/component'te kullan

### Yeni Hook Ekleme

1. `src/hooks/useAnalytics.js` içinde yeni hook'u ekle
2. İlgili ekranlarda kullan

## 📊 Admin Panel Entegrasyonu

Analitik veriler admin panelde (`admin-panel/components/Analytics.tsx`) görüntülenebilir:

- Overview metrics
- User analytics
- Behavior analytics
- Funnel analysis
- Performance metrics
- Time series data

