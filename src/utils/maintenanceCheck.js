import { healthAPI } from '../services/api';

/**
 * Bakım modu kontrolü yapar
 * @param {string} platform - Platform tipi (mobile, web, admin)
 * @returns {Promise<{isMaintenanceMode: boolean, message: string, estimatedEndTime: string}>}
 */
export const checkMaintenanceMode = async (platform = 'mobile') => {
  // 🧪 MANUEL TEST: Bakım modunu test etmek için aşağıdaki yorumu kaldırın
  // return {
  //   isMaintenanceMode: true,
  //   message: 'Sistem bakımda. Daha iyi hizmet verebilmek için çalışıyoruz.',
  //   estimatedEndTime: new Date(Date.now() + 3600000).toISOString(), // 1 saat sonra
  // };
  
  try {
    console.log('🔧 Bakım modu kontrolü yapılıyor...', { platform });
    
    const response = await healthAPI.maintenance(platform);
    
    console.log('📦 Bakım modu API yanıtı:', JSON.stringify(response.data, null, 2));
    
    if (response.data?.success !== undefined) {
      // API yanıtı var
      const data = response.data.data || response.data;
      const isMaintenanceMode = data.isMaintenanceMode || data.isMaintenance || false;
      const message = data.message || '';
      const estimatedEndTime = data.estimatedEndTime || null;
      
      console.log('✅ Bakım modu durumu:', {
        isMaintenanceMode,
        message,
        estimatedEndTime,
      });
      
      return {
        isMaintenanceMode,
        message,
        estimatedEndTime,
      };
    }
    
    // Başarısız yanıt - bakım modu yok kabul et
    console.log('⚠️ Bakım modu API yanıtı başarısız, normal modda devam ediliyor');
    return {
      isMaintenanceMode: false,
      message: '',
      estimatedEndTime: null,
    };
  } catch (error) {
    // Hata durumunda bakım modu yok kabul et (uygulama çalışmaya devam etsin)
    console.error('❌ Bakım modu kontrolü hatası:', error.message);
    console.error('Hata detayı:', error.response?.data || error);
    return {
      isMaintenanceMode: false,
      message: '',
      estimatedEndTime: null,
    };
  }
};

/**
 * Bakım modu mesajını formatlar
 * @param {string} message - Bakım modu mesajı
 * @param {string} estimatedEndTime - Tahmini bitiş zamanı
 * @returns {string} Formatlanmış mesaj
 */
export const formatMaintenanceMessage = (message, estimatedEndTime) => {
  if (!message) {
    return 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.';
  }
  
  if (estimatedEndTime) {
    const endDate = new Date(estimatedEndTime);
    const formattedDate = endDate.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    return `${message}\n\nTahmini bitiş: ${formattedDate}`;
  }
  
  return message;
};
