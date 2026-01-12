/**
 * Environment Variable Validation Utility
 * Production'da kritik environment variable'ların varlığını kontrol eder
 */

/**
 * Kritik environment variable'ları validate et
 * Production'da eksik variable varsa hata fırlatır
 */
function validateRequiredEnvVars() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Kritik environment variable'lar
  const requiredVars = {
    // Database
    'DB_HOST': 'Database host',
    'DB_USER': 'Database user',
    'DB_PASSWORD': 'Database password',
    'DB_NAME': 'Database name',
    
    // Security
    'ENCRYPTION_KEY': 'Encryption key (32 bytes hex)',
    'JWT_SECRET': 'JWT secret key',
    'ADMIN_KEY': 'Admin API key'
  };
  
  const missing = [];
  const warnings = [];
  
  // Tüm kritik variable'ları kontrol et
  for (const [key, description] of Object.entries(requiredVars)) {
    if (!process.env[key]) {
      missing.push({ key, description });
    } else if (key === 'ENCRYPTION_KEY' && process.env[key].length < 64) {
      // ENCRYPTION_KEY hex formatında olmalı (32 bytes = 64 hex chars)
      warnings.push(`${key} should be 64 hex characters (32 bytes)`);
    }
  }
  
  // Production'da eksik variable varsa hata fırlat
  if (isProduction && missing.length > 0) {
    const missingList = missing.map(m => `${m.key} (${m.description})`).join(', ');
    throw new Error(
      `❌ CRITICAL: Missing required environment variables in production:\n` +
      `${missingList}\n` +
      `Please set these variables before starting the server.`
    );
  }
  
  // Development'ta uyarı ver
  if (!isProduction && missing.length > 0) {
    console.warn('⚠️  WARNING: Missing environment variables (development mode):');
    missing.forEach(m => {
      console.warn(`   - ${m.key}: ${m.description}`);
    });
    console.warn('   These will be required in production.');
  }
  
  // Warnings göster
  if (warnings.length > 0) {
    warnings.forEach(warning => {
      console.warn(`⚠️  WARNING: ${warning}`);
    });
  }
  
  // Başarılı validation
  if (missing.length === 0) {
    console.log('✅ Environment variables validated successfully');
  }
  
  return {
    valid: missing.length === 0,
    missing: missing.map(m => m.key),
    warnings
  };
}

/**
 * Environment variable'ı al ve validate et
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value (sadece development için)
 * @param {boolean} required - Production'da zorunlu mu
 * @returns {string} Environment variable value
 */
function getEnvVar(key, defaultValue = null, required = true) {
  const value = process.env[key];
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!value) {
    if (isProduction && required) {
      throw new Error(`❌ CRITICAL: Required environment variable ${key} is not set`);
    }
    if (defaultValue !== null) {
      console.warn(`⚠️  Using default value for ${key} (development mode)`);
      return defaultValue;
    }
    if (required && !isProduction) {
      console.warn(`⚠️  WARNING: ${key} is not set (will be required in production)`);
    }
  }
  
  return value || defaultValue;
}

/**
 * Database configuration'ı validate et ve al
 */
function validateDatabaseConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306
  };
  
  // Production'da tüm değerler zorunlu
  if (isProduction) {
    const missing = Object.entries(config)
      .filter(([key, value]) => key !== 'port' && !value)
      .map(([key]) => key);
    
    if (missing.length > 0) {
      throw new Error(
        `❌ CRITICAL: Missing database configuration: ${missing.join(', ')}\n` +
        `Please set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables.`
      );
    }
  }
  
  return config;
}

module.exports = {
  validateRequiredEnvVars,
  getEnvVar,
  validateDatabaseConfig
};
