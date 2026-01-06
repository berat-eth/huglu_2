const mysql = require('mysql2/promise');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '92.113.22.70',
  user: process.env.DB_USER || 'u987029066_Admin',
  password: process.env.DB_PASSWORD || '38cdfD8217..',
  database: process.env.DB_NAME || 'u987029066_mobil',
  port: parseInt(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4'
};

// Kritik tablolar - bunlar asla silinmemeli
const CRITICAL_TABLES = [
  'tenants',
  'users',
  'user_addresses',
  'products',
  'product_variations',
  'product_variation_options',
  'cart',
  'orders',
  'order_items',
  'reviews',
  'user_wallets',
  'wallet_transactions',
  'payment_transactions',
  'invoices',
  'return_requests',
  'categories'
];

// ML Analiz Sistemi Tabloları (Artık kullanılmıyor)
const ML_ANALYTICS_TABLES = [
  'customer_analytics',
  'chatbot_analytics',
  'recommendations',
  'analytics_events',
  'analytics_sessions',
  'analytics_funnels',
  'analytics_cohorts',
  'analytics_reports',
  'analytics_alerts',
  'analytics_aggregates',
  'device_analytics_aggregates',
  'user_behavior_events',
  'user_sessions',
  'anonymous_devices',
  'user_events'
];

// Varsayılan olarak silinebilecek tablolar (opsiyonel - kullanıcı onaylayacak)
const POTENTIALLY_UNUSED_TABLES = [
  // Test/Development tabloları
  'test_*',
  'dev_*',
  'temp_*',
  '_old_*',
  '_backup_*',
  
  // Eski/Deprecated tablolar (örnekler - gerçek tabloları kontrol edin)
  // 'old_orders',
  // 'old_users',
  // 'deprecated_*',
];

// Readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Veritabanındaki tüm tabloları listele
 */
async function getAllTables(connection) {
  const [tables] = await connection.execute(`
    SELECT TABLE_NAME, 
           TABLE_ROWS,
           ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS SIZE_MB
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  return tables;
}

/**
 * Tablonun foreign key bağımlılıklarını kontrol et
 */
async function getTableDependencies(connection, tableName) {
  const [dependencies] = await connection.execute(`
    SELECT 
      REFERENCED_TABLE_NAME as referenced_table,
      TABLE_NAME as dependent_table,
      CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME = ?
  `, [tableName]);
  
  return dependencies;
}

/**
 * Tabloyu başka tablolar referans ediyor mu kontrol et
 */
async function isTableReferenced(connection, tableName) {
  const [references] = await connection.execute(`
    SELECT COUNT(*) as count
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME = ?
  `, [tableName]);
  
  return references[0].count > 0;
}

/**
 * Tablonun kayıt sayısını kontrol et
 */
async function getTableRowCount(connection, tableName) {
  try {
    const [result] = await connection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    return result[0].count;
  } catch (error) {
    return 0;
  }
}

/**
 * Tabloyu güvenli bir şekilde sil
 */
async function dropTable(connection, tableName, force = false) {
  try {
    // Foreign key kontrolü
    const isReferenced = await isTableReferenced(connection, tableName);
    
    if (isReferenced && !force) {
      console.log(`⚠️  ${tableName} tablosu başka tablolar tarafından referans ediliyor.`);
      const dependencies = await getTableDependencies(connection, tableName);
      console.log(`   Bağımlı tablolar: ${dependencies.map(d => d.dependent_table).join(', ')}`);
      return { success: false, reason: 'referenced' };
    }

    // Foreign key kontrolünü geçici olarak devre dışı bırak
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Tabloyu sil
    await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
    
    // Foreign key kontrolünü tekrar aktif et
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    return { success: true };
  } catch (error) {
    return { success: false, reason: error.message };
  }
}

/**
 * Backup oluştur (SQL dump)
 */
async function createBackup(connection, tables, backupPath) {
  console.log('\n📦 Backup oluşturuluyor...');
  
  const backupSQL = [];
  backupSQL.push(`-- Backup created at: ${new Date().toISOString()}\n`);
  backupSQL.push(`-- Database: ${dbConfig.database}\n`);
  backupSQL.push(`-- Tables: ${tables.join(', ')}\n\n`);
  
  for (const table of tables) {
    try {
      // Tablo yapısını al
      const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${table}\``);
      backupSQL.push(`-- Table: ${table}\n`);
      backupSQL.push(`${createTable[0]['Create Table']};\n\n`);
      
      // Tablo verilerini al
      const [rows] = await connection.execute(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        backupSQL.push(`-- Data for table: ${table}\n`);
        backupSQL.push(`INSERT INTO \`${table}\` VALUES\n`);
        
        const values = rows.map(row => {
          const rowValues = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return connection.escape(val);
            return val;
          });
          return `(${rowValues.join(', ')})`;
        });
        
        backupSQL.push(values.join(',\n') + ';\n\n');
      }
    } catch (error) {
      console.log(`⚠️  ${table} tablosu için backup oluşturulamadı: ${error.message}`);
    }
  }
  
  await fs.writeFile(backupPath, backupSQL.join(''), 'utf8');
  console.log(`✅ Backup oluşturuldu: ${backupPath}`);
}

/**
 * Ana fonksiyon
 */
async function main() {
  let connection;
  
  try {
    console.log('🔌 Veritabanına bağlanılıyor...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Veritabanı bağlantısı başarılı\n');

    // Tüm tabloları listele
    console.log('📋 Tüm tablolar listeleniyor...\n');
    const allTables = await getAllTables(connection);
    
    if (allTables.length === 0) {
      console.log('❌ Veritabanında tablo bulunamadı.');
      return;
    }

    // Tabloları kategorilere ayır
    const criticalTables = [];
    const mlAnalyticsTables = [];
    const otherTables = [];
    
    allTables.forEach(table => {
      const tableName = table.TABLE_NAME;
      if (CRITICAL_TABLES.includes(tableName)) {
        criticalTables.push(table);
      } else if (ML_ANALYTICS_TABLES.includes(tableName)) {
        mlAnalyticsTables.push(table);
      } else {
        otherTables.push(table);
      }
    });

    // Tabloları göster
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 VERİTABANI TABLOLARI');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`🔴 KRİTİK TABLOLAR (${criticalTables.length} adet) - SİLİNMEYECEK:`);
    criticalTables.forEach(table => {
      console.log(`   • ${table.TABLE_NAME.padEnd(40)} ${String(table.TABLE_ROWS || 0).padStart(10)} satır | ${String(table.SIZE_MB || 0).padStart(8)} MB`);
    });
    
    if (mlAnalyticsTables.length > 0) {
      console.log(`\n🤖 ML ANALİZ SİSTEMİ TABLOLARI (${mlAnalyticsTables.length} adet) - ARTIK KULLANILMIYOR:`);
      mlAnalyticsTables.forEach((table, index) => {
        const marker = index < 10 ? '   ' : '';
        console.log(`   ${marker}${(index + 1).toString().padStart(3)}. ${table.TABLE_NAME.padEnd(40)} ${String(table.TABLE_ROWS || 0).padStart(10)} satır | ${String(table.SIZE_MB || 0).padStart(8)} MB`);
      });
    }
    
    console.log(`\n📦 DİĞER TABLOLAR (${otherTables.length} adet):`);
    otherTables.forEach((table, index) => {
      const marker = index < 10 ? '   ' : '';
      console.log(`   ${marker}${(index + 1).toString().padStart(3)}. ${table.TABLE_NAME.padEnd(40)} ${String(table.TABLE_ROWS || 0).padStart(10)} satır | ${String(table.SIZE_MB || 0).padStart(8)} MB`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════\n');

    // Kullanıcıdan silinecek tabloları al
    console.log('⚠️  UYARI: Bu işlem geri alınamaz!');
    console.log('💡 Önerilen: Önce backup alın.\n');
    
    const backupChoice = await question('Backup oluşturmak istiyor musunuz? (e/h): ');
    const createBackupBeforeDelete = backupChoice.toLowerCase() === 'e' || backupChoice.toLowerCase() === 'evet';
    
    // Silme modu seçimi
    console.log('\nSilme modu seçin:');
    console.log('1. Manuel seçim (her tablo için tek tek onay)');
    console.log('2. Toplu silme (virgülle ayrılmış tablo numaraları)');
    console.log('3. Dosyadan oku (tables-to-delete.txt)');
    if (mlAnalyticsTables.length > 0) {
      console.log('5. ML Analiz tablolarını otomatik sil (tüm ML analiz tabloları)');
    }
    console.log('4. Çıkış');
    
    const modeChoice = mlAnalyticsTables.length > 0 ? '(1-5): ' : '(1-4): ';
    const mode = await question(`\nSeçiminiz ${modeChoice}`);
    
    let tablesToDelete = [];
    
    if (mode === '5' && mlAnalyticsTables.length > 0) {
      // ML Analiz tablolarını otomatik sil
      tablesToDelete = mlAnalyticsTables.map(t => t.TABLE_NAME);
      
      console.log(`\n🤖 ML Analiz tabloları seçildi (${tablesToDelete.length} adet):`);
      tablesToDelete.forEach(name => console.log(`   • ${name}`));
      
      const confirm = await question('\nBu ML analiz tablolarını silmek istediğinizden emin misiniz? (e/h): ');
      if (confirm.toLowerCase() !== 'e' && confirm.toLowerCase() !== 'evet') {
        console.log('❌ İşlem iptal edildi.');
        return;
      }
    } else     if (mode === '1') {
      // Manuel seçim - ML analiz tablolarını da dahil et
      const allSelectableTables = [...mlAnalyticsTables, ...otherTables];
      for (const table of allSelectableTables) {
        const tableName = table.TABLE_NAME;
        const rowCount = await getTableRowCount(connection, tableName);
        const isReferenced = await isTableReferenced(connection, tableName);
        
        console.log(`\n📋 Tablo: ${tableName}`);
        console.log(`   Satır sayısı: ${rowCount}`);
        console.log(`   Boyut: ${table.SIZE_MB} MB`);
        if (isReferenced) {
          const deps = await getTableDependencies(connection, tableName);
          console.log(`   ⚠️  Bu tablo ${deps.length} tablo tarafından referans ediliyor!`);
        }
        
        const answer = await question(`   Bu tabloyu silmek istiyor musunuz? (e/h): `);
        if (answer.toLowerCase() === 'e' || answer.toLowerCase() === 'evet') {
          tablesToDelete.push(tableName);
        }
      }
    } else if (mode === '2') {
      // Toplu silme - ML analiz tablolarını da dahil et
      const allSelectableTables = [...mlAnalyticsTables, ...otherTables];
      const tableNumbers = await question('\nSilinecek tablo numaralarını girin (virgülle ayırın, örn: 1,3,5): ');
      const numbers = tableNumbers.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= allSelectableTables.length);
      
      tablesToDelete = numbers.map(n => allSelectableTables[n - 1].TABLE_NAME);
      
      console.log(`\nSeçilen tablolar:`);
      tablesToDelete.forEach(name => console.log(`   • ${name}`));
      
      const confirm = await question('\nBu tabloları silmek istediğinizden emin misiniz? (e/h): ');
      if (confirm.toLowerCase() !== 'e' && confirm.toLowerCase() !== 'evet') {
        console.log('❌ İşlem iptal edildi.');
        return;
      }
    } else if (mode === '3') {
      // Dosyadan oku
      const filePath = path.join(__dirname, 'tables-to-delete.txt');
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const tableNames = content.split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
        
        const allSelectableTables = [...mlAnalyticsTables, ...otherTables];
        tablesToDelete = tableNames.filter(name => 
          allSelectableTables.some(t => t.TABLE_NAME === name) && 
          !CRITICAL_TABLES.includes(name)
        );
        
        console.log(`\n📄 Dosyadan ${tablesToDelete.length} tablo okundu:`);
        tablesToDelete.forEach(name => console.log(`   • ${name}`));
        
        const confirm = await question('\nBu tabloları silmek istediğinizden emin misiniz? (e/h): ');
        if (confirm.toLowerCase() !== 'e' && confirm.toLowerCase() !== 'evet') {
          console.log('❌ İşlem iptal edildi.');
          return;
        }
      } catch (error) {
        console.log(`❌ Dosya okunamadı: ${error.message}`);
        console.log(`💡 Örnek dosya oluşturuluyor: ${filePath}`);
        await fs.writeFile(filePath, '# Silinecek tabloları buraya yazın (her satıra bir tablo adı)\n# Örnek:\n# old_orders\n# temp_data\n', 'utf8');
        return;
      }
    } else {
      console.log('❌ İşlem iptal edildi.');
      return;
    }
    
    if (tablesToDelete.length === 0) {
      console.log('❌ Silinecek tablo seçilmedi.');
      return;
    }
    
    // Kritik tabloları kontrol et
    const criticalInList = tablesToDelete.filter(name => CRITICAL_TABLES.includes(name));
    if (criticalInList.length > 0) {
      console.log(`\n❌ HATA: Kritik tablolar silinemez!`);
      criticalInList.forEach(name => console.log(`   • ${name}`));
      return;
    }
    
    // Backup oluştur
    if (createBackupBeforeDelete) {
      const backupDir = path.join(__dirname, 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, `backup_${Date.now()}.sql`);
      await createBackup(connection, tablesToDelete, backupPath);
    }
    
    // Tabloları sil
    console.log('\n🗑️  Tablolar siliniyor...\n');
    const results = [];
    
    for (const tableName of tablesToDelete) {
      console.log(`   Siliniyor: ${tableName}...`);
      const result = await dropTable(connection, tableName);
      
      if (result.success) {
        console.log(`   ✅ ${tableName} başarıyla silindi`);
        results.push({ table: tableName, success: true });
      } else {
        console.log(`   ❌ ${tableName} silinemedi: ${result.reason}`);
        results.push({ table: tableName, success: false, reason: result.reason });
      }
    }
    
    // Özet
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 İŞLEM ÖZETİ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Başarılı: ${successful.length} tablo`);
    successful.forEach(r => console.log(`   • ${r.table}`));
    
    if (failed.length > 0) {
      console.log(`\n❌ Başarısız: ${failed.length} tablo`);
      failed.forEach(r => console.log(`   • ${r.table}: ${r.reason}`));
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Veritabanı bağlantısı kapatıldı.');
    }
    rl.close();
  }
}

// Script'i çalıştır
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, getAllTables, dropTable, createBackup };

