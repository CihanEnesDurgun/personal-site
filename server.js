// Load environment variables
require('dotenv').config();

// Environment Variables Validation
const requiredEnvVars = ['JWT_SECRET', 'BCRYPT_SALT_ROUNDS'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ CRITICAL ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('💡 Please check your .env file and ensure all required variables are set.');
  console.error('💡 Copy env.example to .env and fill in the required values.');
  console.error('🚨 System will exit for security reasons.');
  process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL ERROR: JWT_SECRET must be at least 32 characters long for security.');
  console.error('🚨 System will exit for security reasons.');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? 'SET (' + process.env.JWT_SECRET.length + ' chars)' : 'NOT SET'}`);
console.log(`🔒 BCRYPT_SALT_ROUNDS: ${process.env.BCRYPT_SALT_ROUNDS}`);

// Load and validate configuration
let config;
try {
  config = require('./config.json');
  if (!config.development_mode || !config.development || !config.production) {
    throw new Error('Invalid config.json structure');
  }
  
  // Determine mode based on development_mode setting
  const isDevelopment = config.development_mode === "on";
  const currentMode = isDevelopment ? "development" : "production";
  
  console.log(`🔧 Configuration loaded - Development Mode: ${config.development_mode}`);
  console.log(`🌐 Current domain: ${config[currentMode].domain}`);
} catch (error) {
  console.error('❌ CRITICAL ERROR: Failed to load config.json');
  console.error('💡 Please ensure config.json exists and has valid structure.');
  console.error('🚨 System will exit.');
  process.exit(1);
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
const SessionManager = require('./lib/sessionManager');
const LogCleanupManager = require('./lib/logCleanupManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Session Manager with error handling
let sessionManager;
try {
  sessionManager = new SessionManager();
  console.log('✅ Session Manager initialized successfully');
} catch (error) {
  console.error('❌ Session Manager initialization failed:', error);
  console.log('⚠️  Continuing with basic JWT authentication only');
  sessionManager = null;
}

// Initialize Log Cleanup Manager
let logCleanupManager;
try {
  logCleanupManager = new LogCleanupManager(30); // 30 days retention
  logCleanupManager.scheduleCleanup();
  console.log('✅ Log Cleanup Manager initialized successfully');
} catch (error) {
  console.error('❌ Log Cleanup Manager initialization failed:', error);
  logCleanupManager = null;
}

// Rate Limiting Configuration
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX) || 10000; // Increased for development
const rateLimitWindow = 15 * 60 * 1000; // 15 minutes

const generalLimiter = rateLimit({
  windowMs: rateLimitWindow,
  max: rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(rateLimitWindow / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(rateLimitWindow / 1000)
    });
  }
});

// Stricter rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per 15 minutes (increased for development)
  message: {
    error: 'Too many login attempts, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Login rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts, please try again later.',
      retryAfter: 900
    });
  }
});

// CORS Configuration - Enhanced Security (from config.json)
const isDevelopment = config.development_mode === "on";
const currentMode = isDevelopment ? "development" : "production";
const allowedOrigins = config[currentMode].corsOrigins;

const corsOptions = {
  origin: function (origin, callback) {
    // In production, be extremely strict
    if (process.env.NODE_ENV === 'production') {
      if (!origin) {
        console.warn('🚨 Production: Request blocked - No origin header');
        return callback(new Error('Origin required in production'), false);
      }
      
      // Validate origin format in production
      if (!/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::[0-9]+)?$/.test(origin)) {
        console.warn(`🚨 Production: Invalid origin format: ${origin}`);
        return callback(new Error('Invalid origin format'), false);
      }
    }
    
    // Development mode - allow localhost and 127.0.0.1
    if (process.env.NODE_ENV !== 'production') {
      if (!origin) {
        console.log('🔧 Development: Allowing request without origin');
        return callback(null, true);
      }
      
      // Allow localhost and 127.0.0.1 in development
      if (/^(http:\/\/localhost|http:\/\/127\.0\.0\.1)(:[0-9]+)?$/.test(origin)) {
        console.log(`🔧 Development: Allowing local origin: ${origin}`);
        return callback(null, true);
      }
    }
    
    // Check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS: Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`🚨 CORS blocked request from origin: ${origin}`);
      callback(new Error(`CORS policy violation - Origin '${origin}' not allowed`), false);
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

// Apply security middleware
app.use(cors(corsOptions));
app.use(generalLimiter); // Rate limiting enabled for security
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
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
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

// ====== Enhanced Error Handling System ======

// Error logging system
const logError = (error, req, context = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    context: context
  };
  
  // Console logging with colors
  console.error('🚨 API Error:', {
    message: error.message,
    code: context.code || 'UNKNOWN',
    url: `${req.method} ${req.url}`,
    ip: req.ip,
    timestamp: logData.timestamp
  });
  
  // In production, you might want to send to external logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to external logging service (e.g., Sentry, LogRocket)
    console.error('📊 Full Error Log:', JSON.stringify(logData, null, 2));
  } else {
    console.error('🔍 Development Error Details:', error.stack);
  }
};

// Standardized error response creator
const createErrorResponse = (statusCode, message, details = null, code = null, context = {}) => {
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    statusCode: statusCode,
    requestId: context.requestId || generateRequestId()
  };
  
  if (details) {
    errorResponse.details = details;
  }
  
  if (code) {
    errorResponse.code = code;
  }
  
  // Add helpful links for common errors
  if (code === 'VALIDATION_ERROR') {
    errorResponse.help = 'Check your input data format and required fields';
  } else if (code === 'AUTHENTICATION_ERROR') {
    errorResponse.help = 'Ensure you have a valid authentication token';
  } else if (code === 'RATE_LIMIT_EXCEEDED') {
    errorResponse.help = 'Wait before making more requests';
  }
  
  return errorResponse;
};

// Generate unique request ID for tracking
const generateRequestId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Input validation helper
const validateRequired = (data, requiredFields, context = {}) => {
  const missing = [];
  
  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  });
  
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.code = 'VALIDATION_ERROR';
    error.details = { missingFields: missing };
    error.context = context;
    throw error;
  }
};

// Enhanced Global Error Handler Middleware
app.use((err, req, res, next) => {
  const context = {
    requestId: generateRequestId(),
    code: err.code || 'UNKNOWN_ERROR',
    user: req.user ? req.user.username : 'anonymous',
    ...err.context
  };
  
  // Log the error with full context
  logError(err, req, context);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(createErrorResponse(400, 'Validation Error', err.message, 'VALIDATION_ERROR', context));
  }
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json(createErrorResponse(400, 'File too large', `Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`, 'FILE_SIZE_LIMIT', context));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json(createErrorResponse(400, 'Too many files', 'Only one file allowed per upload', 'FILE_COUNT_LIMIT', context));
    }
    return res.status(400).json(createErrorResponse(400, 'File upload error', err.message, 'UPLOAD_ERROR', context));
  }
  
  // Handle custom error codes
  if (err.code === 'VALIDATION_ERROR') {
    return res.status(400).json(createErrorResponse(400, err.message, err.details, 'VALIDATION_ERROR', context));
  }
  
  if (err.code === 'AUTHENTICATION_ERROR') {
    return res.status(401).json(createErrorResponse(401, err.message || 'Authentication failed', null, 'AUTHENTICATION_ERROR', context));
  }
  
  if (err.code === 'AUTHORIZATION_ERROR') {
    return res.status(403).json(createErrorResponse(403, err.message || 'Access denied', null, 'AUTHORIZATION_ERROR', context));
  }
  
  if (err.code === 'NOT_FOUND') {
    return res.status(404).json(createErrorResponse(404, err.message || 'Resource not found', null, 'NOT_FOUND', context));
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(createErrorResponse(401, 'Invalid token', null, 'INVALID_TOKEN', context));
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(createErrorResponse(401, 'Token expired', null, 'TOKEN_EXPIRED', context));
  }
  
  // Handle file system errors
  if (err.code === 'ENOENT') {
    return res.status(404).json(createErrorResponse(404, 'File not found', null, 'FILE_NOT_FOUND', context));
  }
  
  if (err.code === 'EACCES') {
    return res.status(403).json(createErrorResponse(403, 'Permission denied', null, 'PERMISSION_DENIED', context));
  }
  
  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  const errorMessage = isDevelopment ? err.message : 'Internal server error';
  const errorDetails = isDevelopment ? (err.details || err.stack) : null;
  const errorCode = err.code || 'INTERNAL_ERROR';
  
  res.status(statusCode).json(createErrorResponse(statusCode, errorMessage, errorDetails, errorCode, context));
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
    return cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`), false);
  }
  
  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return cb(new Error(`File extension not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return cb(new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`), false);
  }
  
  // File is valid
  cb(null, true);
};

// Multer configuration for secure file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images/')
  },
  filename: function (req, file, cb) {
    // Preserve original filename but ensure it's safe
    let filename = file.originalname;
    
    // Remove any path separators and dangerous characters
    filename = filename.replace(/[\/\\:*?"<>|]/g, '_');
    
    // Ensure filename is not empty and has proper extension
    if (!filename || filename.trim() === '') {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = path.extname(file.originalname).toLowerCase();
      filename = `upload-${timestamp}-${randomSuffix}${fileExtension}`;
    }
    
    cb(null, filename);
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
      const error = new Error('Access token required');
      error.code = 'AUTHENTICATION_ERROR';
      error.context = { endpoint: req.path, method: req.method };
      throw error;
    }

    // First, validate JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const error = new Error('Invalid or expired token');
      error.code = 'AUTHENTICATION_ERROR';
      error.context = { endpoint: req.path, method: req.method, jwtError: err.name };
      throw error;
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
          return res.status(403).json({ 
            error: 'Session expired or invalid',
            code: 'INVALID_SESSION'
          });
        }
      } catch (sessionError) {
        console.warn('⚠️  Session validation failed, falling back to JWT only:', sessionError.message);
        // Fallback to basic JWT validation
        req.user = decoded;
      }
    } else {
      // Basic JWT validation only
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
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
    console.error('Error reading users file:', error);
    // Create default admin user with secure random password
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(defaultPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS));
    const defaultData = { 
      admin: { 
        username: 'admin', 
        password: hashedPassword, 
        lastUpdated: new Date().toISOString(),
        isHashed: true
      }
    };
    
    console.log('🔐 Default admin user created with secure password');
    console.log('⚠️  IMPORTANT: Change the default password immediately after first login!');
    
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
    console.error('Error writing users file:', error);
    return false;
  }
};

// ====== Session Management Functions ======
const readSessionsFile = async () => {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading sessions file:', error);
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
      console.log(`🧹 Cleaned up ${sessions.activeSessions.length - validActiveSessions.length} expired sessions`);
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
      console.log(`🧹 Limited active sessions to ${SESSION_LIMITS.ACTIVE_SESSIONS} per user`);
    }
    
    // Limit login history
    if (sessions.loginHistory.length > SESSION_LIMITS.LOGIN_HISTORY) {
      sessions.loginHistory = sessions.loginHistory.slice(0, SESSION_LIMITS.LOGIN_HISTORY);
      cleaned = true;
      console.log(`🧹 Limited login history to ${SESSION_LIMITS.LOGIN_HISTORY} records`);
    }
    
    // Limit failed logins
    if (sessions.failedLogins.length > SESSION_LIMITS.FAILED_LOGINS) {
      sessions.failedLogins = sessions.failedLogins.slice(0, SESSION_LIMITS.FAILED_LOGINS);
      cleaned = true;
      console.log(`🧹 Limited failed logins to ${SESSION_LIMITS.FAILED_LOGINS} records`);
    }
    
    // Save cleaned data if any changes
    if (cleaned) {
      await writeSessionsFile(sessions);
      console.log('✅ Session data cleanup completed');
    }
    
    return sessions;
  } catch (error) {
    console.error('Error during session cleanup:', error);
    return null;
  }
};

const writeSessionsFile = async (sessions) => {
  try {
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing sessions file:', error);
    return false;
  }
};

// ====== Theme Management Functions ======
const readThemeFile = async () => {
  try {
    const data = await fs.readFile(THEME_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading theme file:', error);
    // Return default theme if file doesn't exist
    return {
      light: {
        bg: '#f8f8f6',
        panel: '#fafaf8',
        ink: '#0b0b0b',
        muted: '#6b7280',
        line: '#e5e7eb',
        accent: '#84CC16'
      },
      dark: {
        bg: '#0b0d0f',
        panel: '#14171a',
        ink: '#e8edf2',
        muted: '#9aa4b2',
        line: '#2a2f35',
        accent: '#84CC16'
      },
      borderRadius: 16,
      shadowIntensity: 60,
      fontFamily: 'Inter'
    };
  }
};

const writeThemeFile = async (theme) => {
  try {
    await fs.writeFile(THEME_FILE, JSON.stringify(theme, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing theme file:', error);
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
    console.error('Error logging successful login:', error);
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
  } catch (error) {
    console.error('Error logging failed login:', error);
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
    console.error('Error adding active session:', error);
  }
};

const removeActiveSession = async (username) => {
  try {
    const sessions = await readSessionsFile();
    sessions.activeSessions = sessions.activeSessions.filter(s => s.username !== username);
    await writeSessionsFile(sessions);
  } catch (error) {
    console.error('Error removing active session:', error);
  }
};

const readPostsFile = async () => {
  try {
    const data = await fs.readFile(POSTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading posts file:', error);
    return [];
  }
};

const writePostsFile = async (posts) => {
  try {
    await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing posts file:', error);
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
    console.error('Error writing stats file:', error);
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
        console.log(`🧹 Cleaning up stats for deleted post: ${slug}`);
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
    console.log(`✅ Stats data cleaned successfully. Total views: ${stats.totalViews}`);
    
    return stats;
  } catch (error) {
    console.error('Error cleaning stats data:', error);
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
      console.log(`⚠️  Found orphaned stats for deleted posts: ${orphanedStats.join(', ')}`);
      return false;
    }
    
    // Check for missing stats
    const missingStats = validPostSlugs.filter(slug => !stats.postViews[slug]);
    
    if (missingStats.length > 0) {
      console.log(`⚠️  Found posts without stats: ${missingStats.join(', ')}`);
      // Initialize missing stats with 0
      missingStats.forEach(slug => {
        stats.postViews[slug] = 0;
      });
      await writeStatsFile(stats);
    }
    
    console.log('✅ Stats data validation completed successfully');
    return true;
  } catch (error) {
    console.error('Error validating stats data:', error);
    return false;
  }
};

const incrementPageView = async (page) => {
  const stats = await readStatsFile();
  
  // Increment total views
  stats.totalViews = (stats.totalViews || 0) + 1;
  
  // Increment page views
  stats.pageViews[page] = (stats.pageViews[page] || 0) + 1;
  
  // Increment daily stats
  const today = new Date().toISOString().split('T')[0];
  if (!stats.dailyStats[today]) {
    stats.dailyStats[today] = {
      totalViews: 0,
      pageViews: {}
    };
  }
  stats.dailyStats[today].totalViews++;
  stats.dailyStats[today].pageViews[page] = (stats.dailyStats[today].pageViews[page] || 0) + 1;
  
  await writeStatsFile(stats);
  return stats;
};

const incrementPostView = async (slug) => {
  const stats = await readStatsFile();
  
  // Increment total views
  stats.totalViews = (stats.totalViews || 0) + 1;
  
  // Increment post views
  stats.postViews[slug] = (stats.postViews[slug] || 0) + 1;
  
  // Increment daily stats
  const today = new Date().toISOString().split('T')[0];
  if (!stats.dailyStats[today]) {
    stats.dailyStats[today] = {
      totalViews: 0,
      pageViews: {},
      postViews: {}  // YENİ: Günlük yazı görüntüleme
    };
  }
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
    return JSON.parse(data);
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
    console.error('Error writing comments file:', error);
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
    <link>https://cihanenesdurgun.com</link>
    <atom:link href="https://cihanenesdurgun.com/rss.xml" rel="self" type="application/rss+xml" />
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    
    ${publishedPosts.map(post => {
      const pubDate = new Date(post.date).toUTCString();
      const categories = post.tags ? post.tags.map(tag => `<category>${tag}</category>`).join('\n      ') : '';
      
      return `    <item>
      <title>${post.title}</title>
      <description>${post.excerpt}</description>
      <link>https://cihanenesdurgun.com/post.html?slug=${post.slug}</link>
      <guid>https://cihanenesdurgun.com/post.html?slug=${post.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      ${categories}
    </item>`;
    }).join('\n\n    ')}
  </channel>
</rss>`;

    await fs.writeFile('rss.xml', rssContent, 'utf8');
    console.log('RSS feed updated successfully');
    return true;
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return false;
  }
};

// ====== API Routes ======

// Login endpoint with strict rate limiting
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readUsersFile();
    
    const user = users[username];
    
    if (!user) {
      await logFailedLogin(username, req, 'User not found');
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
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
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS));
        users[username].password = hashedPassword;
        users[username].isHashed = true;
        users[username].lastUpdated = new Date().toISOString();
        await writeUsersFile(users);
        console.log(`Password migrated to hashed format for user: ${username}`);
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
          
          console.log(`✅ Successful login with session: ${username} from ${ip}`);
        } catch (sessionError) {
          console.warn('⚠️  Session creation failed, using basic JWT:', sessionError.message);
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
          
          console.log(`✅ Successful login (JWT fallback): ${username}`);
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
        
        console.log(`✅ Successful login (JWT only): ${username}`);
      }
    } else {
      // Log failed login attempt
      if (sessionManager) {
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        await sessionManager.logLoginAttempt(username, ip, userAgent, false);
      }
      res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
app.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    if (sessionManager && req.user.sessionId) {
      await sessionManager.invalidateSession(req.user.sessionId);
      console.log(`✅ User logged out: ${req.user.username} (${req.user.sessionId})`);
    }
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Get session info endpoint
app.get('/api/session', authenticateToken, async (req, res) => {
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
    console.error('❌ Session info error:', error);
    res.status(500).json({ 
      error: 'Failed to get session info',
      code: 'SESSION_INFO_ERROR'
    });
  }
});

// Get session statistics (admin only)
app.get('/api/sessions/stats', authenticateToken, async (req, res) => {
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
    console.error('❌ Session stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get session statistics',
      code: 'SESSION_STATS_ERROR'
    });
  }
});

// Get all posts
app.get('/api/posts', authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

// Get single post
app.get('/api/posts/:slug', authenticateToken, async (req, res) => {
  try {
    const posts = await readPostsFile();
    const post = posts.find(p => p.slug === req.params.slug);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Read markdown content
    const markdownPath = path.join(CONTENT_DIR, `${post.slug}.md`);
    let content = '';
    
    try {
      content = await fs.readFile(markdownPath, 'utf8');
    } catch (error) {
      console.log('Markdown file not found, using empty content');
    }

    res.json({ ...post, content });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching post' });
  }
});

// Create new post
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { title, excerpt, date, cover, coverCaption, tags, content, featured, status, publishDate } = req.body;
    
    // Enhanced input validation
    validateRequired(req.body, ['title', 'excerpt', 'content'], {
      endpoint: '/api/posts',
      method: 'POST',
      user: req.user?.username
    });
    
    // Additional validation
    if (title.length < 3) {
      const error = new Error('Title must be at least 3 characters long');
      error.code = 'VALIDATION_ERROR';
      error.details = { field: 'title', minLength: 3 };
      throw error;
    }
    
    if (excerpt.length < 10) {
      const error = new Error('Excerpt must be at least 10 characters long');
      error.code = 'VALIDATION_ERROR';
      error.details = { field: 'excerpt', minLength: 10 };
      throw error;
    }
    
    if (content.length < 50) {
      const error = new Error('Content must be at least 50 characters long');
      error.code = 'VALIDATION_ERROR';
      error.details = { field: 'content', minLength: 50 };
      throw error;
    }

    const slug = generateSlug(title);
    const posts = await readPostsFile();

    // Check if slug already exists
    if (posts.find(p => p.slug === slug)) {
      return res.status(400).json({ error: 'Post with this title already exists' });
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
      return res.status(500).json({ error: 'Error saving post metadata' });
    }

    // Save markdown content
    const markdownPath = path.join(CONTENT_DIR, `${slug}.md`);
    await fs.writeFile(markdownPath, content);

    // Generate RSS feed after new post creation
    await generateRSS();

    res.json({ success: true, post: newPost });
  } catch (error) {
    console.error('Error creating post:', error);
    console.error('Error details:', error.message);
    console.error('Request body:', req.body);
    
    // Send more detailed error message to client
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ 
        error: error.message,
        details: error.details 
      });
    }
    
    res.status(500).json({ 
      error: 'Error creating post',
      message: error.message 
    });
  }
});

// Update post
app.put('/api/posts/:slug', authenticateToken, async (req, res) => {
  try {
    const { title, excerpt, date, cover, coverCaption, tags, content, featured, status, publishDate } = req.body;
    const originalSlug = req.params.slug;
    
    if (!title || !excerpt || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newSlug = generateSlug(title);
    const posts = await readPostsFile();
    
    const postIndex = posts.findIndex(p => p.slug === originalSlug);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if new slug conflicts with other posts
    if (originalSlug !== newSlug && posts.find(p => p.slug === newSlug)) {
      return res.status(400).json({ error: 'Post with this title already exists' });
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
      return res.status(500).json({ error: 'Error saving post metadata' });
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
        console.log('Old markdown file not found');
      }
    }

    // Generate RSS feed after post update
    await generateRSS();

    res.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Error updating post' });
  }
});

// Toggle featured status
app.patch('/api/posts/:slug/featured', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.slug;
    const { featured } = req.body;
    
    if (typeof featured !== 'boolean') {
      return res.status(400).json({ error: 'Featured status must be a boolean' });
    }

    const posts = await readPostsFile();
    const postIndex = posts.findIndex(p => p.slug === slug);
    
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
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
      return res.status(500).json({ error: 'Error saving post metadata' });
    }

    // Generate RSS feed after featured status update
    await generateRSS();

    res.json({ 
      success: true, 
      message: `Post ${featured ? 'featured' : 'unfeatured'} successfully`,
      post: posts[postIndex]
    });
  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.status(500).json({ error: 'Error updating featured status' });
  }
});

// Soft delete post (move to trash)
app.delete('/api/posts/:slug', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();
    
    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
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
      return res.status(500).json({ error: 'Error saving posts metadata' });
    }

    // Clean up stats data for deleted post
    await cleanupStatsData();
    
    // Generate RSS feed after post deletion
    await generateRSS();

    res.json({ 
      success: true, 
      message: 'Post moved to trash successfully' 
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Error deleting post' });
  }
});

// Publish/Schedule post
app.post('/api/posts/:slug/publish', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.slug;
    const { status, publishDate } = req.body;
    
    if (!status || !['published', 'scheduled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (status === 'scheduled' && !publishDate) {
      return res.status(400).json({ error: 'Publish date is required for scheduled posts' });
    }

    const posts = await readPostsFile();
    const postIndex = posts.findIndex(p => p.slug === slug);
    
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
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
      return res.status(500).json({ error: 'Error saving post metadata' });
    }

    // Generate RSS feed after post publishing
    await generateRSS();

    res.json({ 
      success: true, 
      message: status === 'published' ? 'Post published successfully' : 'Post scheduled successfully',
      post: posts[postIndex]
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ error: 'Error publishing post' });
  }
});

// Restore post from trash
app.post('/api/posts/:slug/restore', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();
    
    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
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
      return res.status(500).json({ error: 'Error saving post metadata' });
    }

    // Generate RSS feed after post restoration
    await generateRSS();

    res.json({ 
      success: true, 
      message: 'Post restored successfully',
      post: posts[postIndex]
    });
  } catch (error) {
    console.error('Error restoring post:', error);
    res.status(500).json({ error: 'Error restoring post' });
  }
});

// Restore deleted post from trash
app.put('/api/posts/:slug/restore', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();
    
    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = posts[postIndex];
    
    // Check if post is actually deleted
    if (post.status !== 'deleted') {
      console.error(`Attempted to restore post ${slug} with status: ${post.status}`);
      return res.status(400).json({ error: 'Post is not in trash' });
    }

    // Log what we're about to restore
    console.log(`Restoring post: ${slug} (${post.title}) from status: ${post.status}`);

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
      return res.status(500).json({ error: 'Error saving posts metadata' });
    }

    // Validate stats data after post restoration
    await validateStatsData();
    
    // Generate RSS feed after post restoration
    await generateRSS();

    console.log(`Post ${slug} restored successfully`);

    res.json({ 
      success: true, 
      message: 'Post restored successfully',
      post: posts[postIndex]
    });
  } catch (error) {
    console.error('Error restoring post:', error);
    res.status(500).json({ error: 'Error restoring post' });
  }
});

// Permanent delete post from trash
app.delete('/api/posts/:slug/permanent', authenticateToken, async (req, res) => {
  try {
    const slug = req.params.slug;
    const posts = await readPostsFile();
    
    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = posts[postIndex];
    
    // Check if post is actually deleted
    if (post.status !== 'deleted') {
      console.error(`Attempted to permanently delete post ${slug} with status: ${post.status}`);
      return res.status(400).json({ error: 'Post is not in trash' });
    }

    // Log what we're about to delete
    console.log(`Permanently deleting post: ${slug} (post.title}) with status: ${post.status}`);

    // Remove from posts array permanently
    posts.splice(postIndex, 1);
    
    // Save posts.json
    const saved = await writePostsFile(posts);
    if (!saved) {
      return res.status(500).json({ error: 'Error saving posts metadata' });
    }

    // Delete markdown file permanently
    const markdownPath = path.join(CONTENT_DIR, `${slug}.md`);
    try {
      await fs.remove(markdownPath);
      console.log(`Markdown file deleted: ${markdownPath}`);
    } catch (error) {
      console.log(`Markdown file not found or already deleted: ${markdownPath}`);
    }

    // Clean up stats data for permanently deleted post
    await cleanupStatsData();
    
    // Generate RSS feed after permanent post deletion
    await generateRSS();

    console.log(`Post ${slug} permanently deleted successfully`);

    res.json({ 
      success: true, 
      message: 'Post permanently deleted' 
    });
  } catch (error) {
    console.error('Error permanently deleting post:', error);
    res.status(500).json({ error: 'Error permanently deleting post' });
  }
});

// Upload image with enhanced error handling and folder support
app.post('/api/upload', authenticateToken, (req, res) => {
  // Use upload.single with error handling
  upload.single('image')(req, res, async (err) => {
    try {
      if (err) {
        // Handle multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            error: 'File too large', 
            details: `Maximum file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            code: 'FILE_SIZE_LIMIT'
          });
        }
        
        if (err.message && err.message.includes('File type not allowed')) {
          return res.status(400).json({ 
            error: 'File type not allowed', 
            details: `Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
            code: 'FILE_TYPE_NOT_ALLOWED'
          });
        }
        
        if (err.message && err.message.includes('File extension not allowed')) {
          return res.status(400).json({ 
            error: 'File extension not allowed', 
            details: `Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
            code: 'FILE_EXTENSION_NOT_ALLOWED'
          });
        }
        
        console.error('File upload error:', err);
        return res.status(400).json({ 
          error: 'File upload failed', 
          details: err.message,
          code: 'UPLOAD_ERROR'
        });
      }
      
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          details: 'Please select an image file to upload',
          code: 'NO_FILE'
        });
      }

      // Get target folder from request
      const targetFolder = req.body.folder || 'blog-content';
      const validFolders = ['system', 'profile', 'blog-covers', 'blog-content'];
      
      if (!validFolders.includes(targetFolder)) {
        return res.status(400).json({
          error: 'Invalid folder',
          details: `Valid folders: ${validFolders.join(', ')}`,
          code: 'INVALID_FOLDER'
        });
      }

      // Move file to target folder
      const targetPath = path.join(__dirname, 'images', targetFolder, req.file.filename);
      const sourcePath = req.file.path;
      
      try {
        await fs.move(sourcePath, targetPath, { overwrite: true });
        console.log(`✅ File moved to ${targetFolder}: ${req.file.originalname} -> ${req.file.filename}`);
      } catch (moveError) {
        console.error('Error moving file to target folder:', moveError);
        // If move fails, try to copy instead
        try {
          await fs.copy(sourcePath, targetPath);
          await fs.remove(sourcePath);
          console.log(`✅ File copied to ${targetFolder}: ${req.file.originalname} -> ${req.file.filename}`);
        } catch (copyError) {
          console.error('Error copying file to target folder:', copyError);
          return res.status(500).json({
            error: 'Error saving file to target folder',
            details: 'File uploaded but could not be moved to destination',
            code: 'FOLDER_SAVE_ERROR'
          });
        }
      }

      // Log successful upload
      console.log(`✅ File uploaded successfully to ${targetFolder}: ${req.file.originalname} -> ${req.file.filename}`);
      
      const imageUrl = `images/${targetFolder}/${req.file.filename}`;
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
      console.error('Error processing uploaded file:', error);
      res.status(500).json({ 
        error: 'Error processing uploaded file',
        details: 'Internal server error during file processing',
        code: 'PROCESSING_ERROR'
      });
    }
  });
});

// Get deleted images (must be before /api/gallery/:folder)
app.get('/api/gallery/deleted', authenticateToken, async (req, res) => {
  try {
    console.log('Getting deleted images...');
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
      console.log('No deleted images metadata found');
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
    console.error('Error getting deleted images:', error);
    res.status(500).json({
      error: 'Error getting deleted images',
      details: 'Internal server error',
      code: 'GALLERY_ERROR'
    });
  }
});

// Get gallery images for a specific folder
app.get('/api/gallery/:folder', authenticateToken, async (req, res) => {
  try {
    const { folder } = req.params;
    const validFolders = ['system', 'profile', 'blog-covers', 'blog-content'];
    
    if (!validFolders.includes(folder)) {
      return res.status(400).json({
        error: 'Invalid folder',
        details: `Valid folders: ${validFolders.join(', ')}`,
        code: 'INVALID_FOLDER'
      });
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
    console.error('Error getting gallery images:', error);
    res.status(500).json({
      error: 'Error getting gallery images',
      details: 'Internal server error',
      code: 'GALLERY_ERROR'
    });
  }
});

// Restore deleted image (must be before /api/gallery/:folder/:filename)
app.post('/api/gallery/deleted/:filename/restore', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const deletedPath = path.join(__dirname, 'images', 'deleted', filename);
    const deletedImagesPath = path.join(__dirname, 'data', 'deleted-images.json');
    
    // Check if file exists in deleted folder
    if (!await fs.pathExists(deletedPath)) {
      return res.status(404).json({
        error: 'File not found in deleted folder',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Get metadata to find original folder
    let deletedImages = [];
    try {
      if (await fs.pathExists(deletedImagesPath)) {
        deletedImages = await fs.readJson(deletedImagesPath);
      }
    } catch (error) {
      console.log('No deleted images metadata found');
    }

    const meta = deletedImages.find(m => m.filename === filename);
    if (!meta) {
      return res.status(400).json({
        error: 'No metadata found for deleted image',
        code: 'NO_METADATA'
      });
    }

    const originalPath = path.join(__dirname, 'images', meta.originalFolder, filename);
    
    // Check if file already exists in original location
    if (await fs.pathExists(originalPath)) {
      return res.status(400).json({
        error: 'File already exists in original location',
        code: 'FILE_EXISTS'
      });
    }

    // Move file back to original location
    await fs.move(deletedPath, originalPath);
    
    // Remove from deleted images metadata
    deletedImages = deletedImages.filter(m => m.filename !== filename);
    await fs.writeJson(deletedImagesPath, deletedImages, { spaces: 2 });
    
    console.log(`✅ Image restored: ${filename} to ${meta.originalFolder}`);

    res.json({ 
      success: true, 
      message: 'Image restored successfully' 
    });
    
  } catch (error) {
    console.error('Error restoring image:', error);
    res.status(500).json({
      error: 'Error restoring image',
      details: 'Internal server error',
      code: 'RESTORE_ERROR'
    });
  }
});

// Permanently delete image from deleted folder (must be before /api/gallery/:folder/:filename)
app.delete('/api/gallery/deleted/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const deletedPath = path.join(__dirname, 'images', 'deleted', filename);
    const deletedImagesPath = path.join(__dirname, 'data', 'deleted-images.json');
    
    // Check if file exists in deleted folder
    if (!await fs.pathExists(deletedPath)) {
      return res.status(404).json({
        error: 'File not found in deleted folder',
        code: 'FILE_NOT_FOUND'
      });
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
      console.log('No deleted images metadata found');
    }

    deletedImages = deletedImages.filter(m => m.filename !== filename);
    await fs.writeJson(deletedImagesPath, deletedImages, { spaces: 2 });
    
    console.log(`✅ Image permanently deleted: ${filename}`);

    res.json({ 
      success: true, 
      message: 'Image permanently deleted' 
    });
    
  } catch (error) {
    console.error('Error permanently deleting image:', error);
    res.status(500).json({
      error: 'Error permanently deleting image',
      details: 'Internal server error',
      code: 'DELETE_ERROR'
    });
  }
});

// Move image to deleted folder (soft delete)
app.delete('/api/gallery/:folder/:filename', authenticateToken, async (req, res) => {
  try {
    const { folder, filename } = req.params;
    const validFolders = ['system', 'profile', 'blog-covers', 'blog-content'];
    
    if (!validFolders.includes(folder)) {
      return res.status(400).json({
        error: 'Invalid folder',
        details: `Valid folders: ${validFolders.join(', ')}`,
        code: 'INVALID_FOLDER'
      });
    }

    const sourcePath = path.join(__dirname, 'images', folder, filename);
    const deletedDir = path.join(__dirname, 'images', 'deleted');
    const deletedPath = path.join(deletedDir, filename);
    
    // Check if file exists
    if (!await fs.pathExists(sourcePath)) {
      return res.status(404).json({
        error: 'File not found',
        details: 'The specified image file does not exist',
        code: 'FILE_NOT_FOUND'
      });
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
      console.log('Creating new deleted images file');
    }

    // Add deletion record
    deletedImages.push({
      filename: filename,
      originalFolder: folder,
      deletedAt: new Date().toISOString(),
      originalPath: `images/${folder}/${filename}`
    });

    await fs.writeJson(deletedImagesPath, deletedImages, { spaces: 2 });
    
    console.log(`✅ Image moved to deleted: ${folder}/${filename}`);

    res.json({ 
      success: true, 
      message: 'Image moved to deleted folder' 
    });
    
  } catch (error) {
    console.error('Error moving image to deleted:', error);
    res.status(500).json({
      error: 'Error moving image to deleted',
      details: 'Internal server error',
      code: 'DELETE_ERROR'
    });
  }
});


// Get dashboard stats
app.get('/api/stats', authenticateToken, async (req, res) => {
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
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get configuration for frontend
app.get('/api/config', (req, res) => {
  try {
    const isDevelopment = config.development_mode === "on";
    const currentMode = isDevelopment ? "development" : "production";
    
    res.json({
      development_mode: config.development_mode,
      mode: currentMode,
      domain: config[currentMode].domain,
      apiUrl: config[currentMode].apiUrl,
      corsOrigins: config[currentMode].corsOrigins
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// ====== Statistics API Routes ======

// Track page view
app.post('/api/stats/pageview', async (req, res) => {
  try {
    const { page } = req.body;
    if (!page) {
      return res.status(400).json({ error: 'Page parameter required' });
    }
    
    const stats = await incrementPageView(page);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

// Track post view
app.post('/api/stats/postview', async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug) {
      return res.status(400).json({ error: 'Slug parameter required' });
    }
    
    const stats = await incrementPostView(slug);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error tracking post view:', error);
    res.status(500).json({ error: 'Failed to track post view' });
  }
});

// Get analytics (admin only)
app.get('/api/stats/analytics', authenticateToken, async (req, res) => {
  try {
    const stats = await readStatsFile();
    const commentsData = await readCommentsFile();
    
    // Get time range from query parameter (default: 30 days)
    const timeRange = req.query.days;
    let days;
    
    if (timeRange === 'all') {
      days = null; // null means all time
      console.log(`📊 Analytics requested for ALL TIME`);
    } else {
      days = parseInt(timeRange) || 30;
      console.log(`📊 Analytics requested for last ${days} days`);
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
      .sort(([,a], [,b]) => b - a)[0];
    
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
      .sort(([,a], [,b]) => b - a)
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
          postViews: filteredPostViews  // Sadece aktif yazılar
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
      lastUpdated: stats.lastUpdated
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Manual stats cleanup (admin only)
app.post('/api/stats/cleanup', authenticateToken, async (req, res) => {
  try {
    console.log('🧹 Manual stats cleanup requested by admin');
    
    // Clean up stats data
    const cleanedStats = await cleanupStatsData();
    
    if (cleanedStats) {
      res.json({
        success: true,
        message: 'Stats data cleaned successfully',
        stats: cleanedStats
      });
    } else {
      res.status(500).json({ error: 'Failed to clean stats data' });
    }
  } catch (error) {
    console.error('Error during manual stats cleanup:', error);
    res.status(500).json({ error: 'Failed to clean stats data' });
  }
});

// Manual stats validation (admin only)
app.post('/api/stats/validate', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Manual stats validation requested by admin');
    
    // Validate stats data
    const isValid = await validateStatsData();
    
    if (isValid) {
      res.json({
        success: true,
        message: 'Stats data validation completed successfully'
      });
    } else {
      res.status(400).json({ 
        error: 'Stats data validation failed',
        message: 'Found orphaned stats data that needs cleanup'
      });
    }
  } catch (error) {
    console.error('Error during manual stats validation:', error);
    res.status(500).json({ error: 'Failed to validate stats data' });
  }
});

// Cache statistics (admin only)
app.get('/api/cache/stats', authenticateToken, async (req, res) => {
  try {
    const cacheStats = fileCache.getStats();
    
    res.json({
      success: true,
      cache: cacheStats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

// Clear cache (admin only)
app.post('/api/cache/clear', authenticateToken, async (req, res) => {
  try {
    console.log('🧹 Manual cache clear requested by admin');
    
    fileCache.clear();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// ====== Comments API Routes ======
// Get comments for a post
app.get('/api/comments/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const commentsData = await readCommentsFile();
    const postComments = commentsData.comments[slug] || [];
    
    // Return all comments (both approved and pending)
    const allComments = postComments.filter(comment => comment.approved !== false); // Show approved and pending, hide rejected
    
    // Sort comments by date (newest first)
    const sortedComments = allComments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      comments: sortedComments
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Add a new comment
app.post('/api/comments/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, email, content } = req.body;
    
    // Basic validation
    if (!name || !email || !content) {
      return res.status(400).json({ error: 'Name, email and content are required' });
    }
    
    if (content.length < 3) {
      return res.status(400).json({ error: 'Comment must be at least 3 characters long' });
    }
    
    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment must be less than 1000 characters' });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const commentsData = await readCommentsFile();
    
    // Initialize post comments array if it doesn't exist
    if (!commentsData.comments[slug]) {
      commentsData.comments[slug] = [];
    }
    
    // Create new comment
    const newComment = {
      id: generateCommentId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      content: content.trim(),
      date: new Date().toISOString(),
      approved: false, // Comments need admin approval by default
      ip: req.ip || req.connection.remoteAddress
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
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get all comments (admin only)
app.get('/api/admin/comments', authenticateToken, async (req, res) => {
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
    console.error('Error getting all comments:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Approve/Reject comment (admin only)
app.put('/api/admin/comments/:commentId', authenticateToken, async (req, res) => {
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
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    await writeCommentsFile(commentsData);
    
    res.json({
      success: true,
      message: `Comment ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment (admin only)
app.delete('/api/admin/comments/:commentId', authenticateToken, async (req, res) => {
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
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    await writeCommentsFile(commentsData);
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ====== Site Configuration Endpoints ======

// Get site configuration
app.get('/api/site-config', authenticateToken, async (req, res) => {
  try {
    const siteConfigPath = path.join(__dirname, 'content', 'site.json');
    
    // Check if file exists and has content
    if (!await fs.pathExists(siteConfigPath)) {
      console.log('Site config file not found, creating default configuration');
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
          url: "https://cihanenesdurgun.com",
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
      console.log('Site config file is empty, using default configuration');
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
          url: "https://cihanenesdurgun.com",
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
    console.error('Error reading site config:', error);
    res.status(500).json({ error: 'Failed to read site configuration' });
  }
});

// Update site configuration
app.put('/api/site-config', authenticateToken, async (req, res) => {
  try {
    const siteConfigPath = path.join(__dirname, 'content', 'site.json');
    const updatedConfig = req.body;
    
    // Validate required fields
    if (!updatedConfig.hero || !updatedConfig.hero.name || !updatedConfig.hero.headline || !updatedConfig.hero.bio) {
      return res.status(400).json({ error: 'Missing required hero fields' });
    }
    
    if (!updatedConfig.site || !updatedConfig.site.title || !updatedConfig.site.description) {
      return res.status(400).json({ error: 'Missing required site fields' });
    }
    
    // Write updated configuration
    await fs.writeFile(siteConfigPath, JSON.stringify(updatedConfig, null, 2));
    
    res.json({
      success: true,
      message: 'Site configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating site config:', error);
    res.status(500).json({ error: 'Failed to update site configuration' });
  }
});

// ====== Admin Icon Management ======

// Set new system icon
app.post('/api/admin/set-icon', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    
    // Check if file exists in system folder
    const iconPath = path.join(__dirname, 'images', 'system', filename);
    if (!await fs.pathExists(iconPath)) {
      return res.status(404).json({ error: 'Icon file not found' });
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
    console.error('Error setting icon:', error);
    res.status(500).json({ error: 'Failed to set system icon' });
  }
});

// ====== Account Management Endpoints ======

// Update account settings
app.put('/api/account/update', authenticateToken, async (req, res) => {
  try {
    const { newUsername, currentPassword, newPassword } = req.body;
    const users = await readUsersFile();
    
    // Get current user
    const currentUser = users[req.user.username];
    if (!currentUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
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
      return res.status(401).json({ error: 'Mevcut şifre yanlış' });
    }
    
    // Validate new username
    if (!newUsername || newUsername.length < 3) {
      return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalıdır' });
    }
    
    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır' });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS));
    
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
      return res.status(500).json({ error: 'Kullanıcı bilgileri kaydedilemedi' });
    }
    
    console.log(`Account update successful: ${req.user.username} -> ${newUsername}`);
    
    res.json({
      success: true,
      message: 'Hesap ayarları başarıyla güncellendi',
      username: newUsername
    });
    
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Hesap güncellenirken hata oluştu' });
  }
});

// Get user info for admin panel
app.get('/api/user/info', authenticateToken, async (req, res) => {
  try {
    const users = await readUsersFile();
    const user = users[req.user.username];
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    res.json({
      username: user.username,
      lastUpdated: user.lastUpdated
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
  }
});

// ====== Security & Sessions API Endpoints ======

// Get all security data (active sessions, login history, failed logins)
app.get('/api/security/data', authenticateToken, async (req, res) => {
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
    console.error('Error getting security data:', error);
    res.status(500).json({ error: 'Güvenlik verileri alınamadı' });
  }
});

// Terminate specific session
app.delete('/api/security/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessions = await readSessionsFile();
    
    const sessionIndex = sessions.activeSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }
    
    const removedSession = sessions.activeSessions.splice(sessionIndex, 1)[0];
    await writeSessionsFile(sessions);
    
    res.json({
      success: true,
      message: 'Oturum başarıyla sonlandırıldı',
      session: removedSession
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ error: 'Oturum sonlandırılırken hata oluştu' });
  }
});

// Terminate all sessions except current
app.delete('/api/security/sessions', authenticateToken, async (req, res) => {
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
    console.error('Error terminating all sessions:', error);
    res.status(500).json({ error: 'Oturumlar sonlandırılırken hata oluştu' });
  }
});

// Block IP address
app.post('/api/security/block-ip', authenticateToken, async (req, res) => {
  try {
    const { ip, reason } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: 'IP adresi gerekli' });
    }
    
    // For now, we'll just log the blocked IP
    // In a real application, you'd want to implement actual IP blocking
    console.log(`IP ${ip} blocked by admin. Reason: ${reason || 'Suspicious activity'}`);
    
    res.json({
      success: true,
      message: `IP adresi ${ip} engellendi`,
      ip,
      reason: reason || 'Suspicious activity'
    });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({ error: 'IP engellenirken hata oluştu' });
  }
});

// Clear failed login logs
app.delete('/api/security/failed-logins', authenticateToken, async (req, res) => {
  try {
    const sessions = await readSessionsFile();
    sessions.failedLogins = [];
    await writeSessionsFile(sessions);
    
    res.json({
      success: true,
      message: 'Hatalı giriş logları temizlendi'
    });
  } catch (error) {
    console.error('Error clearing failed logins:', error);
    res.status(500).json({ error: 'Loglar temizlenirken hata oluştu' });
  }
});

// ====== Theme Management Endpoints ======

// Get theme settings
app.get('/api/theme', async (req, res) => {
  try {
    const theme = await readThemeFile();
    res.json({
      success: true,
      theme: theme
    });
  } catch (error) {
    console.error('Error getting theme:', error);
    res.status(500).json({ error: 'Tema ayarları alınırken hata oluştu' });
  }
});

// Update theme settings (admin only)
app.put('/api/theme', authenticateToken, async (req, res) => {
  try {
    const themeData = req.body;
    
    // Validate theme data
    if (!themeData.light || !themeData.dark) {
      return res.status(400).json({ error: 'Geçersiz tema verisi' });
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
      res.status(500).json({ error: 'Tema ayarları kaydedilirken hata oluştu' });
    }
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ error: 'Tema ayarları güncellenirken hata oluştu' });
  }
});

// Reset theme to defaults (admin only)
app.delete('/api/theme', authenticateToken, async (req, res) => {
  try {
    const defaultTheme = {
      light: {
        bg: '#f8f8f6',
        panel: '#fafaf8',
        ink: '#0b0b0b',
        muted: '#6b7280',
        line: '#e5e7eb',
        accent: '#84CC16'
      },
      dark: {
        bg: '#0b0d0f',
        panel: '#14171a',
        ink: '#e8edf2',
        muted: '#9aa4b2',
        line: '#2a2f35',
        accent: '#84CC16'
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
      res.status(500).json({ error: 'Tema sıfırlanırken hata oluştu' });
    }
  } catch (error) {
    console.error('Error resetting theme:', error);
    res.status(500).json({ error: 'Tema sıfırlanırken hata oluştu' });
  }
});

// RSS endpoint
app.get('/rss.xml', async (req, res) => {
  try {
    await generateRSS();
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    const rssContent = await fs.readFile('rss.xml', 'utf8');
    res.send(rssContent);
  } catch (error) {
    console.error('Error serving RSS feed:', error);
    res.status(500).send('Error generating RSS feed');
  }
});

// Serve static files after API routes
app.use(express.static('.'));

// Start server
app.listen(PORT, async () => {
  // Validate and clean up stats data on startup
  console.log('🔍 Validating stats data on startup...');
  await validateStatsData();
  
  // Clean up session data on startup
  console.log('🧹 Cleaning up session data on startup...');
  await cleanupSessionData();
  
  // Generate initial RSS feed
  await generateRSS();
  
  // Set up automatic session cleanup scheduler
  setInterval(async () => {
    console.log('🕐 Running scheduled session cleanup...');
    await cleanupSessionData();
  }, SESSION_LIMITS.CLEANUP_INTERVAL);
  
  console.log(`🚀 Personal Site v2.0.4 - Admin API Server running on port ${PORT}`);
  console.log(`🔐 Security & Session Management System Active`);
  console.log(`📊 Stats Data Cleanup & Validation System Active`);
  console.log(`🧹 Session Data Cleanup System Active (every ${SESSION_LIMITS.CLEANUP_INTERVAL / (60 * 1000)} minutes)`);
  console.log(`📝 API Documentation:`);
  console.log(`   POST /api/login - Login`);
  console.log(`   GET  /api/posts - Get all posts`);
  console.log(`   POST /api/posts - Create new post`);
  console.log(`   PUT  /api/posts/:slug - Update post`);
  console.log(`   DELETE /api/posts/:slug - Delete post`);
  console.log(`   POST /api/upload - Upload image`);
  console.log(`   GET  /api/stats - Get dashboard stats`);
  console.log(`   GET  /api/comments/:slug - Get post comments`);
  console.log(`   POST /api/comments/:slug - Add comment`);
  console.log(`   GET  /api/admin/comments - Get all comments (admin)`);
  console.log(`   PUT  /api/admin/comments/:id - Approve/reject comment (admin)`);
  console.log(`   DELETE /api/admin/comments/:id - Delete comment (admin)`);
  console.log(`   POST /api/admin/set-icon - Set new system icon (admin)`);
  console.log(`   GET  /api/site-config - Get site configuration (admin)`);
  console.log(`   PUT  /api/site-config - Update site configuration (admin)`);
  console.log(`   PUT  /api/account/update - Update account settings (admin)`);
  console.log(`   GET  /api/user/info - Get user info (admin)`);
  console.log(`   GET  /api/theme - Get theme settings`);
  console.log(`   PUT  /api/theme - Update theme settings (admin)`);
  console.log(`   DELETE /api/theme - Reset theme to defaults (admin)`);
  console.log(`   POST /api/admin/logs - Save console logs (admin)`);
  console.log(`   GET  /api/admin/logs - Get console logs (admin)`);
});

// ====== Console Log Management ======
// Save client console logs to server
app.post('/api/admin/logs', authenticateToken, async (req, res) => {
  try {
    const { logs, timestamp, userAgent, url, sessionId } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'Invalid logs data' });
    }

    // Validate log entries
    for (const log of logs) {
      if (!log.id || !log.timestamp || !log.level || !log.message) {
        return res.status(400).json({ error: 'Invalid log entry format' });
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
        console.error('Error reading existing log file:', error);
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
    console.error('Error saving console logs:', error);
    res.status(500).json({ error: 'Failed to save console logs' });
  }
});

// Get console logs with filtering and pagination (admin only)
app.get('/api/admin/logs', authenticateToken, async (req, res) => {
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

    // Get all log files (new format: console-YYYY-MM-DD.json)
    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('console-') && file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    if (logFiles.length === 0) {
      return res.json({
        success: true,
        logs: [],
        pagination: { currentPage: 1, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'No log files found'
      });
    }

    // Filter files by date if specified
    let targetFiles = logFiles;
    if (date) {
      targetFiles = logFiles.filter(file => file.includes(date));
    } else if (startDate || endDate) {
      targetFiles = logFiles.filter(file => {
        const fileDate = file.match(/console-(\d{4}-\d{2}-\d{2})\.json/);
        if (!fileDate) return false;
        
        const fileDateStr = fileDate[1];
        if (startDate && fileDateStr < startDate) return false;
        if (endDate && fileDateStr > endDate) return false;
        return true;
      });
    }

    // Read and process log files
    const allLogs = [];
    for (const file of targetFiles) {
      try {
        const logData = JSON.parse(fs.readFileSync(path.join(logsDir, file), 'utf8'));
        
        if (logData.metadata && logData.entries) {
          // New format
          allLogs.push({
            timestamp: logData.metadata.createdAt,
            user: logData.metadata.user,
            logCount: logData.metadata.totalEntries,
            levels: logData.metadata.levels,
            logs: logData.entries
          });
        } else if (Array.isArray(logData)) {
          // Legacy format - convert to new format
          logData.forEach(entry => {
            allLogs.push({
              timestamp: entry.timestamp,
              user: entry.user || 'unknown',
              logCount: entry.logCount || (entry.logs ? entry.logs.length : 0),
              levels: calculateLevels(entry.logs || []),
              logs: entry.logs || []
            });
          });
        }
      } catch (fileError) {
        console.error(`Error reading log file ${file}:`, fileError);
      }
    }

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
    console.error('Error reading console logs:', error);
    res.status(500).json({ error: 'Failed to read console logs' });
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
app.delete('/api/admin/logs/cleanup', authenticateToken, async (req, res) => {
  try {
    const { retentionDays = 30 } = req.body;
    
    if (typeof retentionDays !== 'number' || retentionDays < 1) {
      return res.status(400).json({ error: 'Invalid retention days value' });
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
    console.error('Error during log cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup logs' });
  }
});

