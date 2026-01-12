/**
 * SQL Security Utility
 * SQL injection riski olan dynamic SQL kullanımlarını güvenli hale getirir
 */

/**
 * Column name'leri validate et ve whitelist ile kontrol et
 * @param {string[]} fields - Field isimleri (örn: ['name = ?', 'email = ?'])
 * @param {string[]} allowedColumns - İzin verilen column isimleri
 * @returns {string[]} Güvenli field'lar
 */
function validateColumnNames(fields, allowedColumns) {
  if (!Array.isArray(fields) || !Array.isArray(allowedColumns)) {
    throw new Error('Fields and allowedColumns must be arrays');
  }
  
  const safeFields = [];
  
  for (const field of fields) {
    // Field formatı: "columnName = ?" veya "columnName"
    const columnMatch = field.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|$)/);
    
    if (!columnMatch) {
      console.warn(`⚠️ Invalid field format: ${field}`);
      continue;
    }
    
    const columnName = columnMatch[1];
    
    // Column name whitelist kontrolü
    if (!allowedColumns.includes(columnName)) {
      console.warn(`⚠️ Column name not in whitelist: ${columnName}`);
      continue;
    }
    
    // SQL injection karakterlerini kontrol et
    if (/[;'\"\\]/.test(columnName)) {
      console.warn(`⚠️ Suspicious characters in column name: ${columnName}`);
      continue;
    }
    
    safeFields.push(field);
  }
  
  return safeFields;
}

/**
 * Dynamic UPDATE query oluştur (güvenli)
 * @param {string} tableName - Table name
 * @param {string[]} fields - Field isimleri (örn: ['name = ?', 'email = ?'])
 * @param {string[]} allowedColumns - İzin verilen column isimleri
 * @param {any[]} params - Query parametreleri
 * @param {string} whereClause - WHERE clause (örn: 'id = ?')
 * @returns {object} { sql: string, params: any[] }
 */
function buildSafeUpdateQuery(tableName, fields, allowedColumns, params, whereClause) {
  // Table name validation
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  // Column name validation
  const safeFields = validateColumnNames(fields, allowedColumns);
  
  if (safeFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  // SQL query oluştur
  const sql = `UPDATE ${tableName} SET ${safeFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE ${whereClause}`;
  
  return {
    sql,
    params
  };
}

/**
 * Dynamic SELECT query oluştur (güvenli)
 * @param {string} tableName - Table name
 * @param {string[]} columns - Column isimleri
 * @param {string[]} allowedColumns - İzin verilen column isimleri
 * @param {string} whereClause - WHERE clause
 * @param {any[]} params - Query parametreleri
 * @returns {object} { sql: string, params: any[] }
 */
function buildSafeSelectQuery(tableName, columns, allowedColumns, whereClause, params = []) {
  // Table name validation
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  
  // Column validation
  const safeColumns = columns.filter(col => {
    const colName = col.trim().split(' ')[0]; // "column AS alias" formatı için
    return allowedColumns.includes(colName) && !/[;'\"\\]/.test(colName);
  });
  
  if (safeColumns.length === 0) {
    throw new Error('No valid columns to select');
  }
  
  const sql = `SELECT ${safeColumns.join(', ')} FROM ${tableName} WHERE ${whereClause}`;
  
  return {
    sql,
    params
  };
}

module.exports = {
  validateColumnNames,
  buildSafeUpdateQuery,
  buildSafeSelectQuery
};
