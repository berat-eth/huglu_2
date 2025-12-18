import { Platform } from 'react-native';
import NfcManager from 'react-native-nfc-manager';

/**
 * NFC Temassız Ödeme Servisi
 * Kredi kartı bilgilerini NFC ile okur
 */

// NFC'nin desteklenip desteklenmediğini kontrol et
export const isNFCAvailable = async () => {
  try {
    // react-native-nfc-manager paketi yüklü mü kontrol et
    if (!NfcManager || typeof NfcManager.isSupported !== 'function') {
      console.log('NFC paketi yüklü değil');
      return false;
    }

    const isSupported = await NfcManager.isSupported();
    return isSupported;
  } catch (error) {
    console.log('NFC kontrolü:', error.message);
    // Hata durumunda false döndür (uygulama çalışmaya devam etsin)
    return false;
  }
};

// NFC'yi başlat
export const startNFC = async () => {
  try {
    if (!NfcManager || typeof NfcManager.start !== 'function') {
      throw new Error('NFC paketi yüklü değil');
    }

    await NfcManager.start();
    return true;
  } catch (error) {
    console.error('NFC başlatma hatası:', error);
    throw error;
  }
};

// NFC'yi durdur
export const stopNFC = async () => {
  try {
    if (NfcManager && typeof NfcManager.cancelTechnologyRequest === 'function') {
      await NfcManager.cancelTechnologyRequest();
    }
  } catch (error) {
    console.error('NFC durdurma hatası:', error);
  }
};

/**
 * Temassız kredi kartını oku
 * @returns {Promise<{cardNumber: string, expiryDate: string, cardName: string}>}
 */
export const readContactlessCard = async () => {
  try {
    // NFC'yi başlat
    await startNFC();

    // Android için NFC okuma
    if (Platform.OS === 'android') {
      return await readCardAndroid();
    }
    
    // iOS için NFC okuma
    if (Platform.OS === 'ios') {
      return await readCardIOS();
    }

    throw new Error('Desteklenmeyen platform');
  } catch (error) {
    console.error('Kart okuma hatası:', error);
    throw error;
  } finally {
    await stopNFC();
  }
};

/**
 * Android için kart okuma
 */
const readCardAndroid = async () => {
  try {
    // Gerçek NFC okuma için ISO-DEP teknolojisi kullanılır
    // Ancak gerçek kredi kartı okuma için banka API'si ve özel izinler gerekir
    // Şimdilik simüle edilmiş bir okuma yapıyoruz
    
    // Gerçek implementasyon örneği (yorum satırı):
    // await NfcManager.requestTechnology(NfcManager.NfcTech.IsoDep);
    // const tag = await NfcManager.getTag();
    // const cardData = await readCardDataFromTag(tag);
    
    // Simüle edilmiş okuma (2 saniye bekle)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simüle edilmiş kart verileri
    // Gerçek uygulamada bu veriler NFC'den okunur ve şifrelenir
    const mockCardData = {
      cardNumber: '4532 1234 5678 9010',
      expiryDate: '12/25',
      cardName: 'TEMASSIZ KART',
    };

    // Gerçek implementasyon için:
    // 1. NFC'den kart verilerini oku (şifrelenmiş)
    // 2. Verileri banka API'sine gönder
    // 3. Token al ve kullan
    // 4. CVV kullanıcıdan istenir (güvenlik için)

    return mockCardData;
  } catch (error) {
    console.error('Android kart okuma hatası:', error);
    throw new Error('Kart okunamadı. Lütfen tekrar deneyin.');
  }
};

/**
 * iOS için kart okuma
 */
const readCardIOS = async () => {
  try {
    // iOS'ta NFC okuma için benzer işlemler
    // Gerçek implementasyon için banka API'si gerekir
    
    // Simüle edilmiş okuma (2 saniye bekle)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simüle edilmiş kart verileri
    const mockCardData = {
      cardNumber: '4532 1234 5678 9010',
      expiryDate: '12/25',
      cardName: 'TEMASSIZ KART',
    };

    return mockCardData;
  } catch (error) {
    console.error('iOS kart okuma hatası:', error);
    throw new Error('Kart okunamadı. Lütfen tekrar deneyin.');
  }
};

/**
 * Temassız ödeme için kart bilgilerini doğrula ve işle
 * @param {Object} cardData - Okunan kart verileri
 * @param {number} amount - Ödeme tutarı
 * @returns {Promise<{success: boolean, transactionId?: string}>}
 */
export const processContactlessPayment = async (cardData, amount) => {
  try {
    // Kart bilgilerini doğrula
    if (!cardData.cardNumber || !cardData.expiryDate) {
      throw new Error('Kart bilgileri eksik');
    }

    // Gerçek uygulamada burada banka API'sine istek gönderilir
    // Şimdilik simüle edilmiş başarılı yanıt döndürüyoruz
    
    console.log('Temassız ödeme işleniyor:', {
      cardNumber: cardData.cardNumber.replace(/\d(?=\d{4})/g, '*'),
      amount,
    });

    // Simüle edilmiş işlem ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      transactionId,
      message: 'Temassız ödeme başarılı',
    };
  } catch (error) {
    console.error('Temassız ödeme işleme hatası:', error);
    throw error;
  }
};

export default {
  isNFCAvailable,
  startNFC,
  stopNFC,
  readContactlessCard,
  processContactlessPayment,
};

