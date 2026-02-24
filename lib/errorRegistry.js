/**
 * Error Registry (RFC 7807 Compliant Taxonomy)
 * 
 * Defines all application errors in a standardized format.
 * Categories:
 * AUTH (1000s) - Authentication & Authorization
 * VAL  (2000s) - Validation & Bad Requests
 * SYS  (3000s) - System & Server Errors
 * SEC  (4000s) - Security & Rate Limiting
 * FILE (5000s) - File Upload & Processing
 * RES  (6000s) - Resource Operations (Not Found, Conflict)
 */

const ErrorRegistry = {
    // === AUTHENTICATION & AUTHORIZATION (1000s) ===
    'AUTH-1001': {
        type: 'AUTH-1001',
        title: 'Unauthorized Access',
        status: 401,
        detail: 'Authentication is required to access this resource.'
    },
    'AUTH-1002': {
        type: 'AUTH-1002',
        title: 'Token Expired',
        status: 401,
        detail: 'The provided authentication token has expired.'
    },
    'AUTH-1003': {
        type: 'AUTH-1003',
        title: 'Invalid Token',
        status: 401,
        detail: 'The provided authentication token is invalid or malformed.'
    },
    'AUTH-1004': {
        type: 'AUTH-1004',
        title: 'Invalid Credentials',
        status: 401,
        detail: 'The username or password provided is incorrect.'
    },
    'AUTH-1005': {
        type: 'AUTH-1005',
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to perform this action.'
    },
    'AUTH-1006': {
        type: 'AUTH-1006',
        title: 'Session Expired or Invalid',
        status: 401,
        detail: 'Your session has expired or is no longer valid.'
    },

    // === VALIDATION & BAD REQUESTS (2000s) ===
    'VAL-2001': {
        type: 'VAL-2001',
        title: 'Validation Failed',
        status: 400,
        detail: 'One or more fields failed validation. Please check the provided data.'
    },
    'VAL-2002': {
        type: 'VAL-2002',
        title: 'Missing Required Field',
        status: 400,
        detail: 'A required field is missing from the request.'
    },
    'VAL-2003': {
        type: 'VAL-2003',
        title: 'Malformed Request',
        status: 400,
        detail: 'The request payload is malformed or cannot be parsed.'
    },

    // === SYSTEM & SERVER ERRORS (3000s) ===
    'SYS-3001': {
        type: 'SYS-3001',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred on the server.'
    },
    'SYS-3002': {
        type: 'SYS-3002',
        title: 'Data Read Error',
        status: 500,
        detail: 'Failed to read data from the storage system.'
    },
    'SYS-3003': {
        type: 'SYS-3003',
        title: 'Data Write Error',
        status: 500,
        detail: 'Failed to write data to the storage system.'
    },

    // === SECURITY & RATE LIMITING (4000s) ===
    'SEC-4001': {
        type: 'SEC-4001',
        title: 'Rate Limit Exceeded',
        status: 429,
        detail: 'Too many requests have been made from this IP address.'
    },
    'SEC-4002': {
        type: 'SEC-4002',
        title: 'CORS Policy Violation',
        status: 403,
        detail: 'The request violates Cross-Origin Resource Sharing policy.'
    },

    // === FILE OPERATIONS (5000s) ===
    'FILE-5001': {
        type: 'FILE-5001',
        title: 'File Too Large',
        status: 413,
        detail: 'The uploaded file exceeds the maximum allowed size.'
    },
    'FILE-5002': {
        type: 'FILE-5002',
        title: 'Invalid File Type',
        status: 415,
        detail: 'The uploaded file type or extension is not permitted.'
    },
    'FILE-5003': {
        type: 'FILE-5003',
        title: 'No File Uploaded',
        status: 400,
        detail: 'No file was found in the upload request.'
    },

    // === RESOURCE OPERATIONS (6000s) ===
    'RES-6001': {
        type: 'RES-6001',
        title: 'Resource Not Found',
        status: 404,
        detail: 'The requested resource could not be found.'
    },
    'RES-6002': {
        type: 'RES-6002',
        title: 'Resource Conflict',
        status: 409,
        detail: 'A conflict occurred, such as attempting to create a resource that already exists.'
    }
};

/**
 * System Log Registry
 * 
 * Defines standard INFO/WARN logging codes for consistent system tracing,
 * completely segregated from the ErrorRegistry taxonomy.
 */
const SystemLogRegistry = {
    // === ENVIRONMENT & CONFIGURATION (1000s) ===
    'ENV-1000': 'Cevresel degiskenler basariyla yuklendi',
    'ENV-1001': 'JWT_SECRET: AYARLANDI',
    'ENV-1002': 'BCRYPT_SALT_ROUNDS yuklendi',
    'ENV-1003': 'NODE_ENV durumu belirlendi',
    'ENV-1004': 'Gecersiz BCRYPT_SALT_ROUNDS degeri',

    // === SYSTEM INITIALIZATION & OPERATIONS (2000s) ===
    'SYS-2000': 'Oturum Yoneticisi (Session Manager) basariyla baslatildi',
    'SYS-2001': 'Oturum Yoneticisi (Session Manager) baslatilamadi',
    'SYS-2002': 'Sadece temel JWT kimlik dogrulamasi ile devam ediliyor',
    'SYS-2003': 'Log Temizleme Yoneticisi (Cleanup Manager) basariyla baslatildi',
    'SYS-2004': 'Log Temizleme Yoneticisi (Cleanup Manager) baslatilamadi',
    'SYS-2005': 'Istatistik veri dogrulamasi basariyla tamamlandi',
    'SYS-2006': 'RSS akisi basariyla guncellendi',
    'SYS-2007': 'Yonetici tarafindan manuel istatistik veri dogrulamasi istendi',
    'SYS-2008': 'Istatistik verileri dogrulaniyor...',
    'SYS-2009': 'Oturum (session) verileri temizleniyor...',
    'SYS-2010': 'Zamanlanmis oturum (session) temizligi calistiriliyor...',
    'SYS-2011': 'Silinmis gorseller getiriliyor...',
    'SYS-2012': 'Yazar tarafindan silinmis ancak istatistigi kalmis (yoksun/orphaned) yazi datalari bulundu',
    'SYS-2013': 'Istatistik (stats) kaydi bulunmayan yeni yazilar tespit edildi',
    'SYS-2014': 'Site haritasi (sitemap) basariyla guncellendi',
    'SYS-2015': 'Analitik veriler (tum zamanlar / gun bazinda) istendi',
    'SYS-2016': 'Istatistik verileri basariyla temizlendi',

    // === AUTHENTICATION LOGS (8000s) ===
    'AUTH-8000': 'Giris istegi alindi',
    'AUTH-8001': 'Basarili giris',
    'AUTH-8002': 'Kullanici basariyla cikis yapti',
    'AUTH-8003': 'Erisim token\'ı gereklidir',
    'AUTH-8004': 'Gecersiz veya suresi dolmus token',
    'AUTH-8005': 'Oturum dogrulama basarisiz, JWT ile devam ediliyor',
    'AUTH-8006': 'Kimlik dogrulama hatasi',
    'AUTH-8007': 'Hatali giris denemesi',

    // === FILE OPERATION LOGS (8000s) ===
    'FILE-8000': 'Dosya basariyla hedef klasore tasindi',
    'FILE-8001': 'Hedef klasore dosya yuklemesi basarili',

    // === SERVER LIFECYCLE (8000s) ===
    'SYS-8000': 'Personal Site - Admin API Sunucusu portunda calisiyor',
    'SYS-8001': 'Guvenlik ve Oturum Yonetim Sistemi (Session Management) aktif',
    'SYS-8002': 'Istatistik Veri Dogrulama ve Temizleme Sistemi aktif',
    'SYS-8003': 'Otomatik Oturum Temizleme Sistemi aktif'
};

/**
 * Retrieves an error definition by code, returning a generic SYS-3001 if not found.
 * @param {string} code - The error type code (e.g., 'AUTH-1001')
 * @returns {Object} The RFC 7807 compliant error object
 */
function getErrorDef(code) {
    return ErrorRegistry[code] || ErrorRegistry['SYS-3001'];
}

module.exports = {
    ErrorRegistry,
    SystemLogRegistry,
    getErrorDef
};
