/* ====== Error Code Mapper ====== 
 * Maps error codes to numeric error codes for user display
 */

const ERROR_CODE_MAP = {
  // Authentication & Authorization (100-199)
  'AUTHENTICATION_ERROR': 101,
  'AUTH_ERROR': 106,
  'INVALID_TOKEN': 103,
  'TOKEN_EXPIRED': 104,
  'INVALID_SESSION': 105,
  'AUTHORIZATION_ERROR': 107,
  'PERMISSION_DENIED': 108,
  'LOGOUT_ERROR': 111,
  
  // Validation (200-299)
  'VALIDATION_ERROR': 201,
  
  // File Upload (300-399)
  'FILE_SIZE_LIMIT': 301,
  'FILE_TYPE_NOT_ALLOWED': 302,
  'FILE_EXTENSION_NOT_ALLOWED': 303,
  'UPLOAD_ERROR': 304,
  'NO_FILE': 305,
  'FILE_COUNT_LIMIT': 306,
  'FOLDER_SAVE_ERROR': 307,
  'PROCESSING_ERROR': 308,
  
  // Blog Posts (400-499)
  'NOT_FOUND': 402,
  
  // Comments (500-599)
  
  // Gallery (600-699)
  'GALLERY_ERROR': 601,
  'INVALID_FOLDER': 603,
  'FILE_NOT_FOUND': 609,
  'NO_METADATA': 605,
  'FILE_EXISTS': 606,
  'RESTORE_ERROR': 607,
  'DELETE_ERROR': 608,
  
  // Stats (700-799)
  
  // Site Config (800-899)
  
  // Theme (900-999)
  
  // Security (1000-1099)
  'SESSION_INFO_ERROR': 1001,
  'SESSION_STATS_ERROR': 1002,
  
  // Rate Limiting (1100-1199)
  'RATE_LIMIT_EXCEEDED': 1101,
  
  // System (1200-1299)
  'INTERNAL_ERROR': 1201,
  'CORS_ERROR': 1203,
  
  // Logs (1300-1399)
};

// Reverse mapping for error messages
const ERROR_MESSAGE_TO_CODE = {
  'Erişim token\'ı gereklidir': 101,
  'Geçersiz veya süresi dolmuş token': 102,
  'Geçersiz token': 103,
  'Token süresi dolmuş': 104,
  'Oturum süresi dolmuş veya geçersiz': 105,
  'Kimlik doğrulama başarısız': 106,
  'Erişim reddedildi': 107,
  'İzin reddedildi': 108,
  'Kullanıcı adı ve şifre gereklidir.': 109,
  'Kullanıcı adı veya şifre hatalı.': 110,
  'Çıkış yapılamadı': 111,
  
  'Doğrulama Hatası': 201,
  'Eksik gerekli alanlar': 202,
  'Başlık en az 3 karakter olmalıdır': 203,
  'Özet en az 10 karakter olmalıdır': 204,
  'İçerik en az 50 karakter olmalıdır': 205,
  'Öne çıkarılan durumu boolean olmalıdır': 206,
  'Geçersiz durum': 207,
  'Zamanlanmış yazılar için yayın tarihi gereklidir': 208,
  'İsim, e-posta ve içerik gereklidir': 209,
  'Yorum en az 3 karakter olmalıdır': 210,
  'Yorum 1000 karakterden az olmalıdır': 211,
  'Geçersiz e-posta formatı': 212,
  'Kullanıcı adı en az 3 karakter olmalıdır': 213,
  'Yeni şifre en az 6 karakter olmalıdır': 214,
  'Geçersiz log verisi': 215,
  'Geçersiz log giriş formatı': 216,
  'Geçersiz saklama günü değeri': 217,
  'Geçersiz tema verisi': 218,
  'Eksik gerekli hero alanları': 219,
  'Eksik gerekli site alanları': 220,
  
  'Dosya çok büyük': 301,
  'Dosya tipi izin verilmiyor': 302,
  'Dosya uzantısı izin verilmiyor': 303,
  'Dosya yükleme başarısız': 304,
  'Dosya yüklenmedi': 305,
  'Çok fazla dosya': 306,
  'Dosya hedef klasöre kaydedilirken hata oluştu': 307,
  'Yüklenen dosya işlenirken hata oluştu': 308,
  
  'Blog yazıları yüklenirken hata oluştu': 401,
  'Blog yazısı bulunamadı': 402,
  'Blog yazısı yüklenirken hata oluştu': 403,
  'Bu başlıkta bir blog yazısı zaten mevcut': 404,
  'Blog yazısı metadata kaydedilirken hata oluştu': 405,
  'Blog yazıları metadata kaydedilirken hata oluştu': 406,
  'Blog yazısı oluşturulurken hata oluştu': 407,
  'Blog yazısı güncellenirken hata oluştu': 408,
  'Öne çıkarılan durum güncellenirken hata oluştu': 409,
  'Blog yazısı silinirken hata oluştu': 410,
  'Blog yazısı yayınlanırken hata oluştu': 411,
  'Blog yazısı geri yüklenirken hata oluştu': 412,
  'Blog yazısı geri dönüşüm kutusunda değil': 413,
  'Blog yazısı kalıcı olarak silinirken hata oluştu': 414,
  
  'Yorumlar alınamadı': 501,
  'Yorum eklenirken hata oluştu': 502,
  'Üst yorum bulunamadı': 503,
  'Maksimum yanıt derinliğine ulaşıldı': 504,
  'Yorum güncellenirken hata oluştu': 505,
  'Yorum bulunamadı': 506,
  'Yorum silinirken hata oluştu': 507,
  
  'Silinen görseller alınırken hata oluştu': 601,
  'Galeri görselleri alınırken hata oluştu': 602,
  'Geçersiz klasör': 603,
  'Silinen klasörde dosya bulunamadı': 604,
  'Silinen görsel için metadata bulunamadı': 605,
  'Dosya orijinal konumunda zaten mevcut': 606,
  'Görsel geri yüklenirken hata oluştu': 607,
  'Görsel kalıcı olarak silinirken hata oluştu': 608,
  'Dosya bulunamadı': 609,
  'Görsel silinen klasöre taşınırken hata oluştu': 610,
  
  'İstatistikler yüklenirken hata oluştu': 701,
  'Sayfa parametresi gereklidir': 702,
  'Sayfa görüntüleme takip edilemedi': 703,
  'Slug parametresi gereklidir': 704,
  'Blog yazısı görüntüleme takip edilemedi': 705,
  'Analitik veriler alınamadı': 706,
  'İstatistik verileri temizlenirken hata oluştu': 707,
  'İstatistik verisi doğrulaması başarısız': 708,
  'İstatistik verileri doğrulanamadı': 709,
  'Önbellek istatistikleri alınamadı': 710,
  'Önbellek temizlenirken hata oluştu': 711,
  
  'Site yapılandırması okunamadı': 801,
  'Site yapılandırması güncellenirken hata oluştu': 802,
  'Dosya adı gereklidir': 803,
  'İkon dosyası bulunamadı': 804,
  'Sistem ikonu ayarlanırken hata oluştu': 805,
  'Kullanıcı bilgileri kaydedilemedi': 806,
  'Hesap güncellenirken hata oluştu': 807,
  'Kullanıcı bilgileri alınamadı': 808,
  'Kullanıcı bulunamadı': 809,
  'Mevcut şifre yanlış': 810,
  
  'Tema ayarları kaydedilirken hata oluştu': 901,
  'Tema ayarları güncellenirken hata oluştu': 902,
  'Tema sıfırlanırken hata oluştu': 903,
  
  'Oturum bilgisi alınamadı': 1001,
  'Oturum istatistikleri alınamadı': 1002,
  'Oturum bulunamadı': 1003,
  'Oturum sonlandırılırken hata oluştu': 1004,
  'Oturumlar sonlandırılırken hata oluştu': 1005,
  'IP adresi gerekli': 1006,
  'IP engellenirken hata oluştu': 1007,
  'Loglar temizlenirken hata oluştu': 1008,
  'Güvenlik verileri alınamadı': 1009,
  
  'Bu IP adresinden çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.': 1101,
  'Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.': 1102,
  
  'Sunucu hatası': 1201,
  'Kaynak bulunamadı': 1202,
  'Production modunda origin header gereklidir': 1203,
  'Geçersiz origin formatı': 1204,
  'CORS politikası ihlali': 1205,
  'RSS feed oluşturulurken hata oluştu': 1206,
  
  'Konsol logları kaydedilemedi': 1301,
  'Konsol logları okunamadı': 1302,
  'Loglar temizlenirken hata oluştu': 1303,
  
  // Additional error messages that might appear
  'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın!': 105,
  'İstatistikler yüklenirken hata oluştu!': 701,
  'Editöre yönlendirilirken hata oluştu!': 1201,
  'Lütfen yayın tarihini seçin!': 208,
  'Blog yazısı bulunamadı!': 402,
  'Önizleme açılırken hata oluştu!': 1201,
  'Geri dönüşüm kutusunda silinecek yazı bulunamadı!': 413,
  'Geri dönüşüm kutusunda geçerli silinmiş yazı bulunamadı!': 413,
  'Yorumlar yüklenirken hata oluştu!': 501,
  'Geri dönüşüm kutusu yüklenirken hata oluştu!': 410,
  'İşlem sırasında hata oluştu!': 1201,
  'Güvenlik verileri yüklenirken hata oluştu!': 1009,
  'Oturum başarıyla sonlandırıldı!': null, // Success message
  'Oturum sonlandırılırken hata oluştu!': 1004,
  'Tüm oturumlar başarıyla sonlandırıldı!': null, // Success message
  'Oturumlar sonlandırılırken hata oluştu!': 1005,
  'IP engellenirken hata oluştu!': 1007,
  'Hatalı giriş logları başarıyla temizlendi!': null, // Success message
  'Loglar temizlenirken hata oluştu!': 1008,
  'Lütfen önce giriş yapın!': 101,
  'Site ayarları yüklenirken hata oluştu!': 801,
  'Site ayarları yüklenemedi! Lütfen sayfayı yenileyin.': 801,
  'Lütfen tüm zorunlu alanları doldurun!': 202,
  'Ana ekran başarıyla güncellendi!': null, // Success message
  'Değişiklikler kaydedilirken hata oluştu!': 802,
  'Taslak kaydedildi!': null, // Success message
  'Taslak kaydedilirken hata oluştu!': 407,
  'Kullanıcı adı en az 3 karakter olmalıdır!': 213,
  'Mevcut şifrenizi girmelisiniz!': 109,
  'Yeni şifre en az 6 karakter olmalıdır!': 214,
  'Yeni şifreler eşleşmiyor!': 202,
  'Hesap ayarları başarıyla güncellendi! Yeni bilgilerle giriş yapmanız gerekiyor.': null, // Success message
  'Hesap ayarları kaydedilirken hata oluştu!': 807,
  'Tema başarıyla kaydedildi!': null, // Success message
  'Tema kaydedilirken hata oluştu!': 901,
  'Tema varsayılan ayarlara döndürüldü!': null, // Success message
  'Yükleme başarısız': 304,
  'Upload failed': 304,
  'Avatar yüklenirken hata oluştu': 304,
  'JSON bekleniyordu ancak alındı': 1201,
};

/**
 * Get numeric error code from error object or message
 * @param {Error|Object|string} error - Error object, response data, or error message
 * @returns {number|null} - Numeric error code or null if not found
 */
function getErrorCode(error) {
  // If error is a string (message), try to find code from message
  if (typeof error === 'string') {
    // Direct match
    if (ERROR_MESSAGE_TO_CODE[error]) {
      return ERROR_MESSAGE_TO_CODE[error];
    }
    // Try partial match (message contains key or key contains message)
    for (const [key, code] of Object.entries(ERROR_MESSAGE_TO_CODE)) {
      if (code && (error.includes(key) || key.includes(error))) {
        return code;
      }
    }
    return null;
  }
  
  // If error has code property (from API response)
  if (error && error.code) {
    // First try direct mapping (string code like "VALIDATION_ERROR")
    if (ERROR_CODE_MAP[error.code]) {
      return ERROR_CODE_MAP[error.code];
    }
    // If code is already numeric, return it
    if (typeof error.code === 'number') {
      return error.code;
    }
  }
  
  // If error has responseData property (from API service)
  if (error && error.responseData) {
    if (error.responseData.code) {
      if (ERROR_CODE_MAP[error.responseData.code]) {
        return ERROR_CODE_MAP[error.responseData.code];
      }
      if (typeof error.responseData.code === 'number') {
        return error.responseData.code;
      }
    }
    if (error.responseData.error) {
      const message = error.responseData.error;
      if (ERROR_MESSAGE_TO_CODE[message]) {
        return ERROR_MESSAGE_TO_CODE[message];
      }
      // Try partial match
      for (const [key, code] of Object.entries(ERROR_MESSAGE_TO_CODE)) {
        if (code && (message.includes(key) || key.includes(message))) {
          return code;
        }
      }
    }
  }
  
  // If error has error property (API response with error message)
  if (error && error.error) {
    const message = error.error;
    if (ERROR_MESSAGE_TO_CODE[message]) {
      return ERROR_MESSAGE_TO_CODE[message];
    }
    // Try partial match
    for (const [key, code] of Object.entries(ERROR_MESSAGE_TO_CODE)) {
      if (code && (message.includes(key) || key.includes(message))) {
        return code;
      }
    }
  }
  
  // If error has message property
  if (error && error.message) {
    const message = error.message;
    if (ERROR_MESSAGE_TO_CODE[message]) {
      return ERROR_MESSAGE_TO_CODE[message];
    }
    // Try partial match
    for (const [key, code] of Object.entries(ERROR_MESSAGE_TO_CODE)) {
      if (code && (message.includes(key) || key.includes(message))) {
        return code;
      }
    }
  }
  
  return null;
}

/**
 * Format error message with error code
 * @param {string} message - Error message
 * @param {number|null} code - Error code
 * @returns {string} - Formatted error message
 */
function formatErrorMessage(message, code) {
  if (code) {
    return `${message} [Hata Kodu: ${code}]`;
  }
  return message;
}

/**
 * Log error with code to console
 * @param {Error|Object|string} error - Error object or message
 * @param {string} context - Context where error occurred
 */
function logErrorWithCode(error, context = '') {
  const errorCode = getErrorCode(error);
  const errorMessage = typeof error === 'string' ? error : (error?.message || error?.error || 'Bilinmeyen hata');
  
  if (errorCode) {
    console.error(`🚨 ${context ? context + ' - ' : ''}Hata Kodu: ${errorCode}`);
    console.error(`📋 Mesaj: ${errorMessage}`);
    console.error(`📖 Detaylar için: docs/HATA_KODLARI_REHBERI.md dosyasında "${errorCode}" kodunu arayın`);
  } else {
    console.error(`🚨 ${context ? context + ' - ' : ''}${errorMessage}`);
  }
}

// Make functions globally available
if (typeof window !== 'undefined') {
  window.getErrorCode = getErrorCode;
  window.formatErrorMessage = formatErrorMessage;
  window.logErrorWithCode = logErrorWithCode;
  window.ERROR_CODE_MAP = ERROR_CODE_MAP;
  window.ERROR_MESSAGE_TO_CODE = ERROR_MESSAGE_TO_CODE;
}

console.log('📦 Error Code Mapper Module loaded');

