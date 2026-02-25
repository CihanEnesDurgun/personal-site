/* ====== Admin API Service Module ====== */

// ====== Development Mode Configuration ======
const DEVELOPMENT_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = `${window.location.origin}/api`;

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

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401 || response.status === 403) {
        this.clearToken();
        window.location.href = 'login.html';
        return;
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`JSON bekleniyordu ancak alındı: ${text.substring(0, 100)}...`);
      }

      const data = await response.json();

      if (!response.ok) {
        // Create error with code information
        const apiError = new Error(data.error || `HTTP ${response.status}: API isteği başarısız`);
        // Attach error code and details to error object
        if (data.code) apiError.code = data.code;
        if (data.statusCode) apiError.statusCode = data.statusCode;
        if (data.details) apiError.details = data.details;
        if (data.requestId) apiError.requestId = data.requestId;
        // Attach full response data for error code mapping
        apiError.responseData = data;
        throw apiError;
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      // If error doesn't have code but has responseData, try to extract it
      if (error.responseData && error.responseData.code && !error.code) {
        error.code = error.responseData.code;
      }
      throw error;
    }
  }

  // Auth endpoints
  async login(username, password) {
    const response = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (response.success) {
      this.setToken(response.token);
    }

    return response;
  }

  // Posts endpoints
  async getPosts() {
    return await this.request('/posts');
  }

  async getPost(slug) {
    return await this.request(`/posts/${slug}`);
  }

  async createPost(postData) {
    return await this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  async updatePost(slug, postData) {
    return await this.request(`/posts/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(postData)
    });
  }

  async deletePost(slug) {
    return await this.request(`/posts/${slug}`, {
      method: 'DELETE'
    });
  }

  // Site configuration endpoints
  async getSiteConfig() {
    return await this.request('/site-config');
  }

  async updateSiteConfig(configData) {
    return await this.request('/site-config', {
      method: 'PUT',
      body: JSON.stringify(configData)
    });
  }

  // Stats endpoint
  async getStats() {
    return await this.request('/stats');
  }

  // Analytics endpoint
  async getAnalytics() {
    return await this.request('/stats/analytics');
  }

  // Upload endpoint
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorData;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        }
      } catch (e) {
        // If parsing fails, use default error
      }

      // Create error with code information
      const apiError = new Error(errorData?.error || 'Yükleme başarısız');
      if (errorData?.code) apiError.code = errorData.code;
      if (errorData?.statusCode) apiError.statusCode = errorData.statusCode;
      if (errorData?.details) apiError.details = errorData.details;
      if (errorData?.requestId) apiError.requestId = errorData.requestId;
      apiError.responseData = errorData;
      throw apiError;
    }

    return await response.json();
  }

  // Publish/Schedule post endpoint
  async publishPost(slug, data) {
    return await this.request(`/posts/${slug}/publish`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Restore post from trash (uses PUT method as per server.js line 1569)
  async restorePost(slug) {
    return await this.request(`/posts/${slug}/restore`, {
      method: 'PUT'
    });
  }

  // Permanent delete post from trash
  async permanentDeletePost(slug) {
    return await this.request(`/posts/${slug}/permanent`, {
      method: 'DELETE'
    });
  }

  // Toggle featured status
  async toggleFeatured(slug, featured) {
    return await this.request(`/posts/${slug}/featured`, {
      method: 'PATCH',
      body: JSON.stringify({ featured })
    });
  }

  // ====== Security & Sessions API Endpoints ======

  // Get security data (active sessions, login history, failed logins, IP analysis)
  async getSecurityData() {
    return await this.request('/security/data');
  }

  // Terminate specific session
  async terminateSession(sessionId) {
    return await this.request(`/security/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }

  // Terminate all sessions except current
  async terminateAllSessions() {
    return await this.request('/security/sessions', {
      method: 'DELETE'
    });
  }

  // Block IP address
  async blockIP(ip, reason) {
    return await this.request('/security/block-ip', {
      method: 'POST',
      body: JSON.stringify({ ip, reason })
    });
  }

  // Clear failed login logs
  async clearFailedLogins() {
    return await this.request('/security/failed-logins', {
      method: 'DELETE'
    });
  }
}

// ====== Helpers ======
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Date formatting
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Slug generation
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

// Make classes and functions globally available
if (typeof window !== 'undefined') {
  window.ApiService = ApiService;
  window.$ = $;
  window.$$ = $$;
  window.formatDate = formatDate;
  window.generateSlug = generateSlug;
  window.DEVELOPMENT_MODE = DEVELOPMENT_MODE;
  window.API_BASE_URL = API_BASE_URL;
}

console.log('📦 Admin API Service Module loaded');
