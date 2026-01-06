const Iyzipay = require('iyzipay');

class IyzicoService {
  constructor() {
    // İyzico konfigürasyonu - PRODUCTION MODE
    // Environment variable'ları kontrol et, yoksa hata ver
    const apiKey = process.env.IYZICO_API_KEY;
    const secretKey = process.env.IYZICO_SECRET_KEY;
    const uri = process.env.IYZICO_URI || process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com';

    if (!apiKey || !secretKey) {
      console.error('❌ IYZICO API KEY veya SECRET KEY bulunamadı!');
      console.error('⚠️ Lütfen .env dosyasına şunları ekleyin:');
      console.error('   IYZICO_API_KEY=your_production_api_key');
      console.error('   IYZICO_SECRET_KEY=your_production_secret_key');
      console.error('   IYZICO_URI=https://api.iyzipay.com (opsiyonel)');
      throw new Error('Iyzico API credentials not configured');
    }

    // Sandbox kontrolü - API key sandbox ile başlıyorsa uyarı ver
    if (apiKey.startsWith('sandbox-') || secretKey.startsWith('sandbox-')) {
      console.warn('⚠️ UYARI: Sandbox API key\'leri kullanılıyor!');
      console.warn('⚠️ Production için gerçek API key\'leri kullanın!');
    }

    this.iyzipay = new Iyzipay({
      apiKey: apiKey,
      secretKey: secretKey,
      uri: uri // Production: https://api.iyzipay.com
    });

    console.log('✅ Iyzico Service initialized - PRODUCTION MODE');
    console.log(`📍 Iyzico URI: ${uri}`);
  }

  // Kredi kartı ile ödeme - KART BİLGİLERİ KAYIT EDİLMİYOR
  // 3D Secure zorunlu - Production'da callbackUrl gereklidir
  // Iyzico dokümantasyonuna göre: https://docs.iyzico.com/odeme-metotlari/api/3ds/3ds-entegrasyonu/3ds-baslatma
  async processPayment(paymentData) {
    try {
      console.log('🔄 Iyzico payment processing - CARD DATA NOT STORED');
      console.log('⚠️ SECURITY: Card information is processed but NOT saved');
      console.log('🔐 3D Secure: ENABLED (Production requirement)');
      console.log('📚 Using 3DS Initialize endpoint as per Iyzico documentation');
      
      const {
        price,
        paidPrice,
        currency = 'TRY',
        basketId,
        paymentCard,
        buyer,
        shippingAddress,
        billingAddress,
        basketItems,
        callbackUrl // 3D Secure callback URL - ZORUNLU
      } = paymentData;

      // 3D Secure için callback URL zorunlu
      const baseUrl = process.env.BASE_URL || process.env.API_BASE_URL || 'https://api.huglutekstil.com';
      const defaultCallbackUrl = `${baseUrl}/api/payments/3ds-callback`;

      if (!callbackUrl && !defaultCallbackUrl) {
        throw new Error('3D Secure için callbackUrl zorunludur');
      }

      // 3D Secure Initialize Request - Iyzico dokümantasyonuna göre
      const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: `order_${basketId}_${Date.now()}`,
        price: price.toString(),
        paidPrice: paidPrice.toString(),
        currency: currency,
        installment: '1',
        basketId: basketId.toString(),
        paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
        paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
        // 3D Secure callback URL - ZORUNLU
        callbackUrl: callbackUrl || defaultCallbackUrl,
        paymentCard: {
          cardHolderName: paymentCard.cardHolderName,
          cardNumber: paymentCard.cardNumber,
          expireMonth: paymentCard.expireMonth,
          expireYear: paymentCard.expireYear,
          cvc: paymentCard.cvc,
          registerCard: '0' // Kart kayıt edilmiyor
        },
        buyer: {
          id: buyer.id.toString(),
          name: buyer.name,
          surname: buyer.surname,
          gsmNumber: buyer.gsmNumber,
          email: buyer.email,
          identityNumber: buyer.identityNumber || '11111111111',
          lastLoginDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
          registrationDate: buyer.registrationDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
          registrationAddress: buyer.registrationAddress,
          ip: buyer.ip,
          city: buyer.city,
          country: buyer.country || 'Turkey',
          zipCode: buyer.zipCode
        },
        shippingAddress: {
          contactName: shippingAddress.contactName,
          city: shippingAddress.city,
          country: shippingAddress.country || 'Turkey',
          address: shippingAddress.address,
          zipCode: shippingAddress.zipCode
        },
        billingAddress: {
          contactName: billingAddress.contactName,
          city: billingAddress.city,
          country: billingAddress.country || 'Turkey',
          address: billingAddress.address,
          zipCode: billingAddress.zipCode
        },
        basketItems: basketItems.map((item, index) => ({
          id: item.id.toString(),
          name: item.name,
          category1: item.category1 || 'Outdoor',
          category2: item.category2 || 'Product',
          itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
          price: item.price.toString()
        }))
      };

      console.log('🔄 İyzico payment request:', {
        conversationId: request.conversationId,
        price: request.price,
        basketId: request.basketId,
        itemCount: basketItems.length,
        callbackUrl: request.callbackUrl,
        hasCallbackUrl: !!request.callbackUrl
      });

      // 3D Secure Initialize - Iyzico dokümantasyonuna göre
      // POST /payment/3dsecure/initialize endpoint'i kullanılmalı
      // Dokümantasyon: https://docs.iyzico.com/odeme-metotlari/api/3ds/3ds-entegrasyonu/3ds-baslatma
      return new Promise((resolve, reject) => {
        this.iyzipay.threedsInitialize.create(request, (err, result) => {
          if (err) {
            console.error('❌ İyzico 3DS initialize error:', err);
            reject({
              success: false,
              error: 'PAYMENT_ERROR',
              message: '3D Secure başlatma hatası',
              details: err
            });
          } else {
            console.log('✅ İyzico 3DS initialize result:', {
              status: result.status,
              paymentId: result.paymentId,
              conversationId: result.conversationId,
              hasThreeDSHtmlContent: !!result.threeDSHtmlContent
            });

            if (result.status === 'success') {
              // 3D Secure başlatıldı - HTML content döndürülmeli
              if (result.threeDSHtmlContent) {
                console.log('🔐 3D Secure HTML content received - returning to frontend');
                resolve({
                  success: true,
                  requires3DS: true,
                  threeDSHtmlContent: result.threeDSHtmlContent,
                  conversationId: result.conversationId,
                  paymentId: result.paymentId, // Initialize'da paymentId döner
                  message: '3D Secure doğrulaması gerekiyor'
                });
              } else {
                // HTML content yoksa hata
                reject({
                  success: false,
                  error: 'PAYMENT_ERROR',
                  message: '3D Secure HTML içeriği alınamadı',
                  conversationId: result.conversationId
                });
              }
            } else {
              // Başlatma başarısız
              reject({
                success: false,
                error: 'PAYMENT_FAILED',
                message: result.errorMessage || '3D Secure başlatılamadı',
                errorCode: result.errorCode,
                errorGroup: result.errorGroup,
                conversationId: result.conversationId
              });
            }
          }
        });
      });

    } catch (error) {
      console.error('❌ İyzico service error:', error);
      throw {
        success: false,
        error: 'SERVICE_ERROR',
        message: 'Ödeme servisi hatası',
        details: error.message
      };
    }
  }

  // Ödeme sorgulama
  async retrievePayment(paymentId, conversationId) {
    try {
      const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: conversationId,
        paymentId: paymentId
      };

      return new Promise((resolve, reject) => {
        this.iyzipay.payment.retrieve(request, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // İade işlemi
  async refundPayment(paymentTransactionId, price, reason = 'other') {
    try {
      const request = {
        locale: Iyzipay.LOCALE.TR,
        conversationId: `refund_${paymentTransactionId}_${Date.now()}`,
        paymentTransactionId: paymentTransactionId,
        price: price.toString(),
        currency: 'TRY',
        reason: reason
      };

      return new Promise((resolve, reject) => {
        this.iyzipay.refund.create(request, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  // Test kartı bilgileri (sandbox için)
  static getTestCards() {
    return {
      success: {
        cardNumber: '5528790000000008',
        expireMonth: '12',
        expireYear: '2030',
        cvc: '123',
        cardHolderName: 'John Doe'
      },
      failure: {
        cardNumber: '4111111111111129',
        expireMonth: '12', 
        expireYear: '2030',
        cvc: '123',
        cardHolderName: 'John Doe'
      }
    };
  }

  // Kart numarasını maskele
  static maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 8) return cardNumber;
    const firstFour = cardNumber.substring(0, 4);
    const lastFour = cardNumber.substring(cardNumber.length - 4);
    const middle = '*'.repeat(cardNumber.length - 8);
    return `${firstFour}${middle}${lastFour}`;
  }

  // Ödeme durumu kontrolü
  isPaymentSuccessful(result) {
    return result && result.status === 'success';
  }

  // Hata mesajı çeviri
  translateErrorMessage(errorMessage) {
    const translations = {
      'Invalid request': 'Geçersiz istek',
      'Card number is invalid': 'Kart numarası geçersiz',
      'Expiry date is invalid': 'Son kullanma tarihi geçersiz',
      'CVC is invalid': 'Güvenlik kodu geçersiz',
      'Insufficient funds': 'Yetersiz bakiye',
      'Card is blocked': 'Kart bloke',
      'Transaction not permitted': 'İşlem izni yok',
      'General error': 'Genel hata'
    };

    return translations[errorMessage] || errorMessage || 'Bilinmeyen hata';
  }
}

module.exports = IyzicoService;
