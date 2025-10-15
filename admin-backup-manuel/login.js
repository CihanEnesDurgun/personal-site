/* ====== Login Page JavaScript ====== */

// ====== Helpers ======
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ====== Theme Loading ====== */
async function loadCustomTheme() {
  try {
    console.log('Loading custom theme from server...');
    // First try to load from server
    const response = await fetch('/api/theme');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.theme) {
        const themeData = data.theme;
        console.log('Theme loaded successfully:', themeData);
        const root = document.documentElement;
        
        // Apply light theme variables
        root.style.setProperty('--bg', themeData.light.bg);
        root.style.setProperty('--panel', themeData.light.panel);
        root.style.setProperty('--ink', themeData.light.ink);
        root.style.setProperty('--muted', themeData.light.muted);
        root.style.setProperty('--line', themeData.light.line);
        root.style.setProperty('--accent', themeData.light.accent);
        
        // Apply dark theme variables
        root.style.setProperty('--dark-bg', themeData.dark.bg);
        root.style.setProperty('--dark-panel', themeData.dark.panel);
        root.style.setProperty('--dark-ink', themeData.dark.ink);
        root.style.setProperty('--dark-muted', themeData.dark.muted);
        root.style.setProperty('--dark-line', themeData.dark.line);
        root.style.setProperty('--dark-accent', themeData.dark.accent);
        
        // Apply other settings
        root.style.setProperty('--radius', `${themeData.borderRadius}px`);
        root.style.setProperty('--shadow', `0 10px 24px rgba(0,0,0,${themeData.shadowIntensity / 100 * 0.06})`);
        root.style.setProperty('--shadow-lg', `0 20px 40px rgba(0,0,0,${themeData.shadowIntensity / 100 * 0.1})`);
        
        console.log('Custom theme applied successfully');
        return;
      }
    }
  } catch (error) {
    console.error('Error loading custom theme:', error);
  }
  
  // Fallback to localStorage
  const savedTheme = localStorage.getItem('customTheme');
  if (savedTheme) {
    try {
      const themeData = JSON.parse(savedTheme);
      const root = document.documentElement;
      
      // Apply theme variables
      root.style.setProperty('--bg', themeData.light.bg);
      root.style.setProperty('--panel', themeData.light.panel);
      root.style.setProperty('--ink', themeData.light.ink);
      root.style.setProperty('--muted', themeData.light.muted);
      root.style.setProperty('--line', themeData.light.line);
      root.style.setProperty('--accent', themeData.light.accent);
      
      root.style.setProperty('--dark-bg', themeData.dark.bg);
      root.style.setProperty('--dark-panel', themeData.dark.panel);
      root.style.setProperty('--dark-ink', themeData.dark.ink);
      root.style.setProperty('--dark-muted', themeData.dark.muted);
      root.style.setProperty('--dark-line', themeData.dark.line);
      root.style.setProperty('--dark-accent', themeData.dark.accent);
      
      root.style.setProperty('--radius', `${themeData.borderRadius}px`);
      root.style.setProperty('--shadow', `0 10px 24px rgba(0,0,0,${themeData.shadowIntensity / 100 * 0.06})`);
      root.style.setProperty('--shadow-lg', `0 20px 40px rgba(0,0,0,${themeData.shadowIntensity / 100 * 0.1})`);
      
      console.log('Theme loaded from localStorage');
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
      localStorage.removeItem('customTheme');
    }
  }
}

// ====== Configuration Loader ======
let API_BASE_URL = 'http://localhost:3000/api'; // Default fallback

// Load configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      API_BASE_URL = config.apiUrl;
      console.log(`🔧 Login page (backup) loaded in ${config.mode} mode`);
      console.log(`🌐 API URL: ${API_BASE_URL}`);
    } else {
      console.warn('⚠️ Failed to load config, using fallback URL');
    }
  } catch (error) {
    console.warn('⚠️ Config loading failed, using fallback URL:', error);
  }
}

// Initialize config on page load
loadConfig();

// ====== CONFIG ======
const CONFIG = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  rememberMeDuration: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// ====== API Service ======
class ApiService {
  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('admin_token');
  }

  async login(username, password) {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      this.setToken(data.token);
      return data;
    } else {
      throw new Error(data.error || 'Login failed');
    }
  }
}

// ====== Session Management ======
class SessionManager {
  constructor() {
    this.sessionKey = 'admin_session';
    this.rememberKey = 'admin_remember';
  }
  
  // Check if user is authenticated
  isAuthenticated() {
    const session = this.getSession();
    if (!session) return false;
    
    const now = Date.now();
    const expiresAt = session.expiresAt;
    
    if (now > expiresAt) {
      this.clearSession();
      return false;
    }
    
    return true;
  }
  
  // Create new session
  createSession(username, rememberMe = false) {
    const now = Date.now();
    const duration = rememberMe ? CONFIG.rememberMeDuration : CONFIG.sessionTimeout;
    const expiresAt = now + duration;
    
    const session = {
      username: username,
      createdAt: now,
      expiresAt: expiresAt,
      rememberMe: rememberMe
    };
    
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    
    if (rememberMe) {
      localStorage.setItem(this.rememberKey, 'true');
    }
  }
  
  // Get current session
  getSession() {
    const sessionStr = localStorage.getItem(this.sessionKey);
    if (!sessionStr) return null;
    
    try {
      return JSON.parse(sessionStr);
    } catch (error) {
      console.error('Error parsing session:', error);
      this.clearSession();
      return null;
    }
  }
  
  // Clear session
  clearSession() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.rememberKey);
  }
  
  // Get session info
  getSessionInfo() {
    const session = this.getSession();
    if (!session) return null;
    
    const now = Date.now();
    const timeLeft = session.expiresAt - now;
    
    return {
      username: session.username,
      timeLeft: timeLeft,
      rememberMe: session.rememberMe
    };
  }
}

// ====== Authentication ======
class AuthManager {
  constructor() {
    this.sessionManager = new SessionManager();
    this.maxLoginAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.loginAttemptsKey = 'login_attempts';
  }
  
  // Check if login is locked
  isLoginLocked() {
    const attempts = this.getLoginAttempts();
    if (attempts.count >= this.maxLoginAttempts) {
      const now = Date.now();
      const timeLeft = attempts.lockoutUntil - now;
      
      if (timeLeft > 0) {
        return {
          locked: true,
          timeLeft: timeLeft
        };
      } else {
        // Reset attempts after lockout period
        this.resetLoginAttempts();
      }
    }
    
    return { locked: false };
  }
  
  // Get login attempts
  getLoginAttempts() {
    const attemptsStr = localStorage.getItem(this.loginAttemptsKey);
    if (!attemptsStr) {
      return { count: 0, lockoutUntil: 0 };
    }
    
    try {
      return JSON.parse(attemptsStr);
    } catch (error) {
      console.error('Error parsing login attempts:', error);
      return { count: 0, lockoutUntil: 0 };
    }
  }
  
  // Increment login attempts
  incrementLoginAttempts() {
    const attempts = this.getLoginAttempts();
    attempts.count++;
    
    if (attempts.count >= this.maxLoginAttempts) {
      attempts.lockoutUntil = Date.now() + this.lockoutDuration;
    }
    
    localStorage.setItem(this.loginAttemptsKey, JSON.stringify(attempts));
  }
  
  // Reset login attempts
  resetLoginAttempts() {
    localStorage.removeItem(this.loginAttemptsKey);
  }
  
  // Authenticate user
  authenticate(username, password) {
    // Check if login is locked
    const lockStatus = this.isLoginLocked();
    if (lockStatus.locked) {
      const minutes = Math.ceil(lockStatus.timeLeft / (60 * 1000));
      throw new Error(`Çok fazla başarısız giriş denemesi. ${minutes} dakika sonra tekrar deneyin.`);
    }
    
    // This method is deprecated - we now use API authentication
    // Keeping for backward compatibility but not used
    return false;
  }
  
  // Login user
  login(username, password, rememberMe = false) {
    try {
      const isValid = this.authenticate(username, password);
      if (isValid) {
        this.sessionManager.createSession(username, rememberMe);
        return true;
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Logout user
  logout() {
    this.sessionManager.clearSession();
    window.location.href = 'login.html';
  }
  
  // Check authentication and redirect
  checkAuth() {
    if (this.sessionManager.isAuthenticated()) {
      // User is authenticated, redirect to admin panel
      window.location.href = 'index.html';
    }
  }
}

// ====== UI Management ======
class LoginUI {
  constructor() {
    this.authManager = new AuthManager();
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.checkRememberMe();
  }
  
  setupEventListeners() {
    // Form submission
    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
    
    // Password toggle
    $('.toggle-password').addEventListener('click', () => {
      this.togglePassword();
    });
    
    // Modal close
    $$('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeErrorModal();
      });
    });
    
    // Close modal when clicking outside
    $('#errorModal').addEventListener('click', (e) => {
      if (e.target.id === 'errorModal') {
        this.closeErrorModal();
      }
    });
    
    // Enter key in inputs
    $('#username').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        $('#password').focus();
      }
    });
    
    $('#password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });
  }
  
  async handleLogin() {
    const username = $('#username').value.trim();
    const password = $('#password').value;
    const rememberMe = $('#rememberMe').checked;
    
    // Basic validation
    if (!username || !password) {
      this.showError('Lütfen tüm alanları doldurun.');
      return;
    }
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      // Attempt login via API
      const apiService = new ApiService();
      await apiService.login(username, password);
      
      // Success - redirect to admin panel
      window.location.href = 'index.html';
      
    } catch (error) {
      this.showError(error.message);
      this.setLoadingState(false);
      
      // Add shake animation to form
      $('#loginForm').classList.add('shake');
      setTimeout(() => {
        $('#loginForm').classList.remove('shake');
      }, 500);
    }
  }
  
  togglePassword() {
    const passwordInput = $('#password');
    const toggleBtn = $('.toggle-password');
    const eyeIcon = toggleBtn.querySelector('.eye-icon');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.innerHTML = `
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        <path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      `;
      toggleBtn.setAttribute('aria-label', 'Şifreyi gizle');
    } else {
      passwordInput.type = 'password';
      eyeIcon.innerHTML = `
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      `;
      toggleBtn.setAttribute('aria-label', 'Şifreyi göster');
    }
  }
  
  setLoadingState(loading) {
    const btn = $('.login-btn');
    const btnText = $('.btn-text');
    const spinner = $('.loading-spinner');
    
    if (loading) {
      btn.disabled = true;
      btn.classList.add('loading');
      btnText.style.opacity = '0';
      spinner.style.display = 'block';
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      btnText.style.opacity = '1';
      spinner.style.display = 'none';
    }
  }
  
  showError(message) {
    $('#errorMessage').textContent = message;
    $('#errorModal').classList.add('show');
  }
  
  closeErrorModal() {
    $('#errorModal').classList.remove('show');
  }
  
  checkRememberMe() {
    const remembered = localStorage.getItem('admin_remember');
    if (remembered === 'true') {
      $('#rememberMe').checked = true;
    }
  }
  

}

// ====== Security Utilities ======
class SecurityUtils {
  // Simple password strength checker
  static checkPasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    return {
      score: score,
      strength: score < 3 ? 'weak' : score < 4 ? 'medium' : 'strong'
    };
  }
  
  // Sanitize input
  static sanitizeInput(input) {
    return input.replace(/[<>]/g, '');
  }
  
  // Generate random token
  static generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// ====== Initialize ======
let loginUI;
let authManager;

document.addEventListener('DOMContentLoaded', async () => {
  // Load custom theme first
  await loadCustomTheme();
  
  authManager = new AuthManager();
  loginUI = new LoginUI();
  
  // Check if user is already authenticated
  authManager.checkAuth();
});

// ====== Global Functions ======
// Function to check authentication from other pages
function checkAdminAuth() {
  const authManager = new AuthManager();
  if (!authManager.sessionManager.isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Function to logout from admin panel
function logoutAdmin() {
  const authManager = new AuthManager();
  authManager.logout();
}
