# UI Tasarımları - Outdoor Shop Mobile App

Bu klasör, Outdoor Shop mobil uygulamasının tüm ekran tasarımlarını içermektedir.

## 📱 Mevcut Ekranlar

### ✅ Tamamlanmış Tasarımlar

1. **Ana Sayfa** (`home_screen/`)
   - Kullanıcı karşılama
   - Arama çubuğu
   - Hero carousel
   - Kategori chipleri
   - Yeni ürünler grid
   - Alt navigasyon

2. **Giriş Ekranı** (`login_screen/`)
   - Email/şifre girişi
   - Sosyal medya girişi (Google, Apple)
   - Şifremi unuttum linki

3. **Kayıt Ekranı** (`sign_up_screen/`)
   - Tam ad, email, şifre alanları
   - Şartlar ve koşullar onayı
   - Sosyal medya kayıt seçenekleri

4. **Ürün Listeleme** (`product_listing_screen/`)
   - Arama ve filtre
   - Kategori chipleri
   - Grid layout ürün kartları
   - Favori ekleme

5. **Ürün Detay** (`product_detail_screen/`)
   - Ürün görselleri carousel
   - Renk ve beden seçimi
   - Ürün özellikleri
   - Yorumlar bölümü
   - Sepete ekle butonu

6. **Sepet Ekranı** (`shopping_cart_screen_1/` & `shopping_cart_screen_2/`)
   - Giriş yapılmış/yapılmamış versiyonlar
   - Ürün miktarı ayarlama
   - Promosyon kodu girişi
   - Sipariş özeti
   - Ücretsiz kargo göstergesi

7. **İstek Listesi** (`wishlist_screen_with_sharing/`)
   - Favori ürünler listesi
   - Kategori filtreleme
   - Paylaşma özelliği
   - Sepete hızlı ekleme

8. **Kullanıcı Profili** (`user_profile_screen/`)
   - Profil bilgileri
   - Siparişler, favoriler, kuponlar
   - Hesap ayarları
   - Uygulama ayarları

9. **Ayarlar** (`settings_&_preferences_screen/`)
   - Alışveriş tercihleri
   - Bildirimler
   - Konum servisleri
   - Tema/görünüm
   - Güvenlik ayarları

10. **Cüzdan** (`wallet_screen/`)
    - Sadakat kartı
    - Ödeme yöntemleri
    - Hediye kartları ve kuponlar

11. **Flash Deals** (`flash deal/`)
    - Geri sayım sayacı
    - İndirimli ürünler
    - Stok göstergesi
    - Kategori filtreleme

12. **Kampanyalar** (`campaigns_&_discount_codes/`)
    - Aktif promosyonlar
    - Kupon kartları
    - İndirim kodları
    - Süre sonu bildirimleri

13. **Referans Programı** (`referral_screen/`)
    - Referans kodu
    - Paylaşma seçenekleri
    - Kazanılan krediler
    - İstatistikler

14. **Sipariş Onay** (`order_confirmation_screen/`)
    - Sipariş özeti
    - Teslimat bilgileri
    - Ödeme detayları

15. **Sipariş Takip** (`order_tracking_screen/`)
    - Kargo durumu
    - Teslimat aşamaları
    - Tahmini varış zamanı

16. **Ödeme Yöntemi** (`payment_method_screen/`)
    - Kart bilgileri
    - Ödeme seçenekleri

17. **Teslimat Bilgileri** (`shipping_information_screen/`)
    - Adres bilgileri
    - Teslimat seçenekleri

18. **Fiziki Mağazalar** (`physical_stores_page/`)
    - Mağaza listesi
    - Harita entegrasyonu
    - İletişim bilgileri

19. **Canlı Destek** (`live_chat_entry_screen/` & `live_chat_conversation_screen/`)
    - Konu seçimi
    - Mesajlaşma arayüzü

20. **Konuşma Geçmişi** (`chat_history_screen/`)
    - Geçmiş sohbetler
    - Arama özelliği

21. **Bildirimler** (`in-app_notifications_screen/`)
    - Uygulama içi bildirimler
    - Bildirim kategorileri

22. **Sunucu Hatası** (`server_error_screen/`)
    - Hata mesajı
    - Yeniden deneme butonu

23. **Splash Screen** (`splash_screen/`)
    - Uygulama yükleme ekranı
    - Logo animasyonu

24. **🆕 Arama Ekranı** (`search_screen/`)
    - Arama çubuğu
    - Son aramalar
    - Popüler kategoriler
    - Trend aramalar

25. **🆕 Sohbet Geçmişi** (`chat_history_screen_implementation/`)
    - Mesaj listesi
    - Okunmamış mesaj göstergesi
    - Arama özelliği

## 🎨 Tasarım Özellikleri

- **Renk Paleti**: Yeşil (#11d421) ana renk
- **Dark Mode**: Tüm ekranlarda destekleniyor
- **Font**: Plus Jakarta Sans, Spline Sans
- **Framework**: Tailwind CSS
- **İkonlar**: Material Symbols Outlined
- **Responsive**: Mobil öncelikli tasarım

## 📂 Klasör Yapısı

Her ekran klasörü şunları içerir:
- `*.html` - Tasarım dosyası
- `screen.png` - Ekran görüntüsü (opsiyonel)

## 🔄 Güncelleme Notları

**Son Güncelleme**: 16 Aralık 2025

### Eklenen Yeni Ekranlar:
- ✅ Arama Ekranı (Search Screen)
- ✅ Sohbet Geçmişi Ekranı (Chat History Screen Implementation)

### Mevcut Tasarımlar:
- Tüm ekranlar dark mode desteği ile güncel
- Responsive tasarım uygulandı
- Material Design prensipleri takip edildi

## 📝 Notlar

- Tüm HTML dosyaları standalone olarak çalışabilir
- Tailwind CSS CDN üzerinden yüklenir
- Google Fonts kullanılmaktadır
- Görseller placeholder olarak external URL'lerden yüklenir

## 🚀 Kullanım

HTML dosyalarını doğrudan tarayıcıda açarak tasarımları görüntüleyebilirsiniz. İnternet bağlantısı gereklidir (CDN kaynakları için).
