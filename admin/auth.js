/* ====== Admin Panel Authentication ====== */

// ====== Enhanced Session Management ======
class SessionManager {
  constructor() {
    this.tokenKey = 'admin_token';
    this.sessionKey = 'admin_session';
    this.heartbeatInterval = null;
    this.heartbeatFrequency = 5 * 60 * 1000; // 5 minutes
  }
  
  // Check if user is authenticated
  async isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      if (payload.exp < now) {
        await this.clearSession();
        return false;
      }
      
      // Try to validate with server if available (disabled for now)
      // try {
      //   const isValid = await this.validateSessionWithServer();
      //   if (!isValid) {
      //     console.warn('Server session validation failed, using JWT only');
      //   }
      // } catch (error) {
      //   console.warn('Server validation not available, using JWT only:', error.message);
      // }
      
      return true;
    } catch (error) {
      console.error('Error parsing token:', error);
      await this.clearSession();
      return false;
    }
  }
  
  // Validate session with server
  async validateSessionWithServer() {
    try {
      const token = this.getToken();
      if (!token) {
        return false;
      }

      const response = await fetch('/api/session', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.saveSessionInfo(data.session);
        return true;
      }
      
      console.warn('Session validation failed:', response.status, response.statusText);
      return false;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
  
  // Get current token
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }
  
  // Save session info
  saveSessionInfo(sessionInfo) {
    localStorage.setItem(this.sessionKey, JSON.stringify(sessionInfo));
  }
  
  // Get session info
  getSessionInfo() {
    const sessionData = localStorage.getItem(this.sessionKey);
    if (sessionData) {
      try {
        return JSON.parse(sessionData);
      } catch (error) {
        console.error('Error parsing session data:', error);
      }
    }
    
    // Fallback to token-based info
    const token = this.getToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const timeLeft = (payload.exp - now) * 1000;
      
      return {
        username: payload.username,
        timeLeft: timeLeft,
        expiresAt: new Date(payload.exp * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }
  
  // Clear session
  async clearSession() {
    try {
      // Notify server about logout
      const token = this.getToken();
      if (token) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.sessionKey);
      this.stopHeartbeat();
    }
  }
  
  // Start heartbeat to keep session alive
  startHeartbeat() {
    this.stopHeartbeat(); // Clear existing heartbeat
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/session', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.saveSessionInfo(data.session);
        } else {
          // Session invalid, clear it
          await this.clearSession();
          window.location.href = 'login.html';
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, this.heartbeatFrequency);
  }
  
  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// ====== Authentication Manager ======
class AuthManager {
  constructor() {
    this.sessionManager = new SessionManager();
  }
  
  logout() {
    this.sessionManager.clearSession();
    window.location.href = 'login.html';
  }
  
  async checkAuth() {
    const isAuth = await this.sessionManager.isAuthenticated();
    if (!isAuth) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
  
  getSessionInfo() {
    return this.sessionManager.getSessionInfo();
  }
}

// ====== Admin Panel Security ======
class AdminSecurity {
  constructor() {
    this.authManager = new AuthManager();
    // Don't call init() in constructor, wait for DOMContentLoaded
  }
  
  async init() {
    try {
      // Check authentication on page load
      const isAuth = await this.authManager.checkAuth();
      if (!isAuth) {
        return;
      }
      
      // Start heartbeat to keep session alive
      this.authManager.sessionManager.startHeartbeat();
      
      // Add logout functionality to header
      this.addLogoutButton();
      
      // Add session timeout warning
      this.setupSessionTimeout();
      
      // Prevent access to login page if already authenticated
      this.preventLoginPageAccess();
    } catch (error) {
      console.error('❌ AdminSecurity init error:', error);
    }
  }
  
  addLogoutButton() {
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'logout-btn';
      logoutBtn.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
        </svg>
        Çıkış
      `;
      logoutBtn.setAttribute('aria-label', 'Çıkış yap');
      logoutBtn.setAttribute('title', 'Çıkış yap');
      
      logoutBtn.addEventListener('click', () => {
        this.authManager.logout();
      });
      
      headerRight.appendChild(logoutBtn);
    }
  }
  
  setupSessionTimeout() {
    const sessionInfo = this.authManager.getSessionInfo();
    if (!sessionInfo) return;
    
    // Show warning 5 minutes before session expires
    const warningTime = 5 * 60 * 1000; // 5 minutes
    const timeUntilWarning = sessionInfo.timeLeft - warningTime;
    
    if (timeUntilWarning > 0) {
      setTimeout(() => {
        this.showSessionWarning();
      }, timeUntilWarning);
    }
    
    // Auto logout when session expires
    setTimeout(() => {
      this.authManager.logout();
    }, sessionInfo.timeLeft);
  }
  
  showSessionWarning() {
    const warning = document.createElement('div');
    warning.className = 'session-warning';
    warning.innerHTML = `
      <div class="warning-content">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <div class="warning-text">
          <h4>Oturum Süresi Doluyor</h4>
          <p>Oturumunuz 5 dakika içinde sonlanacak. Devam etmek için tekrar giriş yapın.</p>
        </div>
        <button class="warning-close" aria-label="Kapat">×</button>
      </div>
      <div class="warning-actions">
        <button class="btn btn-primary" onclick="adminSecurity.extendSession()">Oturumu Uzat</button>
        <button class="btn btn-secondary" onclick="adminSecurity.authManager.logout()">Çıkış Yap</button>
      </div>
    `;
    
    // Add styles
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(warning);
    
    // Close button functionality
    const closeBtn = warning.querySelector('.warning-close');
    closeBtn.addEventListener('click', () => {
      warning.remove();
    });
    
    // Auto remove after 30 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.remove();
      }
    }, 30000);
  }
  
  extendSession() {
    // In a real application, this would make an API call to extend the session
    // For now, we'll just refresh the page to simulate session extension
    window.location.reload();
  }
  
  preventLoginPageAccess() {
    // If we're on the login page and already authenticated, redirect to admin
    if (window.location.pathname.includes('login.html')) {
      if (this.authManager.sessionManager.isAuthenticated()) {
        window.location.href = 'index.html';
      }
    }
  }
}

// ====== CSS for Security Elements ======
const securityStyles = `
  .logout-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: color-mix(in srgb, #ef4444 16%, var(--panel));
    color: #ef4444;
    border: 1px solid #ef4444;
    border-radius: 12px;
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all .2s ease;
    font-family: inherit;
  }
  
  .logout-btn:hover {
    background: #ef4444;
    color: white;
    transform: translateY(-1px);
  }
  
  .logout-btn svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  
  .session-warning {
    font-family: 'Inter', sans-serif;
  }
  
  .warning-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .warning-content svg {
    width: 24px;
    height: 24px;
    fill: #f59e0b;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .warning-text h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #92400e;
  }
  
  .warning-text p {
    margin: 0;
    font-size: 0.9rem;
    color: #92400e;
    line-height: 1.4;
  }
  
  .warning-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: #92400e;
    padding: 0;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 4px;
    transition: background .2s ease;
    flex-shrink: 0;
  }
  
  .warning-close:hover {
    background: rgba(146, 64, 14, 0.1);
  }
  
  .warning-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .warning-actions .btn {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @media (max-width: 768px) {
    .logout-btn {
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
    }
    
    .logout-btn svg {
      width: 14px;
      height: 14px;
    }
    
    .session-warning {
      right: 10px;
      left: 10px;
      max-width: none;
    }
  }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = securityStyles;
document.head.appendChild(styleSheet);

// ====== Initialize ======
let adminSecurity;

document.addEventListener('DOMContentLoaded', async () => {
  adminSecurity = new AdminSecurity();
  await adminSecurity.init();
});

// ====== Global Functions ======
// Function to check authentication from other scripts
function checkAdminAuth() {
  const authManager = new AuthManager();
  return authManager.checkAuth();
}

// Function to logout
function logoutAdmin() {
  if (adminSecurity) {
    adminSecurity.authManager.logout();
  }
}
