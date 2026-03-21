// ====== Merkezi Versiyon Tanımı (version.js'den okunur) ======
const { APP_VERSION } = require('./src/js/version');

// nodemon restart trigger
// Load environment variables
require('dotenv').config();

const Logger = require('./lib/logger');
const { AppError, globalErrorHandler, setupProcessErrorHandlers } = require('./lib/errorHandler');
const { validateRequired, generateRequestId } = require('./lib/utils');

// Environment Variables Validation
const requiredEnvVars = ['JWT_SECRET', 'BCRYPT_SALT_ROUNDS'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  Logger.error('❌ CRITICAL ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    Logger.error(`   - ${varName}`);
  });
  Logger.error('💡 Please check your .env file and ensure all required variables are set.');
  Logger.error('💡 Copy env.example to .env and fill in the required values.');
  Logger.error('🚨 System will exit for security reasons.');
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  Logger.error('❌ CRITICAL ERROR: JWT_SECRET must be at least 32 characters long for security.');
  Logger.error('🚨 System will exit for security reasons.');
  process.exit(1);
}

// Configurable Logger
const isProduction = process.env.NODE_ENV === 'production';

Logger.info('[ENV-1000] Cevresel degiskenler basariyla yuklendi');
Logger.info(`[ENV-1001] JWT_SECRET: ${process.env.JWT_SECRET ? 'AYARLANDI (' + process.env.JWT_SECRET.length + ' karakter)' : 'AYARLANMADI'}`);
Logger.info(`[ENV-1002] BCRYPT_SALT_ROUNDS: ${process.env.BCRYPT_SALT_ROUNDS}`);
Logger.info(`[ENV-1003] NODE_ENV: ${process.env.NODE_ENV || 'AYARLANMADI'} (CSP ${process.env.NODE_ENV === 'production' ? 'URETIM' : 'GELISTIRME'} modunda calisacak)`);

// Validate and set BCRYPT_SALT_ROUNDS with safe default
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
if (isNaN(BCRYPT_SALT_ROUNDS) || BCRYPT_SALT_ROUNDS < 10 || BCRYPT_SALT_ROUNDS > 15) {
  Logger.warn(`[ENV-1004] Gecersiz BCRYPT_SALT_ROUNDS degeri, varsayilan kullaniliyor: 12`);
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { exec } = require('child_process');
const { promisify } = require('util');

const SessionManager = require('./lib/sessionManager');
const LogCleanupManager = require('./lib/logCleanupManager');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || 'https://cihanenesdurgun.com';

// ULTRA SIMPLE TEST ENDPOINT - Before ANY middleware
app.get('/api/simple-test', (req, res, next) => {
  res.json({
    success: true,
    message: 'Server is running - no middleware',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test-error', (req, res, next) => {
  next(new AppError('SYS-3001', null, 'This is a deliberate test error to verify the RFC 7807 problem details handler pipeline.'));
});

// Initialize Session Manager with error handling
let sessionManager;
try {
  sessionManager = new SessionManager();
  Logger.info('[SYS-2000] Oturum Yoneticisi (Session Manager) basariyla baslatildi');
} catch (error) {
  Logger.error('[SYS-2001] Oturum Yoneticisi (Session Manager) baslatilamadi:', error);
  Logger.info('[SYS-2002] Sadece temel JWT kimlik dogrulamasi ile devam ediliyor');
  sessionManager = null;
}

// Initialize Log Cleanup Manager
let logCleanupManager;
try {
  logCleanupManager = new LogCleanupManager(30); // 30 days retention
  logCleanupManager.scheduleCleanup();
  Logger.info('[SYS-2003] Log Temizleme Yoneticisi (Cleanup Manager) basariyla baslatildi');
} catch (error) {
  Logger.error('[SYS-2004] Log Temizleme Yoneticisi (Cleanup Manager) baslatilamadi:', error);
  logCleanupManager = null;
}

// Rate Limiting Configuration
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 1000 : 100000); // Very high limit for development
const rateLimitWindow = 15 * 60 * 1000; // 15 minutes

// Skip rate limiting in development mode
const generalLimiter = process.env.NODE_ENV === 'production' ? rateLimit({
  windowMs: rateLimitWindow,
  max: rateLimitMax,
  message: {
    error: 'Bu IP adresinden çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
    retryAfter: Math.ceil(rateLimitWindow / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    Logger.warn(`🚨 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Bu IP adresinden çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
      retryAfter: Math.ceil(rateLimitWindow / 1000)
    });
  }
}) : (req, res, next) => next(); // No rate limiting in development

// Stricter rate limiting for login attempts
const loginLimiter = process.env.NODE_ENV === 'production' ? rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per 15 minutes
  message: {
    error: 'Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    Logger.warn(`🚨 Login rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.',
      retryAfter: 900
    });
  }
}) : (req, res, next) => next(); // No rate limiting in development

// CORS Configuration - Enhanced Security
const allowedOrigins = process.env.CORS_ORIGIN ?
  process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) :
  ['http://localhost:3000', 'http://127.0.0.1:3000', SITE_URL, SITE_URL.replace('://', '://www.')];

const corsOptions = {
  origin: function (origin, callback) {
    // In production, be extremely strict
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        Logger.warn('🚨 Production: Request blocked - No origin header');
        return callback(new Error('Production modunda origin header gereklidir'), false);
      }

      // Validate origin format in production - allow localhost and 127.0.0.1 for local production testing
      const isLocal = /^(https?:\/\/localhost|https?:\/\/127\.0\.0\.1)(:[0-9]+)?$/.test(origin);
      const isValidRemote = /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::[0-9]+)?$/.test(origin);

      if (!isLocal && !isValidRemote) {
        Logger.warn(`🚨 Production: Invalid origin format: ${origin}`);
        return callback(new Error('Geçersiz origin formatı'), false);
      }
    }

    // Development mode - allow localhost and 127.0.0.1
    if (process.env.NODE_ENV !== 'production') {
      if (!origin) {
        // Logger.info('🔧 Development: Allowing request without origin'); // Muted to prevent log flooding
        return callback(null, true);
      }

      // Allow localhost and 127.0.0.1 in development
      if (/^(http:\/\/localhost|http:\/\/127\.0\.0\.1)(:[0-9]+)?$/.test(origin)) {
        // Logger.info(`🔧 Development: Allowing local origin: ${origin}`); // Muted to prevent log flooding
        return callback(null, true);
      }
    }

    // Check against allowed origins or same-domain variants
    const siteDomain = new URL(SITE_URL).hostname;
    const isSameDomain = origin && (origin.endsWith('.' + siteDomain) || origin === SITE_URL || origin === SITE_URL.replace('://', '://www.'));

    if (allowedOrigins.indexOf(origin) !== -1 || isSameDomain) {
      if (isSameDomain && allowedOrigins.indexOf(origin) === -1) {
        Logger.info(`✅ CORS: Allowed same-domain origin: ${origin}`);
      }
      callback(null, true);
    } else {
      Logger.warn(`🚨 CORS blocked request from origin: ${origin}`);
      callback(new AppError('AUTH-1002', 403, `CORS politikası ihlali - Origin '${origin}' izin verilmemiş`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Origin',
    'Accept',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight for 24 hours
};

// Apply security middleware - CORS only for API routes
app.use('/api', cors(corsOptions));
app.use(generalLimiter); // Rate limiting enabled for security

// Webhook endpoint needs raw body for signature verification
// Add raw body parser for webhook endpoint only
app.use('/api/webhook/deploy', bodyParser.raw({ type: 'application/json', limit: '10mb' }));

// Regular body parsers for other endpoints
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced Security Headers
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS Protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Feature policy / Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()');

  // Content Security Policy (CSP) - Basic protection
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'"
    );
  } else {
    // Development mode - more permissive CSP
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; " +
      "frame-ancestors 'none'"
    );
  }

  // HSTS (HTTP Strict Transport Security) - Production only
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Remove server identification
  res.removeHeader('X-Powered-By');

  next();
});

// JWT Secret from environment variables (validated above)
const JWT_SECRET = process.env.JWT_SECRET;

// File paths
const POSTS_FILE = path.join(__dirname, 'content', 'posts.json');
const CONTENT_DIR = path.join(__dirname, 'content', 'posts');
const STATS_FILE = path.join(__dirname, 'data', 'stats.json');
const COMMENTS_FILE = path.join(__dirname, 'data', 'comments.json'); // NEW
const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json'); // Security & Sessions
const THEME_FILE = path.join(__dirname, 'data', 'theme.json'); // Theme settings

// Ensure directories exist
fs.ensureDirSync(CONTENT_DIR);
fs.ensureDirSync(path.join(__dirname, 'data'));

// ====== File Upload Security Configuration ======
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// File filter function for security
const fileFilter = (req, file, cb) => {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Dosya tipi izin verilmiyor. İzin verilen tipler: ${ALLOWED_FILE_TYPES.join(', ')}`), false);
  }

  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return cb(new Error(`Dosya uzantısı izin verilmiyor. İzin verilen uzantılar: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return cb(new Error(`Dosya çok büyük. Maksimum boyut: ${MAX_FILE_SIZE / (1024 * 1024)}MB`), false);
  }

  // File is valid
  cb(null, true);
};

// Multer configuration for secure file uploads

// Sanitize filename for URL-safe usage
function sanitizeFilename(originalName, postTitle) {
  const ext = path.extname(originalName).toLowerCase();
  let baseName = path.basename(originalName, ext);

  // Turkish character map
  const trMap = {
    'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U',
    'â': 'a', 'Â': 'A', 'î': 'i', 'Î': 'I', 'û': 'u', 'Û': 'U'
  };

  // Check if original name needs sanitizing
  const needsSanitize = /[^a-zA-Z0-9._-]/.test(baseName);

  if (needsSanitize) {
    // Try to use post title first for a meaningful name
    let cleanBase = (postTitle || baseName);

    // Replace Turkish chars
    cleanBase = cleanBase.replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, c => trMap[c] || c);

    // Replace spaces and non-alphanumeric chars with hyphens
    cleanBase = cleanBase
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // Remove accents
      .replace(/[^a-zA-Z0-9]/g, '-')                       // Non-alphanum → hyphen
      .replace(/-+/g, '-')                                   // Collapse hyphens
      .replace(/^-|-$/g, '')                                 // Trim hyphens
      .toLowerCase()
      .substring(0, 60);                                     // Limit length

    // Add timestamp for uniqueness
    const timestamp = new Date().toISOString()
      .replace(/[T:]/g, '-')
      .replace(/\..+/, '')   // e.g. 2026-02-27-00-33
      .substring(0, 16);

    // If cleanBase is empty after sanitizing, use a generic prefix
    if (!cleanBase) cleanBase = 'gorsel';

    return `${cleanBase}-${timestamp}${ext}`;
  }

  // Original name is already clean
  return originalName;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/')
  },
  filename: function (req, file, cb) {
    // Use post title from request body if available
    const postTitle = req.body.postTitle || null;
    const safeFilename = sanitizeFilename(file.originalname, postTitle);

    Logger.info(`[FILE-8002] Dosya adi duzenlendi: "${file.originalname}" -> "${safeFilename}"`);
    cb(null, safeFilename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only one file at a time
  }
});

// ====== Hybrid Authentication Middleware ======
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!token) {
      Logger.warn('[AUTH-8003] Erişim token\'ı gereklidir', { endpoint: req.path, method: req.method });
      return next(new AppError('AUTH-1001', null, 'Erişim token\'ı gereklidir'));
    }

    // First, validate JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      Logger.warn('[AUTH-8004] Gecersiz veya suresi dolmus token', { endpoint: req.path, method: req.method, jwtError: err.name });
      return next(new AppError('AUTH-1001', err, 'Gecersiz veya suresi dolmus token'));
    }

    // If session manager is available, use enhanced validation
    if (sessionManager) {
      try {
        const session = await sessionManager.validateSession(token, ip, userAgent);
        if (session) {
          req.user = {
            username: session.username,
            sessionId: session.id,
            loginTime: session.loginTime,
            lastActivity: session.lastActivity
          };
          req.session = session;
        } else {
          return next(new AppError('AUTH-1005', 403, 'Oturum süresi dolmuş veya geçersiz'));
        }
      } catch (sessionError) {
        Logger.warn('[AUTH-8005] Oturum dogrulama basarisiz, JWT ile devam ediliyor:', sessionError.message);
        // Fallback to basic JWT validation
        req.user = decoded;
      }
    } else {
      // Basic JWT validation only
      req.user = decoded;
    }

    next();
  } catch (error) {
    Logger.error('[AUTH-8006] Kimlik dogrulama hatasi:', error);
    return next(new AppError('SYS-3001', 500, 'Kimlik doğrulama başarısız'));
  }
};

// ====== File I/O Caching System ======
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000,        // 5 minutes cache TTL
  MAX_SIZE: 100,              // Maximum 100 cached items
  CLEANUP_INTERVAL: 10 * 60 * 1000  // Cleanup every 10 minutes
};

class FileCache {
  constructor() {
    this.cache = new Map();
    this.accessCount = new Map();
    this.lastAccess = new Map();
  }

  // Get cached data
  get(key) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < CACHE_CONFIG.TTL) {
      // Update access tracking
      this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
      this.lastAccess.set(key, Date.now());
      return item.data;
    }
    return null;
  }

  // Set cache data
  set(key, data) {
    // Check cache size limit
    if (this.cache.size >= CACHE_CONFIG.MAX_SIZE) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
    this.accessCount.set(key, 1);
    this.lastAccess.set(key, Date.now());
  }

  // Invalidate cache
  invalidate(key) {
    this.cache.delete(key);
    this.accessCount.delete(key);
    this.lastAccess.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.accessCount.clear();
    this.lastAccess.clear();
  }

  // Evict least recently used items
  evictLRU() {
    if (this.cache.size === 0) return;

    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.lastAccess) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.invalidate(oldestKey);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: CACHE_CONFIG.MAX_SIZE,
      hitRate: this.calculateHitRate(),
      memoryUsage: process.memoryUsage()
    };
  }

  // Calculate cache hit rate
  calculateHitRate() {
    const totalAccesses = Array.from(this.accessCount.values()).reduce((a, b) => a + b, 0);
    const cacheHits = Array.from(this.accessCount.values()).reduce((a, b) => a + Math.max(0, b - 1), 0);
    return totalAccesses > 0 ? (cacheHits / totalAccesses * 100).toFixed(2) : '0.00';
  }
}

// Initialize global file cache
const fileCache = new FileCache();

// ====== Helper Functions with Caching ======
const readUsersFile = async () => {
  const cacheKey = 'users.json';
  let cachedData = fileCache.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  try {
    const data = await fs.readFile(path.join(__dirname, 'data', 'users.json'), 'utf8');
    const parsedData = JSON.parse(data);

    // Cache the data
    fileCache.set(cacheKey, parsedData);

    return parsedData;
  } catch (error) {
    Logger.error('Error reading users file:', error);
    // Create default admin user with secure random password
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(defaultPassword, BCRYPT_SALT_ROUNDS);
    const defaultData = {
      admin: {
        username: 'admin',
        password: hashedPassword,
        lastUpdated: new Date().toISOString(),
        isHashed: true
      }
    };

    Logger.info('🔐 Default admin user created with secure password');
    Logger.info('⚠️  IMPORTANT: Change the default password immediately after first login!');

    // Cache the default data
    fileCache.set(cacheKey, defaultData);

    return defaultData;
  }
};

const writeUsersFile = async (users) => {
  try {
    await fs.writeFile(path.join(__dirname, 'data', 'users.json'), JSON.stringify(users, null, 2));

    // Invalidate cache after write
    fileCache.invalidate('users.json');

    return true;
  } catch (error) {
    Logger.error('Error writing users file:', error);
    return false;
  }
};

// ====== Image-Tag Registry Functions ======
const IMAGE_TAGS_FILE = path.join(__dirname, 'data', 'image-tags.json');

const readImageTags = async () => {
  try {
    if (await fs.pathExists(IMAGE_TAGS_FILE)) {
      return await fs.readJson(IMAGE_TAGS_FILE);
    }
    return {};
  } catch (error) {
    Logger.error('Error reading image-tags.json:', error);
    return {};
  }
};

const writeImageTags = async (tags) => {
  try {
    await fs.writeJson(IMAGE_TAGS_FILE, tags, { spaces: 2 });
    return true;
  } catch (error) {
    Logger.error('Error writing image-tags.json:', error);
    return false;
  }
};

// Add a postSlug tag to an image path. Idempotent — won't duplicate.
const addImageTag = async (imagePath, postSlug) => {
  if (!imagePath || !postSlug) return;
  const tags = await readImageTags();
  if (!tags[imagePath]) tags[imagePath] = [];
  if (!tags[imagePath].includes(postSlug)) {
    tags[imagePath].push(postSlug);
  }
  await writeImageTags(tags);
};

// Remove a postSlug from all images. Returns array of image paths now fully orphaned (no slugs left).
const removePostFromImageTags = async (postSlug) => {
  const tags = await readImageTags();
  const orphaned = [];

  for (const [imagePath, slugs] of Object.entries(tags)) {
    if (!slugs.includes(postSlug)) continue;
    const remaining = slugs.filter(s => s !== postSlug);
    if (remaining.length === 0) {
      orphaned.push(imagePath);
      delete tags[imagePath];
    } else {
      tags[imagePath] = remaining;
    }
  }

  await writeImageTags(tags);
  return orphaned; // e.g. ["images/blog-covers/photo.jpg", "images/blog-content/img.png"]
};


const readSessionsFile = async () => {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    Logger.error('Error reading sessions file:', error);
    return { activeSessions: [], loginHistory: [], failedLogins: [] };
  }
};

// ====== Session Data Cleanup & Management ======
const SESSION_LIMITS = {
  ACTIVE_SESSIONS: 10,        // Maximum 10 active sessions per user
  LOGIN_HISTORY: 100,         // Keep last 100 login records
  FAILED_LOGINS: 200,         // Keep last 200 failed login attempts
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,  // 24 hours
  CLEANUP_INTERVAL: 60 * 60 * 1000        // Cleanup every hour
};

const cleanupSessionData = async () => {
  try {
    const sessions = await readSessionsFile();
    const now = Date.now();
    let cleaned = false;

    // Clean up expired active sessions
    const validActiveSessions = sessions.activeSessions.filter(session => {
      const sessionAge = now - new Date(session.lastActivity).getTime();
      return sessionAge < SESSION_LIMITS.SESSION_TIMEOUT;
    });

    if (validActiveSessions.length !== sessions.activeSessions.length) {
      sessions.activeSessions = validActiveSessions;
      cleaned = true;
      Logger.info(`🧹 Cleaned up ${sessions.activeSessions.length - validActiveSessions.length} expired sessions`);
    }

    // Limit active sessions per user
    const userSessionCounts = {};
    const limitedActiveSessions = [];

    validActiveSessions.forEach(session => {
      if (!userSessionCounts[session.username]) {
        userSessionCounts[session.username] = 0;
      }

      if (userSessionCounts[session.username] < SESSION_LIMITS.ACTIVE_SESSIONS) {
        limitedActiveSessions.push(session);
        userSessionCounts[session.username]++;
      }
    });

    if (limitedActiveSessions.length !== validActiveSessions.length) {
      sessions.activeSessions = limitedActiveSessions;
      cleaned = true;
      Logger.info(`🧹 Limited active sessions to ${SESSION_LIMITS.ACTIVE_SESSIONS} per user`);
    }

    // Limit login history
    if (sessions.loginHistory.length > SESSION_LIMITS.LOGIN_HISTORY) {
      sessions.loginHistory = sessions.loginHistory.slice(0, SESSION_LIMITS.LOGIN_HISTORY);
      cleaned = true;
      Logger.info(`🧹 Limited login history to ${SESSION_LIMITS.LOGIN_HISTORY} records`);
    }

    // Limit failed logins
    if (sessions.failedLogins.length > SESSION_LIMITS.FAILED_LOGINS) {
      sessions.failedLogins = sessions.failedLogins.slice(0, SESSION_LIMITS.FAILED_LOGINS);
      cleaned = true;
      Logger.info(`🧹 Limited failed logins to ${SESSION_LIMITS.FAILED_LOGINS} records`);
    }

    // Save cleaned data if any changes
    if (cleaned) {
      await writeSessionsFile(sessions);
      Logger.info('✅ Session data cleanup completed');
    }

    return sessions;
  } catch (error) {
    Logger.error('Error during session cleanup:', error);
    return null;
  }
};

const writeSessionsFile = async (sessions) => {
  try {
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    return true;
  } catch (error) {
    Logger.error('Error writing sessions file:', error);
    return false;
  }
};

// ====== Theme Management Functions ======
const readThemeFile = async () => {
  const defaultTheme = {
    light: {
      bg: '#f8f8f6',
      panel: '#fafaf8',
      ink: '#0b0b0b',
      muted: '#6b7280',
      line: '#e5e7eb',
      accent: '#A67B5B'
    },
    dark: {
      bg: '#0b0d0f',
      panel: '#14171a',
      ink: '#e8edf2',
      muted: '#9aa4b2',
      line: '#2a2f35',
      accent: '#A67B5B'
    },
    borderRadius: 16,
    shadowIntensity: 60,
    fontFamily: 'Inter'
  };

  try {
    // Check if file exists first
    let exists = false;
    try {
      exists = await fs.pathExists(THEME_FILE);
    } catch (pathError) {
      Logger.warn('⚠️ Error checking theme file existence:', pathError.message);
      return defaultTheme;
    }

    if (!exists) {
      Logger.warn('⚠️ Theme file does not exist, using defaults');
      return defaultTheme;
    }

    let data;
    try {
      data = await fs.readFile(THEME_FILE, 'utf8');
    } catch (readError) {
      Logger.warn('⚠️ Error reading theme file:', readError.message);
      return defaultTheme;
    }

    if (!data || data.trim().length === 0) {
      Logger.warn('⚠️ Theme file is empty, using defaults');
      return defaultTheme;
    }

    let theme;
    try {
      theme = JSON.parse(data);
    } catch (parseError) {
      Logger.warn('⚠️ Error parsing theme JSON:', parseError.message);
      return defaultTheme;
    }

    // Validate theme structure
    if (!theme || typeof theme !== 'object') {
      Logger.warn('⚠️ Invalid theme JSON structure, using defaults');
      return defaultTheme;
    }

    // Ensure required properties exist
    if (!theme.light || !theme.dark || typeof theme.light !== 'object' || typeof theme.dark !== 'object') {
      Logger.warn('⚠️ Theme missing light/dark configuration, using defaults');
      return defaultTheme;
    }

    return theme;
  } catch (error) {
    Logger.error('❌ Unexpected error in readThemeFile:', error.message);
    Logger.error('Error stack:', error.stack);
    // Always return default theme, never throw
    return defaultTheme;
  }
};

const writeThemeFile = async (theme) => {
  try {
    await fs.writeFile(THEME_FILE, JSON.stringify(theme, null, 2));
    return true;
  } catch (error) {
    Logger.error('Error writing theme file:', error);
    return false;
  }
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    req.ip;
};

const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'Unknown';
};

const logSuccessfulLogin = async (username, req) => {
  try {
    const sessions = await readSessionsFile();
    const loginRecord = {
      id: Date.now().toString(),
      username,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      timestamp: new Date().toISOString(),
      success: true
    };

    sessions.loginHistory.unshift(loginRecord);

    // Keep only last 100 login records
    if (sessions.loginHistory.length > 100) {
      sessions.loginHistory = sessions.loginHistory.slice(0, 100);
    }

    await writeSessionsFile(sessions);
  } catch (error) {
    Logger.error('Error logging successful login:', error);
  }
};

const logFailedLogin = async (username, req, reason = 'Invalid credentials') => {
  try {
    const sessions = await readSessionsFile();
    const failedLoginRecord = {
      id: Date.now().toString(),
      username,
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      timestamp: new Date().toISOString(),
      reason,
      success: false
    };

    sessions.failedLogins.unshift(failedLoginRecord);

    // Keep only last 200 failed login records
    if (sessions.failedLogins.length > 200) {
      sessions.failedLogins = sessions.failedLogins.slice(0, 200);
    }

    await writeSessionsFile(sessions);
    Logger.warn(`[AUTH-8007] Hatali giris denemesi: ${username} IP: ${getClientIP(req)} Sebep: ${reason}`);
  } catch (error) {
    Logger.error('Error logging failed login:', error);
  }
};

const addActiveSession = async (username, token, req) => {
  try {
    const sessions = await readSessionsFile();
    const sessionRecord = {
      id: Date.now().toString(),
      username,
      token: token.substring(0, 20) + '...', // Only store partial token for security
      ip: getClientIP(req),
      userAgent: getUserAgent(req),
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Remove existing session for this user if exists
    sessions.activeSessions = sessions.activeSessions.filter(s => s.username !== username);
    sessions.activeSessions.unshift(sessionRecord);

    await writeSessionsFile(sessions);
  } catch (error) {
    Logger.error('Error adding active session:', error);
  }
};

const removeActiveSession = async (username) => {
  try {
    const sessions = await readSessionsFile();
    sessions.activeSessions = sessions.activeSessions.filter(s => s.username !== username);
    await writeSessionsFile(sessions);
  } catch (error) {
    Logger.error('Error removing active session:', error);
  }
};

const readPostsFile = async () => {
  try {
    const data = await fs.readFile(POSTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    Logger.error('Error reading posts file:', error);
    return [];
  }
};

const writePostsFile = async (posts) => {
  try {
    await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
    // Trigger automated RSS and Sitemap generation
    setImmediate(async () => {
      await generateRSS();
      await generateSitemap();
    });
    return true;
  } catch (error) {
    Logger.error('Error writing posts file:', error);
    return false;
  }
};

const generateSlug = (title) => {
  // Türkçe karakterleri İngilizce karşılıklarına çevir
  const turkishToEnglish = {
    'Ç': 'C', 'ç': 'c',
    'Ğ': 'G', 'ğ': 'g',
    'İ': 'I', 'ı': 'i',
    'Ö': 'O', 'ö': 'o',
    'Ş': 'S', 'ş': 's',
    'Ü': 'U', 'ü': 'u'
  };

  let slug = title;

  // Türkçe karakterleri değiştir
  Object.keys(turkishToEnglish).forEach(turkishChar => {
    slug = slug.replace(new RegExp(turkishChar, 'g'), turkishToEnglish[turkishChar]);
  });

  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// ====== Statistics Helper Functions ======
const readStatsFile = async () => {
  try {
    const data = await fs.readFile(STATS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return default stats structure if file doesn't exist
    return {
      totalViews: 0,
      pageViews: {},
      postViews: {},
      dailyStats: {},
      lastUpdated: new Date().toISOString()
    };
  }
};

const writeStatsFile = async (stats) => {
  try {
    stats.lastUpdated = new Date().toISOString();
    await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));
    return true;
  } catch (error) {
    Logger.error('Error writing stats file:', error);
    return false;
  }
};

// ====== Stats Data Cleanup & Validation Functions ======
const cleanupStatsData = async () => {
  try {
    const stats = await readStatsFile();
    const posts = await readPostsFile();

    // Get valid post slugs (only published and draft posts)
    const validPostSlugs = posts
      .filter(post => post.status !== 'deleted')
      .map(post => post.slug);

    // Clean up postViews - remove stats for deleted posts
    const cleanedPostViews = {};
    let totalPostViews = 0;

    Object.keys(stats.postViews).forEach(slug => {
      if (validPostSlugs.includes(slug)) {
        cleanedPostViews[slug] = stats.postViews[slug];
        totalPostViews += stats.postViews[slug];
      } else {
        Logger.info(`🧹 Cleaning up stats for deleted post: ${slug}`);
      }
    });

    // Update stats with cleaned data
    stats.postViews = cleanedPostViews;
    stats.totalViews = (stats.pageViews.home || 0) + (stats.pageViews.blog || 0) + totalPostViews;

    // Clean up daily stats - remove references to deleted posts
    Object.keys(stats.dailyStats).forEach(date => {
      if (stats.dailyStats[date].pageViews) {
        // Keep only valid page views
        const validPageViews = {};
        Object.keys(stats.dailyStats[date].pageViews).forEach(page => {
          if (['home', 'blog'].includes(page)) {
            validPageViews[page] = stats.dailyStats[date].pageViews[page];
          }
        });
        stats.dailyStats[date].pageViews = validPageViews;
      }
    });

    // Save cleaned stats
    await writeStatsFile(stats);
    Logger.info(`[SYS-2016] Istatistik verileri basariyla temizlendi. Toplam goruntulenme: ${stats.totalViews}`);

    return stats;
  } catch (error) {
    Logger.error('Error cleaning stats data:', error);
    return null;
  }
};

const validateStatsData = async () => {
  try {
    const stats = await readStatsFile();
    const posts = await readPostsFile();

    // Get valid post slugs
    const validPostSlugs = posts
      .filter(post => post.status !== 'deleted')
      .map(post => post.slug);

    // Check for orphaned stats
    const orphanedStats = Object.keys(stats.postViews).filter(slug => !validPostSlugs.includes(slug));

    if (orphanedStats.length > 0) {
      Logger.info(`[SYS-2012] Yazar tarafindan silinmis ancak istatistigi kalmis (yoksun/orphaned) yazi datalari bulundu: ${orphanedStats.join(', ')}`);
      return false;
    }

    // Check for missing stats
    const missingStats = validPostSlugs.filter(slug => !stats.postViews[slug]);

    if (missingStats.length > 0) {
      Logger.info(`[SYS-2013] Istatistik (stats) kaydi bulunmayan yeni yazilar tespit edildi: ${missingStats.join(', ')}`);
      // Initialize missing stats with 0
      missingStats.forEach(slug => {
        stats.postViews[slug] = 0;
      });
      await writeStatsFile(stats);
    }

    Logger.info('[SYS-2005] Istatistik veri dogrulamasi basariyla tamamlandi');
    return true;
  } catch (error) {
    Logger.error('Error validating stats data:', error);
    return false;
  }
};

const categorizeSource = (referrer) => {
  if (!referrer || typeof referrer !== 'string' || referrer.trim() === '') return 'Direct';

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('linkedin.com')) return 'LinkedIn';
    if (hostname.includes('google.') || hostname.includes('bing.') || hostname.includes('yahoo.')) return 'Search Engine';
    if (hostname.includes('twitter.com') || hostname.includes('t.co') || hostname.includes('x.com')) return 'Twitter (X)';
    if (hostname.includes('github.com')) return 'GitHub';
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'Facebook';
    if (hostname.includes('instagram.com')) return 'Instagram';

    // Ignore self-referrals
    if (hostname.includes('cihanenesdurgun.com') || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'Internal';
    }

    return 'Other';
  } catch (e) {
    return 'Other'; // Invalid URL parsing
  }
};

const incrementPageView = async (page, referrerSource = null) => {
  const stats = await readStatsFile();
  const sourceCategory = categorizeSource(referrerSource);

  // Initialize global sources if not exists
  if (!stats.sources) stats.sources = {};
  
  // Initialize daily sources for the current day
  const today = new Date().toISOString().split('T')[0];
  if (!stats.dailyStats[today]) {
    stats.dailyStats[today] = {
      totalViews: 0,
      pageViews: {},
      postViews: {},
      sources: {}
    };
  }
  if (!stats.dailyStats[today].sources) {
    stats.dailyStats[today].sources = {};
  }

  // Sadece Internal olmayan tıklamaları kaynak olarak kaydet
  if (sourceCategory !== 'Internal') {
    stats.sources[sourceCategory] = (stats.sources[sourceCategory] || 0) + 1;
    stats.dailyStats[today].sources[sourceCategory] = (stats.dailyStats[today].sources[sourceCategory] || 0) + 1;
  }

  // Increment total views
  stats.totalViews = (stats.totalViews || 0) + 1;

  // Increment page views
  stats.pageViews[page] = (stats.pageViews[page] || 0) + 1;

  // Increment daily stats
  stats.dailyStats[today].totalViews++;
  stats.dailyStats[today].pageViews[page] = (stats.dailyStats[today].pageViews[page] || 0) + 1;

  await writeStatsFile(stats);
  return stats;
};

const incrementPostView = async (slug, referrerSource = null) => {
  const stats = await readStatsFile();
  const sourceCategory = categorizeSource(referrerSource);

  // Initialize global sources
  if (!stats.sources) stats.sources = {};

  // Initialize daily stats
  const today = new Date().toISOString().split('T')[0];
  if (!stats.dailyStats[today]) {
    stats.dailyStats[today] = {
      totalViews: 0,
      pageViews: {},
      postViews: {},
      sources: {}
    };
  }
  if (!stats.dailyStats[today].sources) {
    stats.dailyStats[today].sources = {};
  }

  // Sadece Internal olmayan tıklamaları kaynak olarak kaydet
  if (sourceCategory !== 'Internal') {
    stats.sources[sourceCategory] = (stats.sources[sourceCategory] || 0) + 1;
    stats.dailyStats[today].sources[sourceCategory] = (stats.dailyStats[today].sources[sourceCategory] || 0) + 1;
  }

  // Increment total views
  stats.totalViews = (stats.totalViews || 0) + 1;

  // Increment post views
  stats.postViews[slug] = (stats.postViews[slug] || 0) + 1;

  // Increment daily total and post views
  stats.dailyStats[today].totalViews++;

  // YENİ: Günlük yazı görüntüleme tracking
  if (!stats.dailyStats[today].postViews) {
    stats.dailyStats[today].postViews = {};
  }
  stats.dailyStats[today].postViews[slug] =
    (stats.dailyStats[today].postViews[slug] || 0) + 1;

  await writeStatsFile(stats);
  return stats;
};

// ====== Comments Helper Functions ======
const readCommentsFile = async () => {
  try {
    const data = await fs.readFile(COMMENTS_FILE, 'utf8');
    const commentsData = JSON.parse(data);

    // Migrate old comments to new structure
    Object.keys(commentsData.comments).forEach(slug => {
      commentsData.comments[slug] = commentsData.comments[slug].map(comment => {
        // If comment doesn't have new fields, add them
        if (comment.parent_id === undefined) {
          comment.parent_id = null;
          comment.thread_id = comment.id;
          comment.depth = 0;
          comment.reply_to_name = null;
        }
        return comment;
      });
    });

    return commentsData;
  } catch (error) {
    // Return default comments structure if file doesn't exist
    return {
      comments: {},
      lastUpdated: new Date().toISOString()
    };
  }
};

const writeCommentsFile = async (commentsData) => {
  try {
    commentsData.lastUpdated = new Date().toISOString();
    await fs.writeFile(COMMENTS_FILE, JSON.stringify(commentsData, null, 2));
    return true;
  } catch (error) {
    Logger.error('Error writing comments file:', error);
    return false;
  }
};

const generateCommentId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// ====== RSS Generation Function ======
const generateRSS = async () => {
  try {
    const posts = await readPostsFile();

    // Filter only published posts and sort by date (newest first)
    const publishedPosts = posts
      .filter(post => post.status !== 'deleted' && post.status !== 'draft')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10); // Limit to 10 most recent posts

    const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Cihan Enes Durgun - İHA, Kablosuz Haberleşme ve Gömülü Sistemler</title>
    <description>Meraklı Bir Mühendisin Blogu: Teknoloji, Kişisel Gelişim ve Hayata Dair Düşünceler. İHA, kablosuz haberleşme ve gömülü sistemler üzerine teknik notlar, proje günlükleri ve deneyler</description>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>Cihan Enes Durgun Blog System ${APP_VERSION}</generator>
    
    ${publishedPosts.map(post => {
      const pubDate = new Date(post.date).toUTCString();
      const categories = post.tags ? post.tags.map(tag => `<category>${tag}</category>`).join('\n      ') : '';

      return `    <item>
      <title>${post.title}</title>
      <description>${post.excerpt}</description>
      <link>${SITE_URL}/post.html?slug=${post.slug}</link>
      <guid>${SITE_URL}/post.html?slug=${post.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      ${categories}
    </item>`;
    }).join('\n\n    ')}
  </channel>
</rss>`;

    await fs.writeFile('rss.xml', rssContent, 'utf8');
    Logger.info('[SYS-2006] RSS akisi basariyla guncellendi');
    return true;
  } catch (error) {
    Logger.error('Error generating RSS feed:', error);
    return false;
  }
};

// ====== Sitemap Generation Function ======
const generateSitemap = async () => {
  try {
    const posts = await readPostsFile();

    // Filter only published posts
    const publishedPosts = posts
      .filter(post => post.status !== 'deleted' && post.status !== 'draft')
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Base URLs
    const baseUrl = SITE_URL;
    const currentDate = new Date().toISOString().split('T')[0];

    let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add posts to sitemap
    publishedPosts.forEach(post => {
      const postDate = new Date(post.updatedAt || post.date).toISOString().split('T')[0];
      sitemapContent += `
  <url>
    <loc>${baseUrl}/post.html?slug=${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemapContent += `
</urlset>`;

    await fs.writeFile('sitemap.xml', sitemapContent, 'utf8');
    Logger.info('[SYS-2014] Site haritasi (sitemap) basariyla guncellendi');
    return true;
  } catch (error) {
    Logger.error('Error generating Sitemap:', error);
    return false;
  }
};


// ====== Asset Cleanup System ======
/**
 * Blog yazısına ait görselleri (kapak ve içerik) temizler.
 * Başka bir yazıda kullanılan görselleri koruyarak güvenli silme sağlar.
 * @param {Object} post - Silinen yazı objesi
 * @param {string} content - Silinen yazının markdown içeriği
 */
const cleanupPostAssets = async (post, content) => {
  if (!post) return;

  try {
    const assetsToDelete = [];

    // 1. Kapak Fotoğrafı
    if (post.cover && post.cover.startsWith('images/')) {
      // Sadece blog klasörlerini kontrol et (system/profile hariç)
      if (post.cover.includes('/blog-covers/') || post.cover.includes('/blog-content/')) {
        assetsToDelete.push(post.cover);
      }
    }

    // 2. Markdown İçeriğindeki Görseller
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      const url = match[1];
      if (url.startsWith('images/') && (url.includes('/blog-covers/') || url.includes('/blog-content/'))) {
        assetsToDelete.push(url);
      }
    }

    const uniqueAssets = [...new Set(assetsToDelete)];
    if (uniqueAssets.length === 0) return;

    // 3. Shared Asset Kontrolü
    const posts = await readPostsFile();
    // Diğer yazıları (silinmekte olan hariç) filtrele
    const otherPosts = posts.filter(p => p.slug !== post.slug && p.status !== 'deleted');

    // Performans için diğer yazı içeriklerini bir kez oku
    const otherPostsContent = await Promise.all(otherPosts.map(async p => {
      const mdPath = path.join(CONTENT_DIR, `${p.slug}.md`);
      try {
        if (await fs.pathExists(mdPath)) return await fs.readFile(mdPath, 'utf8');
      } catch (e) { }
      return '';
    }));

    for (const assetPath of uniqueAssets) {
      let isShared = false;
      for (let i = 0; i < otherPosts.length; i++) {
        if (otherPosts[i].cover === assetPath || otherPostsContent[i].includes(assetPath)) {
          isShared = true;
          break;
        }
      }

      if (!isShared) {
        const sanitizedPath = assetPath.replace(/\.\./g, '');
        const fullPath = path.join(__dirname, sanitizedPath);
        if (await fs.pathExists(fullPath)) {
          await fs.remove(fullPath);
          Logger.info(`[FILE-8005] Sahipsiz blog görseli temizlendi: ${assetPath}`);
        }
      } else {
        Logger.info(`[FILE-8006] Görsel başka yazıda kullanımda, silinmedi: ${assetPath}`);
      }
    }
  } catch (error) {
    Logger.error('cleanupPostAssets hatası:', error);
  }
};

// ====== API Routes ======

// Login endpoint with strict rate limiting
app.post('/api/login', loginLimiter, async (req, res, next) => {
  try {
    Logger.info('[AUTH-8000] Giris istegi alindi');
    const { username, password } = req.body;

    if (!username || !password) {
      return next(new AppError('VAL-2001', 400, 'Kullanıcı adı ve şifre gereklidir.'));
    }

    const users = await readUsersFile();

    const user = users[username];

    if (!user) {
      await logFailedLogin(username, req, 'User not found');
      return next(new AppError('AUTH-1001', 401, 'Kullanıcı adı veya şifre hatalı.'));
    }

    // Check if password is hashed or plain text (for migration)
    let isPasswordValid = false;

    if (user.isHashed) {
      // Password is already hashed, compare with bcrypt
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // Password is plain text (old format), migrate to hashed
      if (user.password === password) {
        isPasswordValid = true;
        // Migrate password to hashed format
        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        users[username].password = hashedPassword;
        users[username].isHashed = true;
        users[username].lastUpdated = new Date().toISOString();
        await writeUsersFile(users);
        Logger.info(`Password migrated to hashed format for user: ${username}`);
      }
    }

    if (isPasswordValid) {
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Create session if session manager is available
      if (sessionManager) {
        try {
          const session = await sessionManager.createSession(username, ip, userAgent);

          res.json({
            success: true,
            token: session.token,
            user: {
              username,
              loginTime: session.loginTime,
              sessionId: session.id
            },
            session: {
              expiresAt: session.expiresAt,
              lastActivity: session.lastActivity
            }
          });

          Logger.info(`[AUTH-8001] Basarili giris: ${username} IP: ${ip}`);
        } catch (sessionError) {
          Logger.warn('⚠️  Session creation failed, using basic JWT:', sessionError.message);
          // Fallback to basic JWT with consistent payload
          const fallbackSessionId = 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          const token = jwt.sign({
            username,
            sessionId: fallbackSessionId,
            iat: Math.floor(Date.now() / 1000)
          }, JWT_SECRET, { expiresIn: '24h' });

          res.json({
            success: true,
            token,
            user: {
              username,
              sessionId: fallbackSessionId
            }
          });

          Logger.info(`✅ Successful login (JWT fallback): ${username}`);
        }
      } else {
        // Basic JWT authentication with consistent payload
        const fallbackSessionId = 'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const token = jwt.sign({
          username,
          sessionId: fallbackSessionId,
          iat: Math.floor(Date.now() / 1000)
        }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
          success: true,
          token,
          user: {
            username,
            sessionId: fallbackSessionId
          }
        });

        Logger.info(`✅ Successful login (JWT only): ${username}`);
      }
    } else {
      // Log failed login attempt
      await logFailedLogin(username, req, 'Invalid password');

      if (sessionManager) {
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        await sessionManager.logLoginAttempt(username, ip, userAgent, false);
      }
      res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }
  } catch (error) {
    Logger.error('❌ Login error:', error);
    Logger.error('Error stack:', error.stack);
    Logger.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });

    // Provide more specific error messages
    let errorMessage = 'Giriş yapılırken bir hata oluştu.';
    if (error.message.includes('users file') || error.message.includes('readUsersFile')) {
      errorMessage = 'Kullanıcı veritabanı okunamadı.';
    } else if (error.message.includes('bcrypt') || error.message.includes('hash')) {
      errorMessage = 'Şifre işleme hatası.';
    } else if (error.message.includes('session')) {
      errorMessage = 'Oturum oluşturulamadı.';
    }

    res.status(500).json({
      error: errorMessage,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Logout endpoint
app.post('/api/logout', authenticateToken, async (req, res, next) => {
  try {
    if (sessionManager && req.user.sessionId) {
      await sessionManager.invalidateSession(req.user.sessionId);
      Logger.info(`[AUTH-8002] Kullanici basariyla cikis yapti: ${req.user.username} (Session: ${req.user.sessionId})`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    Logger.error('❌ Logout error:', error);
    next(new AppError('SYS-3001', 500, 'Çıkış yapılamadı'));
  }
});

// Get session info endpoint
app.get('/api/session', authenticateToken, async (req, res, next) => {
  try {
    if (sessionManager && req.session) {
      res.json({
        success: true,
        session: {
          id: req.session.id,
          username: req.session.username,
          loginTime: req.session.loginTime,
          lastActivity: req.session.lastActivity,
          expiresAt: req.session.expiresAt,
          deviceInfo: req.session.sessionData?.deviceInfo
        }
      });
    } else {
      // Fallback for JWT-only mode
      res.json({
        success: true,
        session: {
          username: req.user.username,
          loginTime: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          deviceInfo: { browser: 'Unknown', os: 'Unknown', device: 'Desktop' }
        }
      });
    }
  } catch (error) {
    Logger.error('❌ Session info error:', error);
    next(new AppError('SYS-3001', 500, 'Oturum bilgisi alınamadı'));
  }
});

// Get session statistics (admin only)
app.get('/api/sessions/stats', authenticateToken, async (req, res, next) => {
  try {
    if (sessionManager) {
      const stats = await sessionManager.getSessionStats();

      res.json({
        success: true,
        stats
      });
    } else {
      // Fallback for JWT-only mode
      res.json({
        success: true,
        stats: {
          totalActive: 1,
          totalInactive: 0,
          usersOnline: 1,
          sessionsByUser: { [req.user.username]: 1 },
          recentLogins: []
        }
      });
    }
  } catch (error) {
    Logger.error('❌ Session stats error:', error);
    next(new AppError('SYS-3001', 500, 'Oturum istatistikleri alınamadı'));
  }
});

// Get all posts
app.get('/api/posts', authenticateToken, async (req, res, next) => {
  try {
    const posts = await readPostsFile();
    const stats = await readStatsFile();

    // Add view counts to posts
    const postsWithViews = posts.map(post => ({
      ...post,
      views: stats.postViews[post.slug] || 0
    }));

    res.json(postsWithViews);
  } catch (error) {
    next(new AppError('SYS-3001', 500, 'Blog yazıları yüklenirken hata oluştu'));
  }
});

// Get single post
app.get('/api/posts/:slug', authenticateToken, async (req, res, next) => {
  try {
    const posts = await readPostsFile();
    const post = posts.find(p => p.slug === req.params.slug);

    if (!post) {
      return next(new AppError('RES-6001', 404, 'Blog yazısı bulunamadı'));
    }

    // Read markdown content
    const markdownPath = path.join(CONTENT_DIR, `${post.slug}.md`);
    let content = '';

    try {
      content = await fs.readFile(markdownPath, 'utf8');
    } catch (error) {
      Logger.info('Markdown file not found, using empty content');
    }

    res.json({ ...post, content });
  } catch (error) {
    next(new AppError('SYS-3001', 500, 'Blog yazısı yüklenirken hata oluştu'));
  }
});

// Create new post
app.post('/api/posts', authenticateToken, async (req, res, next) => {
  try {
    const { title, slug: bodySlug, excerpt, date, cover, coverCaption, tags, content, featured, status, publishDate } = req.body;

    // Enhanced input validation
    validateRequired(req.body, ['title', 'excerpt', 'content'], {
      endpoint: '/api/posts',
      method: 'POST',
      user: req.user?.username
    });

    // Additional validation
    if (title.length < 3) {
      const error = new Error('Başlık en az 3 karakter olmalıdır');
      error.code = 'VALIDATION_ERROR';
      error.details = { field: 'title', minLength: 3 };
      throw error;
    }

    if (excerpt.length < 10) {
      const error = new Error('Özet en az 10 karakter olmalıdır');
      error.code = 'VALIDATION_ERROR';
      error.details = { field: 'excerpt', minLength: 10 };
      throw error;
    }

    if (content.length < 50) {
      const error = new Error('İçerik en az 50 karakter olmalıdır');
      error.code = 'VALIDATION_ERROR';
      error.details = { field: 'content', minLength: 50 };
      throw error;
    }

    let slug = bodySlug || generateSlug(title);
    const posts = await readPostsFile();

    // Check if slug already exists. If yes, append random timestamp/hash to make it unique rather than failing
    if (posts.find(p => p.slug === slug)) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const newPost = {
      slug,
      title,
      excerpt,
      date: date || new Date().toISOString(),
      cover: cover || '',
      coverCaption: coverCaption || '',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      featured: featured || false,
      status: status || 'draft', // draft, published, scheduled
      publishDate: publishDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to posts array
    posts.unshift(newPost);

    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Blog yazısı metadata kaydedilirken hata oluştu'));
    }

    // Save markdown content
    const markdownPath = path.join(CONTENT_DIR, `${slug}.md`);
    await fs.writeFile(markdownPath, content);

    // Generate RSS feed after new post creation
    await generateRSS();

    res.json({ success: true, post: newPost });
  } catch (error) {
    Logger.error('Error creating post:', error);
    Logger.error('Error details:', error.message);
    Logger.error('Request body:', req.body);

    // Send more detailed error message to client
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({
        error: error.message,
        details: error.details
      });
    }

    next(new AppError('SYS-3001', 500, 'Blog yazısı oluşturulurken hata oluştu'));
  }
});

// Update post
app.put('/api/posts/:slug', authenticateToken, async (req, res, next) => {
  try {
    const { title, slug: bodySlug, excerpt, date, cover, coverCaption, tags, content, featured, status, publishDate } = req.body;
    const originalSlug = req.params.slug;

    if (!title || !excerpt || !content) {
      return next(new AppError('VAL-2001', 400, 'Eksik gerekli alanlar'));
    }

    let newSlug = bodySlug || generateSlug(title);
    const posts = await readPostsFile();

    const postIndex = posts.findIndex(p => p.slug === originalSlug);
    if (postIndex === -1) {
      return next(new AppError('RES-6001', 404, 'Blog yazısı bulunamadı'));
    }

    // Check if new slug conflicts with other posts (excluding itself)
    if (originalSlug !== newSlug && posts.find(p => p.slug === newSlug)) {
      newSlug = `${newSlug}-${Math.random().toString(36).substring(2, 8)}`;
    }

    const updatedPost = {
      ...posts[postIndex],
      slug: newSlug,
      title,
      excerpt,
      date: date || posts[postIndex].date,
      cover: cover || '',
      coverCaption: coverCaption || '',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      featured: featured || false,
      status: status || posts[postIndex].status,
      publishDate: publishDate !== undefined ? publishDate : posts[postIndex].publishDate,
      updatedAt: new Date().toISOString()
    };

    // Update posts array
    posts[postIndex] = updatedPost;

    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Blog yazısı metadata kaydedilirken hata oluştu'));
    }

    // Save markdown content
    const markdownPath = path.join(CONTENT_DIR, `${newSlug}.md`);
    await fs.writeFile(markdownPath, content);

    // Delete old markdown file if slug changed
    if (originalSlug !== newSlug) {
      const oldMarkdownPath = path.join(CONTENT_DIR, `${originalSlug}.md`);
      try {
        await fs.remove(oldMarkdownPath);
      } catch (error) {
        Logger.info('Old markdown file not found');
      }
    }

    // Generate RSS feed after post update
    await generateRSS();

    res.json({ success: true, post: updatedPost });
  } catch (error) {
    Logger.error('Error updating post:', error);
    next(new AppError('SYS-3001', 500, 'Blog yazısı güncellenirken hata oluştu'));
  }
});

// Tag all images in a post
app.post('/api/posts/:slug/tag-images', authenticateToken, async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();
    const post = posts.find(p => p.slug === slug);

    if (!post) {
      return res.json({ success: true, message: 'Post not found, skipped tagging' });
    }

    let taggedCount = 0;

    // 1. Tag cover image
    if (post.cover && post.cover.startsWith('images/')) {
      await addImageTag(post.cover, slug);
      taggedCount++;
    }

    // 2. Tag images in markdown content
    const markdownPath = path.join(CONTENT_DIR, `${slug}.md`);
    if (await fs.pathExists(markdownPath)) {
      const content = await fs.readFile(markdownPath, 'utf8');
      const imageRegex = /!\[.*?\]\((.*?)\)/g;
      let match;
      while ((match = imageRegex.exec(content)) !== null) {
        let imgSrc = match[1];
        // Clean up URL if encoded
        try { imgSrc = decodeURIComponent(imgSrc); } catch (e) { }

        // We only tag local images managed by our gallery
        if (imgSrc.startsWith('images/')) {
          await addImageTag(imgSrc, slug);
          taggedCount++;
        } else if (imgSrc.includes('/images/')) {
          // Fallback if URL contains domain (e.g. http://localhost:3000/images/...)
          const relativePath = imgSrc.substring(imgSrc.indexOf('images/'));
          await addImageTag(relativePath, slug);
          taggedCount++;
        }
      }
    }

    Logger.info(`[FILE-8013] Tagged ${taggedCount} images for post: ${slug}`);
    res.json({ success: true, taggedCount });

  } catch (error) {
    Logger.error('Error auto-tagging post images:', error);
    // Silent fail so we don't break the client save flow
    res.json({ success: false, error: 'Auto-tagging failed' });
  }
});

// Toggle featured status
app.patch('/api/posts/:slug/featured', authenticateToken, async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const { featured } = req.body;

    if (typeof featured !== 'boolean') {
      return next(new AppError('VAL-2001', 400, 'Öne çıkarılan durumu boolean olmalıdır'));
    }

    const posts = await readPostsFile();
    const postIndex = posts.findIndex(p => p.slug === slug);

    if (postIndex === -1) {
      return next(new AppError('RES-6001', 404, 'Blog yazısı bulunamadı'));
    }

    // Update only the featured status
    posts[postIndex] = {
      ...posts[postIndex],
      featured,
      updatedAt: new Date().toISOString()
    };

    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Blog yazısı metadata kaydedilirken hata oluştu'));
    }

    // Generate RSS feed after featured status update
    await generateRSS();

    res.json({
      success: true,
      message: `Post ${featured ? 'featured' : 'unfeatured'} successfully`,
      post: posts[postIndex]
    });
  } catch (error) {
    Logger.error('Error toggling featured status:', error);
    next(new AppError('SYS-3001', 500, 'Öne çıkarılan durum güncellenirken hata oluştu'));
  }
});

// Soft delete post (move to trash)
app.delete('/api/posts/:slug', authenticateToken, async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();

    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      return next(new AppError('RES-6001', 404, 'Blog yazısı bulunamadı'));
    }

    // Soft delete - mark as deleted instead of removing
    posts[postIndex] = {
      ...posts[postIndex],
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Blog yazıları metadata kaydedilirken hata oluştu'));
    }

    // Clean up stats data for deleted post
    await cleanupStatsData();

    // AUTO-RECYCLE IMAGES: Remove post slug from image tags and move orphaned ones to deleted
    try {
      const orphanedPaths = await removePostFromImageTags(slug);
      if (orphanedPaths.length > 0) {
        Logger.info(`[FILE-8012] Post deleted, recycling ${orphanedPaths.length} orphaned images for post: ${slug}`);

        const deletedDir = path.join(__dirname, 'images', 'deleted');
        await fs.ensureDir(deletedDir);

        const deletedImagesPath = path.join(__dirname, 'data', 'deleted-images.json');
        let deletedImagesMeta = [];
        if (await fs.pathExists(deletedImagesPath)) {
          deletedImagesMeta = await fs.readJson(deletedImagesPath);
        }

        for (const imgPath of orphanedPaths) {
          // imgPath is e.g. "images/blog-covers/photo.jpg"
          const parts = imgPath.split('/');
          if (parts.length >= 3) {
            const folder = parts[1];
            const filename = parts.pop();
            const fullLocalPath = path.join(__dirname, 'images', folder, filename);
            const targetDeletedPath = path.join(deletedDir, filename);

            if (await fs.pathExists(fullLocalPath)) {
              await fs.move(fullLocalPath, targetDeletedPath);
              deletedImagesMeta.push({
                filename: filename,
                originalFolder: folder,
                deletedAt: new Date().toISOString(),
                originalPath: imgPath,
                deletedByPost: slug
              });
              Logger.info(`✅ Auto-recycled image: ${imgPath}`);
            }
          }
        }
        await fs.writeJson(deletedImagesPath, deletedImagesMeta, { spaces: 2 });
      }
    } catch (recycleErr) {
      Logger.error(`Error during auto-recycling images for post ${slug}:`, recycleErr);
      // Non-fatal error, continue with deletion process
    }

    // Generate RSS feed after post deletion
    await generateRSS();

    res.json({
      success: true,
      message: 'Post moved to trash successfully'
    });
  } catch (error) {
    Logger.error('Error deleting post:', error);
    next(new AppError('SYS-3001', 500, 'Blog yazısı silinirken hata oluştu'));
  }
});

// Publish/Schedule post
app.post('/api/posts/:slug/publish', authenticateToken, async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const { status, publishDate } = req.body;

    if (!status || !['published', 'scheduled'].includes(status)) {
      return next(new AppError('VAL-2001', 400, 'Geçersiz durum'));
    }

    if (status === 'scheduled' && !publishDate) {
      return next(new AppError('VAL-2001', 400, 'Zamanlanmış yazılar için yayın tarihi gereklidir'));
    }

    const posts = await readPostsFile();
    const postIndex = posts.findIndex(p => p.slug === slug);

    if (postIndex === -1) {
      return next(new AppError('RES-6001', 404, 'Blog yazısı bulunamadı'));
    }

    // Update post status
    posts[postIndex] = {
      ...posts[postIndex],
      status,
      publishDate: status === 'scheduled' ? publishDate : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Blog yazısı metadata kaydedilirken hata oluştu'));
    }

    // Generate RSS feed after post publishing
    await generateRSS();

    res.json({
      success: true,
      message: status === 'published' ? 'Post published successfully' : 'Post scheduled successfully',
      post: posts[postIndex]
    });
  } catch (error) {
    Logger.error('Error publishing post:', error);
    next(new AppError('SYS-3001', 500, 'Blog yazısı yayınlanırken hata oluştu'));
  }
});

// Restore post from trash
app.post('/api/posts/:slug/restore', authenticateToken, async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();

    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      return next(new AppError('RES-6001', 404, 'Blog yazısı bulunamadı'));
    }

    // Restore post - change status back to draft
    posts[postIndex] = {
      ...posts[postIndex],
      status: 'draft',
      deletedAt: null,
      updatedAt: new Date().toISOString()
    };

    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Blog yazısı metadata kaydedilirken hata oluştu'));
    }

    // Generate RSS feed after post restoration
    await generateRSS();

    res.json({
      success: true,
      message: 'Post restored successfully',
      post: posts[postIndex]
    });
  } catch (error) {
    Logger.error('Error restoring post:', error);
    next(new AppError('SYS-3001', 500, 'Blog yazısı geri yüklenirken hata oluştu'));
  }
});

// Restore deleted post from trash
app.put('/api/posts/:slug/restore', authenticateToken, async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();

    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      return next(new AppError('RES-6001', 404, 'Blog yazısı bulunamadı'));
    }

    const post = posts[postIndex];

    // Check if post is actually deleted
    if (post.status !== 'deleted') {
      Logger.error(`Attempted to restore post ${slug} with status: ${post.status}`);
      return next(new AppError('VAL-2001', 400, 'Blog yazısı geri dönüşüm kutusunda değil'));
    }

    // Log what we're about to restore
    Logger.info(`Restoring post: ${slug} (${post.title}) from status: ${post.status}`);

    // Restore post to published status
    posts[postIndex].status = 'published';
    posts[postIndex].updatedAt = new Date().toISOString();

    // Remove deletedAt field if it exists
    if (posts[postIndex].deletedAt) {
      delete posts[postIndex].deletedAt;
    }

    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Blog yazıları metadata kaydedilirken hata oluştu'));
    }

    // Validate stats data after post restoration
    await validateStatsData();

    // Generate RSS feed after post restoration
    await generateRSS();

    Logger.info(`Post ${slug} restored successfully`);

    res.json({
      success: true,
      message: 'Post restored successfully',
      post: posts[postIndex]
    });
  } catch (error) {
    Logger.error('Error restoring post:', error);
    next(new AppError('SYS-3001', 500, 'Blog yazısı geri yüklenirken hata oluştu'));
  }
});

// Permanent delete post from trash
app.delete('/api/posts/:slug/permanent', authenticateToken, async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();

    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      return next(new AppError('RES-6001', 404, 'Blog yazısı bulunamadı'));
    }

    const post = posts[postIndex];

    // Check if post is actually deleted
    if (post.status !== 'deleted') {
      Logger.error(`Attempted to permanently delete post ${slug} with status: ${post.status}`);
      return next(new AppError('VAL-2001', 400, 'Blog yazısı geri dönüşüm kutusunda değil'));
    }

    // Log what we're about to delete
    Logger.info(`Permanently deleting post: ${slug} (${post.title}) with status: ${post.status}`);

    // Remove from posts array permanently
    posts.splice(postIndex, 1);

    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Blog yazıları metadata kaydedilirken hata oluştu'));
    }

    // --- Asset Temizleme Operasyonu ---
    const markdownPath = path.join(CONTENT_DIR, `${slug}.md`);
    try {
      let content = '';
      if (await fs.pathExists(markdownPath)) {
        content = await fs.readFile(markdownPath, 'utf8');
      }

      // Önce görselleri temizle (Shared check dahil)
      await cleanupPostAssets(post, content);

      // Sonra markdown dosyasını sil
      if (await fs.pathExists(markdownPath)) {
        await fs.remove(markdownPath);
        Logger.info(`[FILE-8004] Markdown dosyası kalıcı olarak silindi: ${markdownPath}`);
      }
    } catch (cleanupError) {
      Logger.error(`Kalıcı silme asset temizliği sırasında hata (Slug: ${slug}):`, cleanupError);
    }
    // ----------------------------------

    // Clean up stats data for permanently deleted post
    await cleanupStatsData();

    // Generate RSS feed after permanent post deletion
    await generateRSS();

    Logger.info(`Post ${slug} permanently deleted successfully`);

    res.json({
      success: true,
      message: 'Post permanently deleted'
    });
  } catch (error) {
    Logger.error('Error permanently deleting post:', error);
    next(new AppError('SYS-3001', 500, 'Blog yazısı kalıcı olarak silinirken hata oluştu'));
  }
});

// Upload image with enhanced error handling and folder support
app.post('/api/upload', authenticateToken, (req, res, next) => {
  // Use upload.single with error handling
  upload.single('image')(req, res, async (err) => {
    try {
      if (err) {
        // Handle multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('VAL-2001', err, `Dosya çok büyük. Maksimum dosya boyutu: ${MAX_FILE_SIZE / (1024 * 1024)}MB`));
        }

        if (err.message && err.message.includes('File type not allowed')) {
          return next(new AppError('VAL-2001', err, `Dosya tipi izin verilmiyor. İzin verilen tipler: ${ALLOWED_FILE_TYPES.join(', ')}`));
        }

        if (err.message && err.message.includes('File extension not allowed')) {
          return next(new AppError('VAL-2001', err, `Dosya uzantısı izin verilmiyor. İzin verilen uzantılar: ${ALLOWED_EXTENSIONS.join(', ')}`));
        }


        Logger.error('File upload error:', err);
        return next(new AppError('VAL-2001', err, `Dosya yükleme başarısız. Detay: ${err.message}`));
      }

      if (!req.file) {
        return next(new AppError('VAL-2001', null, 'Dosya yüklenmedi. Lütfen yüklenecek bir görsel dosyası seçin'));
      }

      // Get target folder from request
      const targetFolder = req.body.folder || 'blog-content';
      const validFolders = ['system', 'profile', 'blog-covers', 'blog-content'];

      if (!validFolders.includes(targetFolder)) {
        return next(new AppError('VAL-2001', null, `Geçersiz klasör. Geçerli klasörler: ${validFolders.join(', ')}`));
      }

      // Move file to target folder
      const targetPath = path.join(__dirname, 'images', targetFolder, req.file.filename);
      const sourcePath = req.file.path;

      try {
        await fs.move(sourcePath, targetPath, { overwrite: true });
        Logger.info(`[FILE-8000] Dosya basariyla '${targetFolder}' klasorune tasindi: ${req.file.originalname} -> ${req.file.filename}`);
      } catch (moveError) {
        Logger.error('Error moving file to target folder:', moveError);
        // If move fails, try to copy instead
        try {
          await fs.copy(sourcePath, targetPath);
          await fs.remove(sourcePath);
          Logger.info(`✅ File copied to ${targetFolder}: ${req.file.originalname} -> ${req.file.filename}`);
        } catch (copyError) {
          Logger.error('Error copying file to target folder:', copyError);
          return next(new AppError('SYS-3001', copyError, 'Dosya hedef klasöre kaydedilirken hata oluştu. Dosya yüklendi ancak hedef klasöre taşınamadı.'));
        }
      }

      // Log successful upload
      Logger.info(`[FILE-8001] '${targetFolder}' klasorune dosya yuklemesi basarili: ${req.file.originalname} -> ${req.file.filename}`);

      const imageUrl = `images/${targetFolder}/${req.file.filename}`;

      // Tag image with postSlug if provided
      const postSlug = req.body.postSlug || '';
      if (postSlug) {
        addImageTag(imageUrl, postSlug).catch(e => Logger.error('addImageTag error:', e));
        Logger.info(`[FILE-8011] Gorsel etiketlendi: ${imageUrl} -> ${postSlug}`);
      }

      res.json({
        success: true,
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        folder: targetFolder
      });

    } catch (error) {
      Logger.error('Error processing uploaded file:', error);
      next(new AppError('SYS-3001', error, 'Yüklenen dosya işlenirken hata oluştu. Dosya işleme sırasında sunucu hatası.'));
    }
  });
});

// Get deleted images (must be before /api/gallery/:folder)
app.get('/api/gallery/deleted', authenticateToken, async (req, res, next) => {
  try {
    Logger.info('[SYS-2011] Silinmis gorseller getiriliyor...');
    const deletedDir = path.join(__dirname, 'images', 'deleted');
    const deletedImagesPath = path.join(__dirname, 'data', 'deleted-images.json');

    let deletedImages = [];
    let metadata = [];

    // Get metadata
    try {
      if (await fs.pathExists(deletedImagesPath)) {
        metadata = await fs.readJson(deletedImagesPath);
      }
    } catch (error) {
      Logger.info('No deleted images metadata found');
    }

    // Check if deleted directory exists
    if (await fs.pathExists(deletedDir)) {
      const files = await fs.readdir(deletedDir);

      for (const file of files) {
        const filePath = path.join(deletedDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            const meta = metadata.find(m => m.filename === file) || {};
            deletedImages.push({
              filename: file,
              originalName: file,
              size: stats.size,
              url: `images/deleted/${file}`,
              folder: 'deleted',
              uploadedAt: stats.mtime,
              originalFolder: meta.originalFolder || 'unknown',
              deletedAt: meta.deletedAt || stats.mtime
            });
          }
        }
      }
    }

    res.json({ images: deletedImages });

  } catch (error) {
    Logger.error('Error getting deleted images:', error);
    next(new AppError('SYS-3001', 500, 'Silinen görseller alınırken hata oluştu', 'Sunucu hatası'));
  }
});

// Get gallery images for a specific folder
app.get('/api/gallery/:folder', authenticateToken, async (req, res, next) => {
  try {
    const { folder } = req.params;
    const validFolders = ['system', 'profile', 'blog-covers', 'blog-content'];

    if (!validFolders.includes(folder)) {
      return next(new AppError('VAL-2001', 400, 'Invalid folder', `Geçerli klasörler: ${validFolders.join(', ')}`));
    }

    const folderPath = path.join(__dirname, 'images', folder);

    // Check if folder exists
    if (!await fs.pathExists(folderPath)) {
      return res.json({ images: [] });
    }

    // Read folder contents
    const files = await fs.readdir(folderPath);
    const images = [];

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          images.push({
            filename: file,
            originalName: file,
            size: stats.size,
            url: `images/${folder}/${file}`,
            folder: folder,
            uploadedAt: stats.mtime
          });
        }
      }
    }

    res.json({ images });

  } catch (error) {
    Logger.error('Error getting gallery images:', error);
    next(new AppError('SYS-3001', 500, 'Galeri görselleri alınırken hata oluştu', 'Sunucu hatası'));
  }
});

// Restore deleted image (must be before /api/gallery/:folder/:filename)
app.post('/api/gallery/deleted/:filename/restore', authenticateToken, async (req, res, next) => {
  try {
    const { filename } = req.params;
    const deletedPath = path.join(__dirname, 'images', 'deleted', filename);
    const deletedImagesPath = path.join(__dirname, 'data', 'deleted-images.json');

    // Check if file exists in deleted folder
    if (!await fs.pathExists(deletedPath)) {
      return next(new AppError('RES-6001', 404, 'Silinen klasörde dosya bulunamadı'));
    }

    // Get metadata to find original folder
    let deletedImages = [];
    try {
      if (await fs.pathExists(deletedImagesPath)) {
        deletedImages = await fs.readJson(deletedImagesPath);
      }
    } catch (error) {
      Logger.info('No deleted images metadata found');
    }

    const meta = deletedImages.find(m => m.filename === filename);
    if (!meta) {
      return next(new AppError('VAL-2001', 400, 'Silinen görsel için metadata bulunamadı'));
    }

    const originalPath = path.join(__dirname, 'images', meta.originalFolder, filename);

    // Check if file already exists in original location
    if (await fs.pathExists(originalPath)) {
      return next(new AppError('VAL-2001', 400, 'Dosya orijinal konumunda zaten mevcut'));
    }

    // Move file back to original location
    await fs.move(deletedPath, originalPath);

    // Remove from deleted images metadata
    deletedImages = deletedImages.filter(m => m.filename !== filename);
    await fs.writeJson(deletedImagesPath, deletedImages, { spaces: 2 });

    Logger.info(`✅ Image restored: ${filename} to ${meta.originalFolder}`);

    res.json({
      success: true,
      message: 'Image restored successfully'
    });

  } catch (error) {
    Logger.error('Error restoring image:', error);
    next(new AppError('SYS-3001', 500, 'Görsel geri yüklenirken hata oluştu', 'Sunucu hatası'));
  }
});

// Permanently delete image from deleted folder (must be before /api/gallery/:folder/:filename)
app.delete('/api/gallery/deleted/:filename', authenticateToken, async (req, res, next) => {
  try {
    const { filename } = req.params;
    const deletedPath = path.join(__dirname, 'images', 'deleted', filename);
    const deletedImagesPath = path.join(__dirname, 'data', 'deleted-images.json');

    // Check if file exists in deleted folder
    if (!await fs.pathExists(deletedPath)) {
      return next(new AppError('RES-6001', 404, 'Silinen klasörde dosya bulunamadı'));
    }

    // Delete file permanently
    await fs.remove(deletedPath);

    // Remove from deleted images metadata
    let deletedImages = [];
    try {
      if (await fs.pathExists(deletedImagesPath)) {
        deletedImages = await fs.readJson(deletedImagesPath);
      }
    } catch (error) {
      Logger.info('No deleted images metadata found');
    }

    deletedImages = deletedImages.filter(m => m.filename !== filename);
    await fs.writeJson(deletedImagesPath, deletedImages, { spaces: 2 });

    Logger.info(`✅ Image permanently deleted: ${filename}`);

    res.json({
      success: true,
      message: 'Image permanently deleted'
    });

  } catch (error) {
    Logger.error('Error permanently deleting image:', error);
    next(new AppError('SYS-3001', 500, 'Görsel kalıcı olarak silinirken hata oluştu', 'Sunucu hatası'));
  }
});

// Move image to deleted folder (soft delete)
app.delete('/api/gallery/:folder/:filename', authenticateToken, async (req, res, next) => {
  try {
    const { folder, filename } = req.params;
    const validFolders = ['system', 'profile', 'blog-covers', 'blog-content'];

    if (!validFolders.includes(folder)) {
      return next(new AppError('VAL-2001', 400, 'Invalid folder', `Geçerli klasörler: ${validFolders.join(', ')}`));
    }

    const sourcePath = path.join(__dirname, 'images', folder, filename);
    const deletedDir = path.join(__dirname, 'images', 'deleted');
    const deletedPath = path.join(deletedDir, filename);

    // Check if file exists
    if (!await fs.pathExists(sourcePath)) {
      return next(new AppError('RES-6001', 404, 'Dosya bulunamadı', 'Belirtilen görsel dosyası mevcut değil'));
    }

    // Create deleted directory if it doesn't exist
    await fs.ensureDir(deletedDir);

    // Move file to deleted folder instead of deleting
    await fs.move(sourcePath, deletedPath);

    // Save deletion metadata
    const deletedImagesPath = path.join(__dirname, 'data', 'deleted-images.json');
    let deletedImages = [];

    try {
      if (await fs.pathExists(deletedImagesPath)) {
        deletedImages = await fs.readJson(deletedImagesPath);
      }
    } catch (error) {
      Logger.info('Creating new deleted images file');
    }

    // Add deletion record
    deletedImages.push({
      filename: filename,
      originalFolder: folder,
      deletedAt: new Date().toISOString(),
      originalPath: `images/${folder}/${filename}`
    });

    await fs.writeJson(deletedImagesPath, deletedImages, { spaces: 2 });

    Logger.info(`✅ Image moved to deleted: ${folder}/${filename}`);

    res.json({
      success: true,
      message: 'Image moved to deleted folder'
    });

  } catch (error) {
    Logger.error('Error moving image to deleted:', error);
    next(new AppError('SYS-3001', 500, 'Görsel silinen klasöre taşınırken hata oluştu', 'Sunucu hatası'));
  }
});

// Clean up all orphaned assets (not used in any post)
app.post('/api/gallery/cleanup-orphans', authenticateToken, async (req, res, next) => {
  try {
    Logger.info('[FILE-8010] Sahipsiz görsel temizliği başlatıldı...');

    const posts = await readPostsFile();
    const usedAssets = new Set();

    // 1. Tüm yazılardaki kullanılan assetleri topla
    for (const post of posts) {
      if (post.cover) usedAssets.add(post.cover);

      const mdPath = path.join(CONTENT_DIR, `${post.slug}.md`);
      try {
        if (await fs.pathExists(mdPath)) {
          const content = await fs.readFile(mdPath, 'utf8');
          const imageRegex = /!\[.*?\]\((.*?)\)/g;
          let match;
          while ((match = imageRegex.exec(content)) !== null) {
            usedAssets.add(match[1]);
          }
        }
      } catch (e) { }
    }

    // 2. Klasörleri tara ve kullanılmayanları sil
    const cleanupFolders = ['blog-covers', 'blog-content'];
    let deletedCount = 0;
    const deletedFiles = [];

    for (const folder of cleanupFolders) {
      const folderPath = path.join(__dirname, 'images', folder);
      if (await fs.pathExists(folderPath)) {
        const files = await fs.readdir(folderPath);
        for (const file of files) {
          const assetPath = `images/${folder}/${file}`;
          if (!usedAssets.has(assetPath)) {
            await fs.remove(path.join(folderPath, file));
            deletedCount++;
            deletedFiles.push(assetPath);
          }
        }
      }
    }

    Logger.info(`[FILE-8011] Temizlik tamamlandı. ${deletedCount} sahipsiz görsel silindi.`);

    res.json({
      success: true,
      message: `${deletedCount} sahipsiz görsel başarıyla temizlendi`,
      deletedCount,
      deletedFiles
    });
  } catch (error) {
    Logger.error('Orphan cleanup error:', error);
    next(new AppError('SYS-3001', 500, 'Sahipsiz görseller temizlenirken hata oluştu'));
  }
});


// Get dashboard stats
app.get('/api/stats', authenticateToken, async (req, res, next) => {
  try {
    const posts = await readPostsFile();

    const totalPosts = posts.length;
    const featuredPosts = posts.filter(post => post.featured).length;

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const recentPosts = posts.filter(post => new Date(post.date) >= oneMonthAgo).length;

    const allTags = new Set();
    posts.forEach(post => {
      if (post.tags) {
        post.tags.forEach(tag => allTags.add(tag));
      }
    });
    const totalTags = allTags.size;

    res.json({
      totalPosts,
      featuredPosts,
      recentPosts,
      totalTags
    });
  } catch (error) {
    next(new AppError('SYS-3001', 500, 'İstatistikler yüklenirken hata oluştu'));
  }
});

// Simple test endpoint (before any middleware)
app.get('/api/test', (req, res, next) => {
  try {
    res.json({
      status: 'OK',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res, next) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Version endpoint - merkezi versiyon bilgisi
app.get('/api/version', (req, res, next) => {
  res.json({ version: APP_VERSION });
});

// Debug endpoint to check CSP settings
app.get('/api/debug/csp', (req, res, next) => {
  const cspHeader = process.env.NODE_ENV === 'production'
    ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'"
    : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; frame-ancestors 'none'";

  res.json({
    nodeEnv: process.env.NODE_ENV,
    expectedCSP: cspHeader,
    actualCSP: req.headers['content-security-policy'] || 'Not set in request',
    note: 'Check browser DevTools Network tab to see actual CSP header sent'
  });
});

// ====== Statistics API Routes ======

// Track page view
app.post('/api/analytics/track-page', async (req, res, next) => {
  try {
    const { page, source } = req.body;
    if (!page) {
      return next(new AppError('VAL-2001', 400, 'Sayfa parametresi gereklidir'));
    }

    const stats = await incrementPageView(page, source);
    res.json({ success: true, stats });
  } catch (error) {
    Logger.error('Error tracking page view:', error);
    next(new AppError('SYS-3001', 500, 'Sayfa görüntüleme takip edilemedi'));
  }
});

// Track post view
app.post('/api/analytics/track-post', async (req, res, next) => {
  try {
    const { slug, source } = req.body;
    if (!slug) {
      return next(new AppError('VAL-2001', 400, 'Slug parametresi gereklidir'));
    }

    const stats = await incrementPostView(slug, source);
    res.json({ success: true, stats });
  } catch (error) {
    Logger.error('Error tracking post view:', error);
    next(new AppError('SYS-3001', 500, 'Blog yazısı görüntüleme takip edilemedi'));
  }
});

// Get analytics (admin only)
app.get('/api/stats/analytics', authenticateToken, async (req, res, next) => {
  try {
    const stats = await readStatsFile();
    const commentsData = await readCommentsFile();

    // Get time range from query parameter (default: 30 days)
    const timeRange = req.query.days;
    let days;

    if (timeRange === 'all') {
      days = null; // null means all time
      Logger.info(`[SYS-2015] Tum zamanlarin (ALL TIME) analitik verileri istendi`);
    } else {
      days = parseInt(timeRange) || 30;
      Logger.info(`[SYS-2015] Son ${days} gunluk analitik veriler istendi`);
    }

    // Get popular posts (only active/published posts)
    const posts = await readPostsFile();
    const activePosts = posts.filter(post => post.status === 'published');
    const activePostSlugs = new Set(activePosts.map(post => post.slug));

    const popularPosts = activePosts.map(post => ({
      ...post,
      views: stats.postViews[post.slug] || 0
    })).sort((a, b) => b.views - a.views).slice(0, 3);

    // Get active post views for calculations
    const activePostViews = Object.entries(stats.postViews)
      .filter(([slug]) => activePostSlugs.has(slug));

    // Calculate total blog views (only from active posts)
    const totalBlogViews = activePostViews
      .reduce((total, [, views]) => total + views, 0);

    // Get popular blog post (only from active posts)
    const popularBlogPost = activePostViews
      .sort(([, a], [, b]) => b - a)[0];

    // Get total comments count
    const totalComments = Object.values(commentsData.comments || {})
      .flat()
      .filter(comment => comment.approved !== false) // Only count approved and pending comments
      .length;

    // Get popular tags
    const tagCounts = {};
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          const tagKey = tag.trim().toLowerCase();
          if (tagKey) {
            tagCounts[tagKey] = (tagCounts[tagKey] || 0) + 1;
          }
        });
      }
    });

    // Sort tags by usage count and get top 3
    const popularTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag, count]) => ({ tag, count }));

    // Get daily stats for specified time range
    let dailyStats;

    if (days === null) {
      // All time - no filtering
      dailyStats = Object.entries(stats.dailyStats)
    } else {
      // Specific time range
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      dailyStats = Object.entries(stats.dailyStats)
        .filter(([date]) => new Date(date) >= daysAgo)
    }

    dailyStats = dailyStats
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, data]) => {
        // Filter postViews to only include active posts
        const filteredPostViews = {};
        if (data.postViews) {
          Object.entries(data.postViews).forEach(([slug, views]) => {
            if (activePostSlugs.has(slug)) {
              filteredPostViews[slug] = views;
            }
          });
        }

        return {
          date,
          totalViews: data.totalViews,
          pageViews: data.pageViews,
          postViews: filteredPostViews,  // Sadece aktif yazılar
          sources: data.sources || {}
        };
      });

    res.json({
      totalViews: totalBlogViews, // Only blog post views
      pageViews: stats.pageViews,
      popularPage: popularBlogPost ? popularBlogPost[0] : null,
      popularPageViews: popularBlogPost ? popularBlogPost[1] : 0,
      popularPosts,
      popularTags,
      totalComments,
      dailyStats,
      sources: stats.sources || {}, // Global Sources Export
      lastUpdated: stats.lastUpdated
    });
  } catch (error) {
    Logger.error('Error getting analytics:', error);
    next(new AppError('SYS-3001', 500, 'Analitik veriler alınamadı'));
  }
});

// Manual stats cleanup (admin only)
app.post('/api/stats/cleanup', authenticateToken, async (req, res, next) => {
  try {
    Logger.info('[SYS-2007] Yonetici tarafindan manuel istatistik veri dogrulamasi/temizlemesi istendi');

    // Clean up stats data
    const cleanedStats = await cleanupStatsData();

    if (cleanedStats) {
      res.json({
        success: true,
        message: 'Stats data cleaned successfully',
        stats: cleanedStats
      });
    } else {
      next(new AppError('SYS-3001', 500, 'İstatistik verileri temizlenirken hata oluştu'));
    }
  } catch (error) {
    Logger.error('Error during manual stats cleanup:', error);
    next(new AppError('SYS-3001', 500, 'İstatistik verileri temizlenirken hata oluştu'));
  }
});

// Manual stats validation (admin only)
app.post('/api/stats/validate', authenticateToken, async (req, res, next) => {
  try {
    Logger.info('[SYS-2007] Yonetici tarafindan manuel istatistik veri dogrulamasi istendi');

    // Validate stats data
    const isValid = await validateStatsData();

    if (isValid) {
      res.json({
        success: true,
        message: 'Istatistik veri dogrulamasi basariyla tamamlandi'
      });
    } else {
      res.status(400).json({
        error: 'İstatistik verisi doğrulaması başarısız',
        message: 'Temizlenmesi gereken yetim (orphaned) istatistik verileri bulundu'
      });
    }
  } catch (error) {
    Logger.error('Error during manual stats validation:', error);
    next(new AppError('SYS-3001', 500, 'İstatistik verileri doğrulanamadı'));
  }
});

// Cache statistics (admin only)
app.get('/api/cache/stats', authenticateToken, async (req, res, next) => {
  try {
    const cacheStats = fileCache.getStats();

    res.json({
      success: true,
      cache: cacheStats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    Logger.error('Error getting cache stats:', error);
    next(new AppError('SYS-3001', 500, 'Önbellek istatistikleri alınamadı'));
  }
});

// Clear cache (admin only)
app.post('/api/cache/clear', authenticateToken, async (req, res, next) => {
  try {
    Logger.info('🧹 Manual cache clear requested by admin');

    fileCache.clear();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    Logger.error('Error clearing cache:', error);
    next(new AppError('SYS-3001', 500, 'Önbellek temizlenirken hata oluştu'));
  }
});

// ====== Comments API Routes ======
// Get comments for a post
app.get('/api/comments/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const commentsData = await readCommentsFile();
    const postComments = commentsData.comments[slug] || [];

    // Return all comments (both approved and pending)
    const allComments = postComments.filter(comment => comment.approved !== false); // Show approved and pending, hide rejected

    // Organize comments hierarchically
    const organizedComments = organizeCommentsHierarchically(allComments);

    res.json({
      success: true,
      comments: organizedComments
    });
  } catch (error) {
    Logger.error('Error getting comments:', error);
    next(new AppError('SYS-3001', 500, 'Yorumlar alınamadı'));
  }
});

// Helper function to organize comments hierarchically
function organizeCommentsHierarchically(comments) {
  // Separate main comments and replies
  const mainComments = comments.filter(comment => !comment.parent_id);
  const replies = comments.filter(comment => comment.parent_id);

  // Sort main comments by date (newest first)
  mainComments.sort((a, b) => new Date(b.date) - new Date(a.date));

  // For each main comment, find and attach its replies
  const organizedComments = mainComments.map(mainComment => {
    // Find direct replies to this main comment
    const directReplies = replies
      .filter(reply => reply.parent_id === mainComment.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Replies in chronological order

    // For each direct reply, find its sub-replies
    const repliesWithSubReplies = directReplies.map(reply => {
      const subReplies = replies
        .filter(subReply => subReply.parent_id === reply.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        ...reply,
        replies: subReplies
      };
    });

    return {
      ...mainComment,
      replies: repliesWithSubReplies
    };
  });

  return organizedComments;
}

// Add a new comment
app.post('/api/comments/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, email, content, parent_id, reply_to_name } = req.body;

    // Basic validation
    if (!name || !email || !content) {
      return next(new AppError('VAL-2001', 400, 'İsim, e-posta ve içerik gereklidir'));
    }

    if (content.length < 3) {
      return next(new AppError('VAL-2001', 400, 'Yorum en az 3 karakter olmalıdır'));
    }

    if (content.length > 1000) {
      return next(new AppError('VAL-2001', 400, 'Yorum 1000 karakterden az olmalıdır'));
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('VAL-2001', 400, 'Geçersiz e-posta formatı'));
    }

    const commentsData = await readCommentsFile();

    // Initialize post comments array if it doesn't exist
    if (!commentsData.comments[slug]) {
      commentsData.comments[slug] = [];
    }

    // Generate new comment ID
    const newCommentId = generateCommentId();

    // Determine if this is a reply or main comment
    let parentId = null;
    let threadId = newCommentId;
    let depth = 0;
    let replyToName = null;

    if (parent_id) {
      // This is a reply - find the parent comment
      const parentComment = commentsData.comments[slug].find(c => c.id === parent_id);
      if (!parentComment) {
        return next(new AppError('VAL-2001', 400, 'Üst yorum bulunamadı'));
      }

      parentId = parent_id;
      threadId = parentComment.thread_id || parent_id;
      depth = (parentComment.depth || 0) + 1;
      replyToName = parentComment.name;

      // Limit reply depth to 2 levels (main comment -> reply -> sub-reply)
      if (depth > 2) {
        return next(new AppError('VAL-2001', 400, 'Maksimum yanıt derinliğine ulaşıldı'));
      }
    }

    // Create new comment
    const newComment = {
      id: newCommentId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      content: content.trim(),
      date: new Date().toISOString(),
      approved: false, // Comments need admin approval by default
      ip: req.ip || req.connection.remoteAddress,
      parent_id: parentId,
      thread_id: threadId,
      depth: depth,
      reply_to_name: replyToName
    };

    // Add comment to post
    commentsData.comments[slug].push(newComment);

    // Save to file
    await writeCommentsFile(commentsData);

    res.json({
      success: true,
      message: 'Comment submitted successfully. It will be visible after approval.',
      comment: newComment
    });
  } catch (error) {
    Logger.error('Error adding comment:', error);
    next(new AppError('SYS-3001', 500, 'Yorum eklenirken hata oluştu'));
  }
});

// Get all comments (admin only)
app.get('/api/admin/comments', authenticateToken, async (req, res, next) => {
  try {
    const commentsData = await readCommentsFile();
    const posts = await readPostsFile();

    // Get all comments with post titles
    const allComments = [];
    Object.entries(commentsData.comments).forEach(([slug, comments]) => {
      const post = posts.find(p => p.slug === slug);
      comments.forEach(comment => {
        allComments.push({
          ...comment,
          postTitle: post ? post.title : 'Unknown Post',
          postSlug: slug
        });
      });
    });

    // Sort by date (newest first)
    allComments.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      comments: allComments
    });
  } catch (error) {
    Logger.error('Error getting all comments:', error);
    next(new AppError('SYS-3001', 500, 'Yorumlar alınamadı'));
  }
});

// Approve/Reject comment (admin only)
app.put('/api/admin/comments/:commentId', authenticateToken, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { approved } = req.body;

    const commentsData = await readCommentsFile();
    let commentFound = false;

    // Find and update comment
    Object.keys(commentsData.comments).forEach(slug => {
      const commentIndex = commentsData.comments[slug].findIndex(c => c.id === commentId);
      if (commentIndex !== -1) {
        commentsData.comments[slug][commentIndex].approved = approved;
        commentFound = true;
      }
    });

    if (!commentFound) {
      return next(new AppError('RES-6001', 404, 'Yorum bulunamadı'));
    }

    await writeCommentsFile(commentsData);

    res.json({
      success: true,
      message: `Comment ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    Logger.error('Error updating comment:', error);
    next(new AppError('SYS-3001', 500, 'Yorum güncellenirken hata oluştu'));
  }
});

// Delete comment (admin only)
app.delete('/api/admin/comments/:commentId', authenticateToken, async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const commentsData = await readCommentsFile();
    let commentFound = false;

    // Find and delete comment
    Object.keys(commentsData.comments).forEach(slug => {
      const commentIndex = commentsData.comments[slug].findIndex(c => c.id === commentId);
      if (commentIndex !== -1) {
        commentsData.comments[slug].splice(commentIndex, 1);
        commentFound = true;
      }
    });

    if (!commentFound) {
      return next(new AppError('RES-6001', 404, 'Yorum bulunamadı'));
    }

    await writeCommentsFile(commentsData);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    Logger.error('Error deleting comment:', error);
    next(new AppError('SYS-3001', 500, 'Yorum silinirken hata oluştu'));
  }
});

// ====== Site Configuration Endpoints ======

// Get site configuration
app.get('/api/site-config', authenticateToken, async (req, res, next) => {
  try {
    const siteConfigPath = path.join(__dirname, 'content', 'site.json');

    // Check if file exists and has content
    if (!await fs.pathExists(siteConfigPath)) {
      Logger.info('Site config file not found, creating default configuration');
      const defaultConfig = {
        hero: {
          name: "Cihan Enes Durgun",
          headline: "İHA, Kablosuz Haberleşme ve Gömülü Sistemler",
          bio: "Meraklı bir mühendisin blogu: Teknoloji, kişisel gelişim ve hayata dair düşünceler. İHA, kablosuz haberleşme ve gömülü sistemler üzerine teknik notlar, proje günlükleri ve deneyler.",
          avatar: "images/profile/avatar.jpg",
          cover: "images/profile/linkedinpoz.JPG"
        },
        site: {
          title: "Cihan Enes Durgun - İHA, Kablosuz Haberleşme ve Gömülü Sistemler",
          description: "Meraklı Bir Mühendisin Blogu: Teknoloji, Kişisel Gelişim ve Hayata Dair Düşünceler. İHA, kablosuz haberleşme ve gömülü sistemler üzerine teknik notlar, proje günlükleri ve deneyler",
          url: SITE_URL,
          author: "Cihan Enes Durgun",
          keywords: "İHA, drone, kablosuz haberleşme, gömülü sistemler, elektronik, mühendislik, teknoloji, blog"
        },
        social: {
          linkedin: "https://linkedin.com/in/cihanenesdurgun",
          github: "https://github.com/cihanenesdurgun",
          email: "cihanenesdurgun@gmail.com"
        },
        contact: {
          email: "cihanenesdurgun@gmail.com",
          phone: "+90 555 123 45 67",
          location: "İstanbul, Türkiye"
        },
        lastUpdated: new Date().toISOString()
      };

      // Create the file with default configuration
      await fs.writeFile(siteConfigPath, JSON.stringify(defaultConfig, null, 2));
      return res.json(defaultConfig);
    }

    const siteConfig = await fs.readFile(siteConfigPath, 'utf8');

    // Check if file is empty
    if (!siteConfig.trim()) {
      Logger.info('Site config file is empty, using default configuration');
      const defaultConfig = {
        hero: {
          name: "Cihan Enes Durgun",
          headline: "İHA, Kablosuz Haberleşme ve Gömülü Sistemler",
          bio: "Meraklı bir mühendisin blogu: Teknoloji, kişisel gelişim ve hayata dair düşünceler. İHA, kablosuz haberleşme ve gömülü sistemler üzerine teknik notlar, proje günlükleri ve deneyler.",
          avatar: "images/profile/avatar.jpg",
          cover: "images/profile/linkedinpoz.JPG"
        },
        site: {
          title: "Cihan Enes Durgun - İHA, Kablosuz Haberleşme ve Gömülü Sistemler",
          description: "Meraklı Bir Mühendisin Blogu: Teknoloji, Kişisel Gelişim ve Hayata Dair Düşünceler. İHA, kablosuz haberleşme ve gömülü sistemler üzerine teknik notlar, proje günlükleri ve deneyler",
          url: SITE_URL,
          author: "Cihan Enes Durgun",
          keywords: "İHA, drone, kablosuz haberleşme, gömülü sistemler, elektronik, mühendislik, teknoloji, blog"
        },
        social: {
          linkedin: "https://linkedin.com/in/cihanenesdurgun",
          github: "https://github.com/cihanenesdurgun",
          email: "cihanenesdurgun@gmail.com"
        },
        contact: {
          email: "cihanenesdurgun@gmail.com",
          phone: "+90 555 123 45 67",
          location: "İstanbul, Türkiye"
        },
        lastUpdated: new Date().toISOString()
      };

      // Write default configuration to file
      await fs.writeFile(siteConfigPath, JSON.stringify(defaultConfig, null, 2));
      return res.json(defaultConfig);
    }

    const config = JSON.parse(siteConfig);
    res.json(config);
  } catch (error) {
    Logger.error('Error reading site config:', error);
    next(new AppError('SYS-3001', 500, 'Site yapılandırması okunamadı'));
  }
});

// Update site configuration
app.put('/api/site-config', authenticateToken, async (req, res, next) => {
  try {
    const siteConfigPath = path.join(__dirname, 'content', 'site.json');
    const updatedConfig = req.body;

    // Validate required fields
    if (!updatedConfig.hero || !updatedConfig.hero.name || !updatedConfig.hero.headline || !updatedConfig.hero.bio) {
      return next(new AppError('VAL-2001', 400, 'Eksik gerekli hero alanları'));
    }

    if (!updatedConfig.site || !updatedConfig.site.title || !updatedConfig.site.description) {
      return next(new AppError('VAL-2001', 400, 'Eksik gerekli site alanları'));
    }

    // Write updated configuration
    await fs.writeFile(siteConfigPath, JSON.stringify(updatedConfig, null, 2));

    res.json({
      success: true,
      message: 'Site configuration updated successfully'
    });
  } catch (error) {
    Logger.error('Error updating site config:', error);
    next(new AppError('SYS-3001', 500, 'Site yapılandırması güncellenirken hata oluştu'));
  }
});

// ====== Admin Icon Management ======

// Set new system icon
app.post('/api/admin/set-icon', authenticateToken, async (req, res, next) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return next(new AppError('VAL-2001', 400, 'Dosya adı gereklidir'));
    }

    // Check if file exists in system folder
    const iconPath = path.join(__dirname, 'images', 'system', filename);
    if (!await fs.pathExists(iconPath)) {
      return next(new AppError('RES-6001', 404, 'İkon dosyası bulunamadı'));
    }

    // HTML dosyaları listesi
    const htmlFiles = [
      'index.html',
      'blog.html',
      'post.html',
      'admin/index.html',
      'admin/login.html',
      'markdown-editor/index.html'
    ];

    // Her HTML dosyasını güncelle
    for (const htmlFile of htmlFiles) {
      const filePath = path.join(__dirname, htmlFile);

      if (await fs.pathExists(filePath)) {
        let content = await fs.readFile(filePath, 'utf8');

        // Favicon referanslarını güncelle
        if (htmlFile.startsWith('admin/') || htmlFile.startsWith('markdown-editor/')) {
          // Admin ve markdown-editor dosyaları için ../images/system/ path
          content = content.replace(
            /<link rel="icon"[^>]*href="[^"]*"/g,
            `<link rel="icon" type="image/png" href="../images/system/${filename}"`
          );
        } else {
          // Ana dizindeki dosyalar için images/system/ path
          content = content.replace(
            /<link rel="icon"[^>]*href="[^"]*"/g,
            `<link rel="icon" type="image/png" href="images/system/${filename}"`
          );
          content = content.replace(
            /<link rel="apple-touch-icon"[^>]*href="[^"]*"/g,
            `<link rel="apple-touch-icon" href="images/system/${filename}"`
          );
        }

        await fs.writeFile(filePath, content, 'utf8');
      }
    }

    res.json({
      success: true,
      message: 'System icon updated successfully',
      filename: filename
    });

  } catch (error) {
    Logger.error('Error setting icon:', error);
    next(new AppError('SYS-3001', 500, 'Sistem ikonu ayarlanırken hata oluştu'));
  }
});

// ====== Account Management Endpoints ======

// Update account settings
app.put('/api/account/update', authenticateToken, async (req, res, next) => {
  try {
    const { newUsername, currentPassword, newPassword } = req.body;
    const users = await readUsersFile();

    // Get current user
    const currentUser = users[req.user.username];
    if (!currentUser) {
      return next(new AppError('RES-6001', 404, 'Kullanıcı bulunamadı'));
    }

    // Validate current password (with bcrypt support)
    let isPasswordValid = false;
    if (currentUser.isHashed) {
      // Password is hashed, use bcrypt
      isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
    } else {
      // Legacy plain text password (for migration)
      isPasswordValid = currentUser.password === currentPassword;
    }

    if (!isPasswordValid) {
      return next(new AppError('AUTH-1001', 401, 'Mevcut şifre yanlış'));
    }

    // Validate new username
    if (!newUsername || newUsername.length < 3) {
      return next(new AppError('VAL-2001', 400, 'Kullanıcı adı en az 3 karakter olmalıdır'));
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return next(new AppError('VAL-2001', 400, 'Yeni şifre en az 6 karakter olmalıdır'));
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // Update user credentials
    const updatedUser = {
      username: newUsername,
      password: hashedNewPassword,
      lastUpdated: new Date().toISOString(),
      isHashed: true
    };

    // Remove old user entry and add new one
    delete users[req.user.username];
    users[newUsername] = updatedUser;

    // Save updated users
    const saved = await writeUsersFile(users);
    if (!saved) {
      return next(new AppError('SYS-3001', 500, 'Kullanıcı bilgileri kaydedilemedi'));
    }

    Logger.info(`Account update successful: ${req.user.username} -> ${newUsername}`);

    res.json({
      success: true,
      message: 'Hesap ayarları başarıyla güncellendi',
      username: newUsername
    });

  } catch (error) {
    Logger.error('Error updating account:', error);
    next(new AppError('SYS-3001', 500, 'Hesap güncellenirken hata oluştu'));
  }
});

// Get user info for admin panel
app.get('/api/user/info', authenticateToken, async (req, res, next) => {
  try {
    const users = await readUsersFile();
    const user = users[req.user.username];

    if (!user) {
      return next(new AppError('RES-6001', 404, 'Kullanıcı bulunamadı'));
    }

    res.json({
      username: user.username,
      lastUpdated: user.lastUpdated
    });
  } catch (error) {
    Logger.error('Error getting user info:', error);
    next(new AppError('SYS-3001', 500, 'Kullanıcı bilgileri alınamadı'));
  }
});

// ====== Security & Sessions API Endpoints ======

// Get all security data (active sessions, login history, failed logins)
app.get('/api/security/data', authenticateToken, async (req, res, next) => {
  try {
    const sessions = await readSessionsFile();

    // Get IP analysis
    const ipAnalysis = {};
    sessions.failedLogins.forEach(login => {
      if (!ipAnalysis[login.ip]) {
        ipAnalysis[login.ip] = {
          ip: login.ip,
          failedAttempts: 0,
          lastAttempt: null,
          usernames: new Set()
        };
      }
      ipAnalysis[login.ip].failedAttempts++;
      ipAnalysis[login.ip].lastAttempt = login.timestamp;
      ipAnalysis[login.ip].usernames.add(login.username);
    });

    // Convert Set to Array for JSON serialization
    Object.values(ipAnalysis).forEach(analysis => {
      analysis.usernames = Array.from(analysis.usernames);
    });

    res.json({
      activeSessions: sessions.activeSessions,
      loginHistory: sessions.loginHistory.slice(0, 5), // Last 5 successful logins
      failedLogins: sessions.failedLogins.slice(0, 5), // Last 5 failed logins
      ipAnalysis: Object.values(ipAnalysis).sort((a, b) => b.failedAttempts - a.failedAttempts).slice(0, 10) // Top 10 risky IPs
    });
  } catch (error) {
    Logger.error('Error getting security data:', error);
    next(new AppError('SYS-3001', 500, 'Güvenlik verileri alınamadı'));
  }
});

// Terminate specific session
app.delete('/api/security/sessions/:sessionId', authenticateToken, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const sessions = await readSessionsFile();

    const sessionIndex = sessions.activeSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return next(new AppError('RES-6001', 404, 'Oturum bulunamadı'));
    }

    const removedSession = sessions.activeSessions.splice(sessionIndex, 1)[0];
    await writeSessionsFile(sessions);

    res.json({
      success: true,
      message: 'Oturum başarıyla sonlandırıldı',
      session: removedSession
    });
  } catch (error) {
    Logger.error('Error terminating session:', error);
    next(new AppError('SYS-3001', 500, 'Oturum sonlandırılırken hata oluştu'));
  }
});

// Terminate all sessions except current
app.delete('/api/security/sessions', authenticateToken, async (req, res, next) => {
  try {
    const sessions = await readSessionsFile();
    const currentSession = sessions.activeSessions.find(s => s.username === req.user.username);

    // Keep only current user's session
    sessions.activeSessions = currentSession ? [currentSession] : [];
    await writeSessionsFile(sessions);

    res.json({
      success: true,
      message: 'Tüm diğer oturumlar sonlandırıldı'
    });
  } catch (error) {
    Logger.error('Error terminating all sessions:', error);
    next(new AppError('SYS-3001', 500, 'Oturumlar sonlandırılırken hata oluştu'));
  }
});

// Block IP address
app.post('/api/security/block-ip', authenticateToken, async (req, res, next) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      return next(new AppError('VAL-2001', 400, 'IP adresi gerekli'));
    }

    // For now, we'll just log the blocked IP
    // In a real application, you'd want to implement actual IP blocking
    Logger.info(`IP ${ip} blocked by admin. Reason: ${reason || 'Suspicious activity'}`);

    res.json({
      success: true,
      message: `IP adresi ${ip} engellendi`,
      ip,
      reason: reason || 'Suspicious activity'
    });
  } catch (error) {
    Logger.error('Error blocking IP:', error);
    next(new AppError('SYS-3001', 500, 'IP engellenirken hata oluştu'));
  }
});

// Clear failed login logs
app.delete('/api/security/failed-logins', authenticateToken, async (req, res, next) => {
  try {
    const sessions = await readSessionsFile();
    sessions.failedLogins = [];
    await writeSessionsFile(sessions);

    res.json({
      success: true,
      message: 'Hatalı giriş logları temizlendi'
    });
  } catch (error) {
    Logger.error('Error clearing failed logins:', error);
    next(new AppError('SYS-3001', 500, 'Loglar temizlenirken hata oluştu'));
  }
});

// ====== Theme Management Endpoints ======

// Test endpoint to verify server is working
app.get('/api/theme/test', (req, res, next) => {
  Logger.info('✅ Test endpoint reached');
  res.json({ success: true, message: 'Server is working' });
});

// Get theme settings
app.get('/api/theme', async (req, res, next) => {
  // Immediate logging to ensure endpoint is reached
  // Logger.info('📊 Theme request received at:', new Date().toISOString());
  // Logger.info('📁 THEME_FILE path:', THEME_FILE);
  // Logger.info('📁 Request IP:', req.ip);
  // Logger.info('📁 Request origin:', req.headers.origin);

  // Default theme - always available
  const defaultTheme = {
    light: {
      bg: '#f8f8f6',
      panel: '#fafaf8',
      ink: '#0b0b0b',
      muted: '#6b7280',
      line: '#e5e7eb',
      accent: '#A67B5B'
    },
    dark: {
      bg: '#0b0d0f',
      panel: '#14171a',
      ink: '#e8edf2',
      muted: '#9aa4b2',
      line: '#2a2f35',
      accent: '#A67B5B'
    },
    borderRadius: 16,
    shadowIntensity: 60,
    fontFamily: 'Inter'
  };

  try {
    // Try to load theme from file
    let theme = null;
    try {
      theme = await readThemeFile();
      // Logger.info('✅ Theme loaded from readThemeFile');
    } catch (readError) {
      Logger.error('❌ Error in readThemeFile:', readError.message);
      Logger.error('Error stack:', readError.stack);
      theme = null;
    }

    // Use loaded theme or fallback to default
    const finalTheme = (theme && typeof theme === 'object' && theme.light && theme.dark)
      ? theme
      : defaultTheme;

    // Logger.info('✅ Sending theme response');

    // Send response with proper headers
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      theme: finalTheme
    });

    // Logger.info('✅ Theme response sent successfully');
  } catch (error) {
    Logger.error('❌ CRITICAL ERROR in /api/theme endpoint:', error);
    Logger.error('Error message:', error.message);
    Logger.error('Error stack:', error.stack);

    // Last resort - always send default theme
    try {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({
        success: true,
        theme: defaultTheme
      });
      // Logger.info('✅ Fallback theme response sent');
    } catch (sendError) {
      Logger.error('❌ CRITICAL: Failed to send ANY response:', sendError);
      // If we can't send JSON, try plain text
      try {
        res.status(200).send(JSON.stringify({
          success: true,
          theme: defaultTheme
        }));
      } catch (finalError) {
        Logger.error('❌ COMPLETE FAILURE: Cannot send response at all:', finalError);
      }
    }
  }
});

// Update theme settings (admin only)
app.put('/api/theme', authenticateToken, async (req, res, next) => {
  try {
    const themeData = req.body;

    // Validate theme data
    if (!themeData.light || !themeData.dark) {
      return next(new AppError('VAL-2001', 400, 'Geçersiz tema verisi'));
    }

    // Save theme to file
    const success = await writeThemeFile(themeData);

    if (success) {
      res.json({
        success: true,
        message: 'Tema ayarları başarıyla güncellendi',
        theme: themeData
      });
    } else {
      next(new AppError('SYS-3001', 500, 'Tema ayarları kaydedilirken hata oluştu'));
    }
  } catch (error) {
    Logger.error('Error updating theme:', error);
    next(new AppError('SYS-3001', 500, 'Tema ayarları güncellenirken hata oluştu'));
  }
});

// Reset theme to defaults (admin only)
app.delete('/api/theme', authenticateToken, async (req, res, next) => {
  try {
    const defaultTheme = {
      light: {
        bg: '#f8f8f6',
        panel: '#fafaf8',
        ink: '#0b0b0b',
        muted: '#6b7280',
        line: '#e5e7eb',
        accent: '#A67B5B'
      },
      dark: {
        bg: '#0b0d0f',
        panel: '#14171a',
        ink: '#e8edf2',
        muted: '#9aa4b2',
        line: '#2a2f35',
        accent: '#A67B5B'
      },
      borderRadius: 16,
      shadowIntensity: 60,
      fontFamily: 'Inter'
    };

    const success = await writeThemeFile(defaultTheme);

    if (success) {
      res.json({
        success: true,
        message: 'Tema varsayılan ayarlara döndürüldü',
        theme: defaultTheme
      });
    } else {
      next(new AppError('SYS-3001', 500, 'Tema sıfırlanırken hata oluştu'));
    }
  } catch (error) {
    Logger.error('Error resetting theme:', error);
    next(new AppError('SYS-3001', 500, 'Tema sıfırlanırken hata oluştu'));
  }
});

// RSS endpoint
app.get('/rss.xml', async (req, res, next) => {
  try {
    // Check if file exists, if not generate it
    if (!await fs.pathExists('rss.xml')) {
      await generateRSS();
    }

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    const rssContent = await fs.readFile('rss.xml', 'utf8');
    res.send(rssContent);
  } catch (error) {
    Logger.error('Error serving RSS feed:', error);
    res.status(500).send('RSS feed yüklenirken hata oluştu');
  }
});

// Sitemap endpoint
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    // Check if file exists, if not generate it
    if (!await fs.pathExists('sitemap.xml')) {
      await generateSitemap();
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    const sitemapContent = await fs.readFile('sitemap.xml', 'utf8');
    res.send(sitemapContent);
  } catch (error) {
    Logger.error('Error serving Sitemap:', error);
    res.status(500).send('Sitemap yüklenirken hata oluştu');
  }
});

// GitHub Webhook endpoint for automatic deployment
app.post('/api/webhook/deploy', async (req, res, next) => {
  try {
    // Parse JSON from raw body
    let payload;
    try {
      payload = JSON.parse(req.body.toString());
    } catch (parseError) {
      Logger.error('❌ Failed to parse webhook payload:', parseError);
      return next(new AppError('VAL-2001', 400, 'Invalid JSON payload'));
    }

    // Verify webhook secret if configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) {
        Logger.warn('⚠️  Webhook request missing signature');
        return next(new AppError('AUTH-1001', 401, 'Unauthorized: Missing signature'));
      }

      // Verify signature using raw body
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = 'sha256=' + hmac.update(req.body).digest('hex');

      if (signature !== digest) {
        Logger.warn('⚠️  Webhook signature verification failed');
        return next(new AppError('AUTH-1001', 401, 'Unauthorized: Invalid signature'));
      }
    }

    // Check if this is a push event to main branch
    const event = req.headers['x-github-event'];

    if (event === 'push' && payload.ref === 'refs/heads/main') {
      Logger.info('🚀 Deployment webhook triggered');
      Logger.info(`📦 Commit: ${payload.head_commit?.id?.substring(0, 7)} - ${payload.head_commit?.message}`);
      Logger.info(`👤 Author: ${payload.head_commit?.author?.name}`);

      // Get the deployment script path
      const deployScriptPath = path.join(__dirname, 'scripts', 'deploy.sh');
      const projectPath = process.env.DEPLOY_PATH || __dirname;

      // Check if deploy.sh exists
      if (await fs.pathExists(deployScriptPath)) {
        Logger.info('📜 Running deployment script...');

        // Execute deployment script asynchronously
        execAsync(`bash ${deployScriptPath}`, {
          cwd: projectPath,
          env: { ...process.env, PATH: process.env.PATH }
        }).then(({ stdout, stderr }) => {
          if (stdout) Logger.info('✅ Deployment output:', stdout);
          if (stderr) Logger.warn('⚠️  Deployment warnings:', stderr);
          Logger.info('✅ Deployment completed successfully');
        }).catch((error) => {
          Logger.error('❌ Deployment error:', error.message);
        });

        // Respond immediately (don't wait for deployment to finish)
        res.status(200).json({
          success: true,
          message: 'Deployment started',
          commit: payload.head_commit?.id?.substring(0, 7),
          author: payload.head_commit?.author?.name,
          timestamp: new Date().toISOString()
        });
      } else {
        // If deploy.sh doesn't exist, try direct git pull
        Logger.info('📜 deploy.sh not found, attempting direct git pull...');

        execAsync('git pull origin main', {
          cwd: projectPath,
          env: { ...process.env, PATH: process.env.PATH }
        }).then(({ stdout, stderr }) => {
          if (stdout) Logger.info('✅ Git pull output:', stdout);
          if (stderr) Logger.warn('⚠️  Git pull warnings:', stderr);
          Logger.info('✅ Git pull completed successfully');
        }).catch((error) => {
          Logger.error('❌ Git pull error:', error.message);
        });

        res.status(200).json({
          success: true,
          message: 'Git pull started',
          commit: payload.head_commit?.id?.substring(0, 7),
          author: payload.head_commit?.author?.name,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Not a push to main branch, ignore
      Logger.info(`ℹ️  Webhook event ignored: ${event} to ${payload.ref}`);
      res.status(200).json({
        success: true,
        message: 'Event ignored (not a push to main branch)',
        event: event,
        ref: payload.ref
      });
    }
  } catch (error) {
    Logger.error('❌ Webhook error:', error);
    next(new AppError('SYS-3001', error, 'Webhook processing failed. Hata: ' + error.message));
  }
});

// Serve static files after API routes
app.use(express.static('.'));

// Start server
app.listen(PORT, async () => {
  try {
    // Validate and clean up stats data on startup
    Logger.info('[SYS-2008] Istatistik verileri dogrulaniyor...');
    await validateStatsData();
  } catch (error) {
    Logger.error('❌ Error validating stats data:', error.message);
  }

  try {
    // Clean up session data on startup
    Logger.info('[SYS-2009] Oturum (session) verileri temizleniyor...');
    try {
      if (typeof cleanupSessionData === 'function') {
        await cleanupSessionData();
      } else {
        Logger.error('❌ cleanupSessionData is not a function');
        console.trace('Trace for cleanupSessionData:');
      }
    } catch (innerError) {
      Logger.error('❌ Inner error running cleanupSessionData:', innerError);
      console.trace('Trace for inner error:');
    }
  } catch (error) {
    Logger.error('❌ Error cleaning up session data:', error.message);
  }

  try {
    // Generate initial RSS feed
    await generateRSS();
  } catch (error) {
    Logger.error('❌ Error generating RSS feed:', error.message);
  }

  // Set up automatic session cleanup scheduler
  setInterval(async () => {
    Logger.info('[SYS-2010] Zamanlanmis oturum (session) temizligi calistiriliyor...');
    try {
      if (typeof cleanupSessionData === 'function') {
        await cleanupSessionData();
      }
    } catch (e) {
      Logger.error('Interval session cleanup error', e);
    }
  }, SESSION_LIMITS.CLEANUP_INTERVAL);

  Logger.info(`[SYS-8000] Personal Site ${APP_VERSION} - Admin API Sunucusu ${PORT} portunda calisiyor`);
  Logger.info(`[SYS-8001] Guvenlik ve Oturum Yonetim Sistemi (Session Management) aktif`);
  Logger.info(`[SYS-8002] Istatistik Veri Dogrulama ve Temizleme Sistemi aktif`);
  Logger.info(`[SYS-8003] Otomatik Oturum Temizleme Sistemi aktif (her ${SESSION_LIMITS.CLEANUP_INTERVAL / (60 * 1000)} dakikada bir)`);
  // Logger.info(`📝 API Documentation:`);
  // Logger.info(`   POST /api/login - Login`);
  // Logger.info(`   GET  /api/posts - Get all posts`);
  // Logger.info(`   POST /api/posts - Create new post`);
  // Logger.info(`   PUT  /api/posts/:slug - Update post`);
  // Logger.info(`   DELETE /api/posts/:slug - Delete post`);
  // Logger.info(`   POST /api/upload - Upload image`);
  // Logger.info(`   GET  /api/stats - Get dashboard stats`);
  // Logger.info(`   GET  /api/comments/:slug - Get post comments`);
  // Logger.info(`   POST /api/comments/:slug - Add comment`);
  // Logger.info(`   GET  /api/admin/comments - Get all comments (admin)`);
  // Logger.info(`   PUT  /api/admin/comments/:id - Approve/reject comment (admin)`);
  // Logger.info(`   DELETE /api/admin/comments/:id - Delete comment (admin)`);
  // Logger.info(`   POST /api/admin/set-icon - Set new system icon (admin)`);
  // Logger.info(`   GET  /api/site-config - Get site configuration (admin)`);
  // Logger.info(`   PUT  /api/site-config - Update site configuration (admin)`);
  // Logger.info(`   PUT  /api/account/update - Update account settings (admin)`);
  // Logger.info(`   GET  /api/user/info - Get user info (admin)`);
  // Logger.info(`   GET  /api/theme - Get theme settings`);
  // Logger.info(`   PUT  /api/theme - Update theme settings (admin)`);
  // Logger.info(`   DELETE /api/theme - Reset theme to defaults (admin)`);
  // Logger.info(`   POST /api/admin/logs - Save console logs (admin)`);
  // Logger.info(`   GET  /api/admin/logs - Get console logs (admin)`);
});

// ====== Console Log Management ======
// Save client console logs to server
app.post('/api/admin/logs', authenticateToken, async (req, res, next) => {
  try {
    const { logs, timestamp, userAgent, url, sessionId } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return next(new AppError('VAL-2001', 400, 'Geçersiz log verisi'));
    }

    // Validate log entries
    for (const log of logs) {
      if (!log.id || !log.timestamp || !log.level || !log.message) {
        return next(new AppError('VAL-2001', 400, 'Geçersiz log giriş formatı'));
      }
    }

    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    // Create daily log file
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const logFile = path.join(logsDir, `console-${date}.json`);

    let logData = {
      metadata: {
        date: date,
        user: req.user.username,
        totalEntries: 0,
        levels: { error: 0, warn: 0, info: 0, log: 0, debug: 0 },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      entries: []
    };

    // Load existing data if file exists
    if (fs.existsSync(logFile)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        if (existingData.metadata && existingData.entries) {
          logData = existingData;
        }
      } catch (error) {
        Logger.error('Error reading existing log file:', error);
        // Continue with fresh data
      }
    }

    // Add new logs
    logData.entries.push(...logs);
    logData.metadata.totalEntries = logData.entries.length;
    logData.metadata.updatedAt = now.toISOString();

    // Count log levels
    logData.metadata.levels = { error: 0, warn: 0, info: 0, log: 0, debug: 0 };
    logData.entries.forEach(entry => {
      if (logData.metadata.levels.hasOwnProperty(entry.level)) {
        logData.metadata.levels[entry.level]++;
      }
    });

    // Check file size (max 10MB)
    const fileSize = JSON.stringify(logData).length;
    if (fileSize > 10 * 1024 * 1024) {
      // Keep only last 1000 entries if file is too large
      logData.entries = logData.entries.slice(-1000);
      logData.metadata.totalEntries = logData.entries.length;

      // Recalculate levels
      logData.metadata.levels = { error: 0, warn: 0, info: 0, log: 0, debug: 0 };
      logData.entries.forEach(entry => {
        if (logData.metadata.levels.hasOwnProperty(entry.level)) {
          logData.metadata.levels[entry.level]++;
        }
      });
    }

    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));

    res.json({
      success: true,
      message: 'Console logs saved successfully',
      entryCount: logs.length,
      logFile: `console-${date}.json`,
      totalEntries: logData.metadata.totalEntries,
      levels: logData.metadata.levels
    });

  } catch (error) {
    Logger.error('Error saving console logs:', error);
    next(new AppError('SYS-3001', 500, 'Konsol logları kaydedilemedi'));
  }
});

// Get console logs with filtering and pagination (admin only)
app.get('/api/admin/logs', authenticateToken, async (req, res, next) => {
  try {
    const {
      date,
      level,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const logsDir = path.join(__dirname, 'logs');

    if (!fs.existsSync(logsDir)) {
      return res.json({
        success: true,
        logs: [],
        pagination: { currentPage: 1, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'No logs directory found'
      });
    }

    // Read the combined.log file which uses NDJSON format (newline-delimited JSON)
    const combinedLogPath = path.join(logsDir, 'combined.log');
    if (!fs.existsSync(combinedLogPath)) {
      return res.json({
        success: true,
        logs: [],
        pagination: { currentPage: 1, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'No log files found'
      });
    }

    const logLines = fs.readFileSync(combinedLogPath, 'utf8').split('\n').filter(Boolean);

    // Group logs by Date (YYYY-MM-DD) for UI compatibility
    const logsByDate = {};

    logLines.forEach(line => {
      try {
        const entry = JSON.parse(line);
        if (!entry.timestamp) return;

        // Extract YYYY-MM-DD from custom "YYYY-MM-DD HH:mm:ss" format or ISO format
        const dateKey = entry.timestamp.includes(' ')
          ? entry.timestamp.split(' ')[0]
          : entry.timestamp.split('T')[0];

        if (!logsByDate[dateKey]) {
          logsByDate[dateKey] = {
            timestamp: dateKey,
            user: 'system',
            logCount: 0,
            levels: { INFO: 0, WARN: 0, ERROR: 0, FATAL: 0, DEBUG: 0 },
            logs: []
          };
        }

        logsByDate[dateKey].logCount++;
        if (entry.level) {
          logsByDate[dateKey].levels[entry.level] = (logsByDate[dateKey].levels[entry.level] || 0) + 1;
        }
        // Save the entry ensuring it has a message property for the UI search feature
        logsByDate[dateKey].logs.push({
          ...entry,
          message: entry.message || entry.errorMessage || 'No message'
        });
      } catch (e) {
        // Skip malformed lines silently
      }
    });

    let allLogs = Object.values(logsByDate).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply filters
    let filteredLogs = allLogs;

    if (level) {
      filteredLogs = filteredLogs.filter(log =>
        log.levels && log.levels[level] > 0
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.logs.some(entry =>
          entry.message.toLowerCase().includes(searchLower) ||
          entry.level.toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply pagination
    const totalLogs = filteredLogs.length;
    const totalPages = Math.ceil(totalLogs / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    res.json({
      success: true,
      logs: paginatedLogs,
      count: paginatedLogs.length,
      totalCount: totalLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    Logger.error('Error reading console logs:', error);
    next(new AppError('SYS-3001', 500, 'Konsol logları okunamadı'));
  }
});

// Helper function to calculate log levels from legacy format
function calculateLevels(logs) {
  const levels = { error: 0, warn: 0, info: 0, log: 0, debug: 0 };
  logs.forEach(log => {
    if (levels.hasOwnProperty(log.level)) {
      levels[log.level]++;
    }
  });
  return levels;
}

// Log cleanup endpoint (admin only)
app.delete('/api/admin/logs/cleanup', authenticateToken, async (req, res, next) => {
  try {
    const { retentionDays = 30 } = req.body;

    if (typeof retentionDays !== 'number' || retentionDays < 1) {
      return next(new AppError('VAL-2001', 400, 'Geçersiz saklama günü değeri'));
    }

    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      return res.json({
        success: true,
        message: 'No logs directory found',
        deletedFiles: 0,
        freedSpace: '0 Bytes'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('console-') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime
        };
      });

    let deletedCount = 0;
    let totalSize = 0;
    const deletedFiles = [];

    for (const file of logFiles) {
      const dateMatch = file.name.match(/console-(\d{4}-\d{2}-\d{2})\.json/);
      if (dateMatch) {
        const fileDate = new Date(dateMatch[1]);

        if (fileDate < cutoffDate) {
          fs.unlinkSync(file.path);
          deletedCount++;
          totalSize += file.size;
          deletedFiles.push(file.name);
        }
      }
    }

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    res.json({
      success: true,
      message: `Cleanup completed: ${deletedCount} files deleted`,
      deletedFiles: deletedCount,
      freedSpace: formatBytes(totalSize),
      retentionDays: retentionDays,
      files: deletedFiles
    });

  } catch (error) {
    Logger.error('Error during log cleanup:', error);
    next(new AppError('SYS-3001', 500, 'Loglar temizlenirken hata oluştu'));
  }
});

// ====== Fallback 404 Handler ======
app.use((req, res, next) => {
  // Only intercept API endpoints for JSON problem details
  if (req.originalUrl.startsWith('/api')) {
    next(new AppError('RES-6001', 404, 'The requested endpoint does not exist.'));
  } else {
    next(); // Let Express handle static file 404s
  }
});

// ====== Standardized Global Error Handler ======
// ====== Standardized Global Error Handler ======
app.use(globalErrorHandler);
