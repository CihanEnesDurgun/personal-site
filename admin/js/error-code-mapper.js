/* ====== Error Code Mapper (RFC 7807 Compliant) ====== 
 * Maps legacy or explicit error codes to the new Alphanumeric Taxonomy (e.g., AUTH-1001)
 * Understands application/problem+json structures natively.
 */

// Legacy code or specific message string to the new Alphanumeric Taxonomy
const ERROR_MESSAGE_TO_CODE = {
  // === AUTHENTICATION & AUTHORIZATION ===
  'AUTHENTICATION_ERROR': 'AUTH-1001',
  'Erişim token\'ı gereklidir': 'AUTH-1001',
  'Geçersiz veya süresi dolmuş token': 'AUTH-1002',
  'Geçersiz token': 'AUTH-1003',
  'Token süresi dolmuş': 'AUTH-1002',
  'Oturum süresi dolmuş veya geçersiz': 'AUTH-1006',
  'Kimlik doğrulama başarısız': 'AUTH-1001',
  'Erişim reddedildi': 'AUTH-1005',
  'İzin reddedildi': 'AUTH-1005',
  'Kullanıcı adı ve şifre gereklidir.': 'AUTH-1004',
  'Kullanıcı adı veya şifre hatalı.': 'AUTH-1004',

  // === VALIDATION & BAD REQUESTS ===
  'VALIDATION_ERROR': 'VAL-2001',
  'Doğrulama Hatası': 'VAL-2001',
  'Eksik gerekli alanlar': 'VAL-2002',

  // === SYSTEM & SERVER ===
  'INTERNAL_ERROR': 'SYS-3001',
  'Sunucu hatası': 'SYS-3001',

  // === SECURITY & RATE LIMITING ===
  'RATE_LIMIT_EXCEEDED': 'SEC-4001',
  'Bu IP adresinden çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.': 'SEC-4001',
  'Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.': 'SEC-4001',
  'CORS politikası ihlali': 'SEC-4002',

  // === FILE OPERATIONS ===
  'FILE_SIZE_LIMIT': 'FILE-5001',
  'Dosya çok büyük': 'FILE-5001',
  'FILE_TYPE_NOT_ALLOWED': 'FILE-5002',
  'Dosya tipi izin verilmiyor': 'FILE-5002',
  'FILE_EXTENSION_NOT_ALLOWED': 'FILE-5002',
  'Dosya uzantısı izin verilmiyor': 'FILE-5002',
  'UPLOAD_ERROR': 'FILE-5003',
  'Dosya yükleme başarısız': 'FILE-5003',
  'NO_FILE': 'FILE-5003',
  'Dosya yüklenmedi': 'FILE-5003',

  // === RESOURCE ===
  'NOT_FOUND': 'RES-6001',
  'Kaynak bulunamadı': 'RES-6001',
  'FILE_NOT_FOUND': 'RES-6001',
  'Dosya bulunamadı': 'RES-6001'
};

/**
 * Get taxonomy error code from error object or message
 * Supports standard RFC 7807 Application Problem Details natively
 * @param {Error|Object|string} error - Error object, problem details, or string
 * @returns {string|null} - Alphanumeric error code (e.g. 'AUTH-1001') or null
 */
function getErrorCode(error) {
  // If it's already a problem details representation explicitly containing code extension
  if (error && error.code && typeof error.code === 'string' && error.code.match(/^[A-Z]{3,4}-\d{4}$/)) {
    return error.code;
  }
  if (error && error.type && typeof error.type === 'string' && error.type.match(/^[A-Z]{3,4}-\d{4}$/)) {
    return error.type;
  }

  if (error && error.responseData) {
    if (error.responseData.code && typeof error.responseData.code === 'string' && error.responseData.code.match(/^[A-Z]{3,4}-\d{4}$/)) {
      return error.responseData.code;
    }

    // Attempt to map from detail/error message fields
    const legacyMsg = error.responseData.error || error.responseData.detail || error.responseData.code || null;
    if (legacyMsg && ERROR_MESSAGE_TO_CODE[legacyMsg]) return ERROR_MESSAGE_TO_CODE[legacyMsg];
  }

  // If error is a exact string (legacy system compatibility)
  if (typeof error === 'string') {
    if (ERROR_MESSAGE_TO_CODE[error]) return ERROR_MESSAGE_TO_CODE[error];
    if (error.match(/^[A-Z]{3,4}-\d{4}$/)) return error;
  }

  if (error && error.message) {
    if (ERROR_MESSAGE_TO_CODE[error.message]) return ERROR_MESSAGE_TO_CODE[error.message];
  }

  return null;
}

/**
 * Format error message with the new Alphanumeric Error Code
 * @param {string} message - Error message/detail
 * @param {string|null} code - Error code (e.g. AUTH-1001)
 * @returns {string} - Formatted error message
 */
function formatErrorMessage(message, code) {
  if (code) {
    return `${message} [Hata Kodu: ${code}]`;
  }
  return message;
}

/**
 * Log error with RFC 7807 taxonomy to console
 * @param {Error|Object|string} error - Error object or message
 * @param {string} context - Context where error occurred
 */
function logErrorWithCode(error, context = '') {
  const errorCode = getErrorCode(error);

  // Favoring 'detail' over 'message' or 'error' as per RFC 7807
  let errorMessage = 'Bilinmeyen hata';
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error) {
    if (error.responseData && error.responseData.detail) errorMessage = error.responseData.detail;
    else if (error.detail) errorMessage = error.detail;
    else if (error.message) errorMessage = error.message;
    else if (error.error) errorMessage = error.error;
  }

  if (errorCode) {
    console.error(`🚨 ${context ? context + ' - ' : ''}Sistem Hatası: ${errorCode}`);
    console.error(`📋 Detay: ${errorMessage}`);
    console.error(`📖 Çözüm rehberi için: docs/error-handling/error-registry.tr.md dosyasında "${errorCode}" kodunu arayın`);
  } else {
    console.error(`🚨 ${context ? context + ' - ' : ''}${errorMessage}`);
  }
}

// Make functions globally available
if (typeof window !== 'undefined') {
  window.getErrorCode = getErrorCode;
  window.formatErrorMessage = formatErrorMessage;
  window.logErrorWithCode = logErrorWithCode;
  window.ERROR_MESSAGE_TO_CODE = ERROR_MESSAGE_TO_CODE;
}

console.log('📦 Error Code Mapper Module loaded (RFC 7807 Ready)');
