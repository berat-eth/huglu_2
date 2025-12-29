const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '../.env' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '92.113.22.70',
  user: process.env.DB_USER || 'u987029066_Admin',
  password: process.env.DB_PASSWORD || '38cdfD8217..',
  database: process.env.DB_NAME || 'u987029066_mobil',
  port: parseInt(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4'
};

// Arşiv klasörü yolu
const ARCHIVE_DIR = path.join(__dirname, '../data/archives/live-support');

/**
 * Arşiv klasörünü oluştur
 */
async function ensureArchiveDirectory() {
  try {
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    console.log(`✅ Arşiv klasörü hazır: ${ARCHIVE_DIR}`);
  } catch (error) {
    console.error('❌ Arşiv klasörü oluşturulamadı:', error);
    throw error;
  }
}

/**
 * 24 saatten eski canlı destek mesajlarını arşivle ve sil
 */
async function archiveOldLiveSupportMessages() {
  let connection;
  
  try {
    console.log('🔌 Veritabanına bağlanılıyor...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Veritabanı bağlantısı başarılı');

    // Arşiv klasörünü oluştur
    await ensureArchiveDirectory();

    // 24 saatten eski canlı destek mesajlarını bul
    const [rows] = await connection.execute(`
      SELECT 
        ca.id,
        ca.tenantId,
        ca.userId,
        u.name as userName,
        u.email as userEmail,
        u.phone as userPhone,
        ca.message,
        ca.intent,
        ca.satisfaction,
        ca.productId,
        ca.productName,
        ca.productPrice,
        ca.productImage,
        ca.timestamp
      FROM chatbot_analytics ca
      LEFT JOIN users u ON ca.userId = u.id AND u.tenantId = ca.tenantId
      WHERE (ca.intent = 'live_support' OR ca.intent = 'admin_message')
        AND ca.timestamp < DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY ca.timestamp ASC
    `);

    if (rows.length === 0) {
      console.log('ℹ️  Arşivlenecek mesaj bulunamadı');
      return { archived: 0, deleted: 0 };
    }

    console.log(`📦 ${rows.length} adet mesaj bulundu, arşivleniyor...`);

    // Mesajları tarih bazlı grupla (günlük arşivler)
    const messagesByDate = {};
    
    rows.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!messagesByDate[dateKey]) {
        messagesByDate[dateKey] = [];
      }
      
      messagesByDate[dateKey].push({
        id: msg.id,
        tenantId: msg.tenantId,
        userId: msg.userId,
        userName: msg.userName,
        userEmail: msg.userEmail,
        userPhone: msg.userPhone,
        message: msg.message,
        intent: msg.intent,
        satisfaction: msg.satisfaction,
        productId: msg.productId,
        productName: msg.productName,
        productPrice: msg.productPrice ? parseFloat(msg.productPrice) : null,
        productImage: msg.productImage,
        timestamp: msg.timestamp
      });
    });

    // Her gün için ayrı JSON dosyası oluştur
    let totalArchived = 0;
    const archiveFiles = [];

    for (const [dateKey, messages] of Object.entries(messagesByDate)) {
      const fileName = `live-support-${dateKey}.json`;
      const filePath = path.join(ARCHIVE_DIR, fileName);
      
      // Eğer dosya varsa, mevcut verileri oku ve birleştir
      let existingMessages = [];
      try {
        const existingData = await fs.readFile(filePath, 'utf8');
        existingMessages = JSON.parse(existingData);
        if (!Array.isArray(existingMessages)) {
          existingMessages = [];
        }
      } catch (error) {
        // Dosya yoksa veya okunamazsa, yeni bir array oluştur
        existingMessages = [];
      }

      // Yeni mesajları ekle ve duplicate'leri temizle
      const messageIds = new Set(existingMessages.map(m => m.id));
      const newMessages = messages.filter(m => !messageIds.has(m.id));
      const allMessages = [...existingMessages, ...newMessages];
      
      // Timestamp'e göre sırala
      allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // JSON dosyasına kaydet
      const archiveData = {
        archiveDate: new Date().toISOString(),
        date: dateKey,
        totalMessages: allMessages.length,
        messages: allMessages
      };

      await fs.writeFile(filePath, JSON.stringify(archiveData, null, 2), 'utf8');
      console.log(`✅ ${fileName} dosyasına ${newMessages.length} mesaj arşivlendi (Toplam: ${allMessages.length})`);
      
      totalArchived += newMessages.length;
      archiveFiles.push(fileName);
    }

    // Veritabanından sil
    const [deleteResult] = await connection.execute(`
      DELETE FROM chatbot_analytics
      WHERE (intent = 'live_support' OR intent = 'admin_message')
        AND timestamp < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    const deletedCount = deleteResult.affectedRows;
    console.log(`🗑️  ${deletedCount} adet mesaj veritabanından silindi`);

    // Özet dosyası oluştur
    const summary = {
      archiveDate: new Date().toISOString(),
      totalArchived: totalArchived,
      totalDeleted: deletedCount,
      archiveFiles: archiveFiles,
      dateRange: {
        oldest: rows[0]?.timestamp,
        newest: rows[rows.length - 1]?.timestamp
      }
    };

    const summaryPath = path.join(ARCHIVE_DIR, `archive-summary-${new Date().toISOString().split('T')[0]}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`📋 Özet dosyası oluşturuldu: ${summaryPath}`);

    console.log('✅ Arşivleme işlemi tamamlandı');
    
    return {
      archived: totalArchived,
      deleted: deletedCount,
      files: archiveFiles
    };

  } catch (error) {
    console.error('❌ Arşivleme hatası:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Veritabanı bağlantısı kapatıldı');
    }
  }
}

// Script doğrudan çalıştırılırsa
if (require.main === module) {
  archiveOldLiveSupportMessages()
    .then(result => {
      console.log('📊 Sonuç:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script hatası:', error);
      process.exit(1);
    });
}

module.exports = { archiveOldLiveSupportMessages };


