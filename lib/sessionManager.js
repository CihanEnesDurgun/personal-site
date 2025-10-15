/**
 * Professional Session Management System
 * Handles secure session creation, validation, and cleanup
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class SessionManager {
  constructor() {
    this.sessionsFile = path.join(__dirname, '../data/sessions.json');
    
    // Safe environment variable parsing with defaults
    const sessionTimeoutMinutes = parseInt(process.env.SESSION_TIMEOUT) || 60;
    const idleTimeoutMinutes = parseInt(process.env.SESSION_IDLE_TIMEOUT) || 15;
    const maxSessions = parseInt(process.env.MAX_SESSIONS_PER_USER) || 3;
    const cleanupIntervalMinutes = parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 5;
    
    this.sessionTimeout = sessionTimeoutMinutes * 60 * 1000; // Convert to milliseconds
    this.idleTimeout = idleTimeoutMinutes * 60 * 1000;
    this.maxSessionsPerUser = maxSessions;
    this.cleanupInterval = cleanupIntervalMinutes * 60 * 1000;
    
    console.log(`🔐 Session Manager initialized:`);
    console.log(`   - Session Timeout: ${sessionTimeoutMinutes} minutes`);
    console.log(`   - Idle Timeout: ${idleTimeoutMinutes} minutes`);
    console.log(`   - Max Sessions per User: ${maxSessions}`);
    console.log(`   - Cleanup Interval: ${cleanupIntervalMinutes} minutes`);
    
    // Start cleanup process
    this.startCleanupProcess();
  }

  /**
   * Create a new session
   * @param {string} username - Username
   * @param {string} ip - IP address
   * @param {string} userAgent - User agent string
   * @returns {Object} Session object
   */
  async createSession(username, ip, userAgent) {
    try {
      const sessionId = this.generateSessionId();
      const now = new Date();
      
      // Check for existing sessions and limit concurrent sessions
      await this.cleanupUserSessions(username);
      
      const session = {
        id: sessionId,
        username: username,
        token: this.generateJWT(username, sessionId),
        ip: ip,
        userAgent: userAgent,
        loginTime: now.toISOString(),
        lastActivity: now.toISOString(),
        expiresAt: new Date(now.getTime() + this.sessionTimeout).toISOString(),
        isActive: true,
        sessionData: {
          loginCount: 1,
          lastLogin: now.toISOString(),
          deviceInfo: this.parseUserAgent(userAgent)
        }
      };

      // Save session to file
      await this.saveSession(session);
      
      // Log successful login
      await this.logLoginAttempt(username, ip, userAgent, true);
      
      console.log(`✅ New session created for user: ${username} (${sessionId})`);
      return session;
      
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate session
   * @param {string} token - JWT token
   * @param {string} ip - IP address
   * @param {string} userAgent - User agent string
   * @returns {Object|null} Session object or null if invalid
   */
  async validateSession(token, ip, userAgent) {
    try {
      if (!token) return null;

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const sessionId = decoded.sessionId;
      
      // Load session from file
      const session = await this.getSession(sessionId);
      if (!session || !session.isActive) {
        return null;
      }

      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.invalidateSession(sessionId);
        return null;
      }

      // Check idle timeout
      const lastActivity = new Date(session.lastActivity);
      const now = new Date();
      if (now - lastActivity > this.idleTimeout) {
        await this.invalidateSession(sessionId);
        return null;
      }

      // Security checks - Normalize IP addresses for comparison
      const normalizedSessionIP = this.normalizeIP(session.ip);
      const normalizedRequestIP = this.normalizeIP(ip);
      
      if (normalizedSessionIP !== normalizedRequestIP) {
        console.warn(`🚨 IP mismatch for session ${sessionId}: ${session.ip} vs ${ip}`);
        await this.invalidateSession(sessionId);
        return null;
      }

      // More flexible User-Agent validation - only check browser type, not exact version
      const sessionBrowser = this.extractBrowserInfo(session.userAgent);
      const currentBrowser = this.extractBrowserInfo(userAgent);
      
      if (sessionBrowser !== currentBrowser) {
        console.warn(`🚨 Browser type mismatch for session ${sessionId}: ${sessionBrowser} vs ${currentBrowser}`);
        // Only invalidate if browser type is completely different (e.g., Chrome vs Firefox)
        if (sessionBrowser !== 'Unknown' && currentBrowser !== 'Unknown' && 
            !sessionBrowser.includes('Chrome') && !currentBrowser.includes('Chrome') &&
            !sessionBrowser.includes('Firefox') && !currentBrowser.includes('Firefox') &&
            !sessionBrowser.includes('Safari') && !currentBrowser.includes('Safari')) {
          await this.invalidateSession(sessionId);
          return null;
        }
      }

      // Update last activity
      session.lastActivity = now.toISOString();
      await this.updateSession(session);

      return session;
      
    } catch (error) {
      console.error('❌ Error validating session:', error);
      return null;
    }
  }

  /**
   * Invalidate session
   * @param {string} sessionId - Session ID
   */
  async invalidateSession(sessionId) {
    try {
      const sessions = await this.loadSessions();
      const sessionIndex = sessions.activeSessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        const session = sessions.activeSessions[sessionIndex];
        session.isActive = false;
        session.logoutTime = new Date().toISOString();
        
        // Move to inactive sessions
        if (!sessions.inactiveSessions) {
          sessions.inactiveSessions = [];
        }
        sessions.inactiveSessions.push(session);
        sessions.activeSessions.splice(sessionIndex, 1);
        
        await this.saveSessions(sessions);
        console.log(`✅ Session invalidated: ${sessionId}`);
      }
    } catch (error) {
      console.error('❌ Error invalidating session:', error);
    }
  }

  /**
   * Get all active sessions for a user
   * @param {string} username - Username
   * @returns {Array} Array of active sessions
   */
  async getUserSessions(username) {
    try {
      const sessions = await this.loadSessions();
      return sessions.activeSessions.filter(s => s.username === username && s.isActive);
    } catch (error) {
      console.error('❌ Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const sessions = await this.loadSessions();
      const now = new Date();
      let cleanedCount = 0;

      // Clean active sessions
      sessions.activeSessions = sessions.activeSessions.filter(session => {
        const isExpired = new Date(session.expiresAt) < now;
        const isIdle = (now - new Date(session.lastActivity)) > this.idleTimeout;
        
        if (isExpired || isIdle) {
          session.isActive = false;
          session.logoutTime = now.toISOString();
          
          if (!sessions.inactiveSessions) {
            sessions.inactiveSessions = [];
          }
          sessions.inactiveSessions.push(session);
          cleanedCount++;
          return false;
        }
        return true;
      });

      // Clean old inactive sessions (older than 30 days)
      if (sessions.inactiveSessions) {
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        sessions.inactiveSessions = sessions.inactiveSessions.filter(session => {
          const logoutTime = new Date(session.logoutTime || session.lastActivity);
          return logoutTime > thirtyDaysAgo;
        });
      }

      if (cleanedCount > 0) {
        await this.saveSessions(sessions);
        console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
      }

    } catch (error) {
      console.error('❌ Error cleaning up sessions:', error);
    }
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  async getSessionStats() {
    try {
      const sessions = await this.loadSessions();
      const now = new Date();
      
      const stats = {
        totalActive: sessions.activeSessions.length,
        totalInactive: sessions.inactiveSessions ? sessions.inactiveSessions.length : 0,
        usersOnline: [...new Set(sessions.activeSessions.map(s => s.username))].length,
        sessionsByUser: {},
        recentLogins: sessions.loginHistory ? sessions.loginHistory.slice(-10) : []
      };

      // Count sessions by user
      sessions.activeSessions.forEach(session => {
        if (!stats.sessionsByUser[session.username]) {
          stats.sessionsByUser[session.username] = 0;
        }
        stats.sessionsByUser[session.username]++;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting session stats:', error);
      return null;
    }
  }

  // Private methods

  /**
   * Generate unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return 'sess_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Extract browser type from User-Agent string
   * @param {string} userAgent - User agent string
   * @returns {string} Browser type
   */
  extractBrowserInfo(userAgent) {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  }

  /**
   * Generate JWT token
   * @param {string} username - Username
   * @param {string} sessionId - Session ID
   * @returns {string} JWT token
   */
  generateJWT(username, sessionId) {
    return jwt.sign(
      { 
        username, 
        sessionId,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Normalize IP address for comparison
   * @param {string} ip - IP address
   * @returns {string} Normalized IP address
   */
  normalizeIP(ip) {
    if (!ip) return '';
    
    // Handle IPv6-mapped IPv4 addresses
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7); // Remove ::ffff: prefix
    }
    
    // Handle IPv6 localhost
    if (ip === '::1') {
      return '127.0.0.1';
    }
    
    return ip;
  }

  /**
   * Parse user agent string
   * @param {string} userAgent - User agent string
   * @returns {Object} Parsed device info
   */
  parseUserAgent(userAgent) {
    const deviceInfo = {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Desktop'
    };

    // Simple user agent parsing
    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';

    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';

    if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
    else if (userAgent.includes('Tablet')) deviceInfo.device = 'Tablet';

    return deviceInfo;
  }

  /**
   * Load sessions from file
   * @returns {Object} Sessions data
   */
  async loadSessions() {
    try {
      if (await fs.pathExists(this.sessionsFile)) {
        return await fs.readJson(this.sessionsFile);
      }
      return {
        activeSessions: [],
        inactiveSessions: [],
        loginHistory: [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
      return {
        activeSessions: [],
        inactiveSessions: [],
        loginHistory: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Save sessions to file
   * @param {Object} sessions - Sessions data
   */
  async saveSessions(sessions) {
    try {
      sessions.lastUpdated = new Date().toISOString();
      await fs.writeJson(this.sessionsFile, sessions, { spaces: 2 });
    } catch (error) {
      console.error('❌ Error saving sessions:', error);
    }
  }

  /**
   * Save individual session
   * @param {Object} session - Session object
   */
  async saveSession(session) {
    try {
      const sessions = await this.loadSessions();
      sessions.activeSessions.push(session);
      await this.saveSessions(sessions);
    } catch (error) {
      console.error('❌ Error saving session:', error);
    }
  }

  /**
   * Update existing session
   * @param {Object} session - Session object
   */
  async updateSession(session) {
    try {
      const sessions = await this.loadSessions();
      const index = sessions.activeSessions.findIndex(s => s.id === session.id);
      if (index !== -1) {
        sessions.activeSessions[index] = session;
        await this.saveSessions(sessions);
      }
    } catch (error) {
      console.error('❌ Error updating session:', error);
    }
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session object or null
   */
  async getSession(sessionId) {
    try {
      const sessions = await this.loadSessions();
      return sessions.activeSessions.find(s => s.id === sessionId) || null;
    } catch (error) {
      console.error('❌ Error getting session:', error);
      return null;
    }
  }

  /**
   * Cleanup user sessions (limit concurrent sessions)
   * @param {string} username - Username
   */
  async cleanupUserSessions(username) {
    try {
      const sessions = await this.loadSessions();
      const userSessions = sessions.activeSessions.filter(s => s.username === username);
      
      if (userSessions.length >= this.maxSessionsPerUser) {
        // Remove oldest sessions
        const sessionsToRemove = userSessions
          .sort((a, b) => new Date(a.loginTime) - new Date(b.loginTime))
          .slice(0, userSessions.length - this.maxSessionsPerUser + 1);
        
        for (const session of sessionsToRemove) {
          await this.invalidateSession(session.id);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up user sessions:', error);
    }
  }

  /**
   * Log login attempt
   * @param {string} username - Username
   * @param {string} ip - IP address
   * @param {string} userAgent - User agent string
   * @param {boolean} success - Login success
   */
  async logLoginAttempt(username, ip, userAgent, success) {
    try {
      const sessions = await this.loadSessions();
      
      const loginAttempt = {
        id: Date.now().toString(),
        username,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        success,
        reason: success ? 'Success' : 'Invalid credentials'
      };

      if (!sessions.loginHistory) {
        sessions.loginHistory = [];
      }
      
      sessions.loginHistory.push(loginAttempt);
      
      // If failed login, also add to failedLogins array
      if (!success) {
        if (!sessions.failedLogins) {
          sessions.failedLogins = [];
        }
        sessions.failedLogins.push(loginAttempt);
        
        // Keep only last 200 failed login attempts
        if (sessions.failedLogins.length > 200) {
          sessions.failedLogins = sessions.failedLogins.slice(-200);
        }
      }
      
      // Keep only last 1000 login attempts
      if (sessions.loginHistory.length > 1000) {
        sessions.loginHistory = sessions.loginHistory.slice(-1000);
      }
      
      await this.saveSessions(sessions);
    } catch (error) {
      console.error('❌ Error logging login attempt:', error);
    }
  }

  /**
   * Start cleanup process
   */
  startCleanupProcess() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
    
    console.log('🔄 Session cleanup process started');
  }
}

module.exports = SessionManager;
