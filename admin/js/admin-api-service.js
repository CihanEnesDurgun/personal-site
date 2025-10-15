/* ====== Admin API Service Module ====== */

// ====== Configuration Loader ======
let API_BASE_URL = 'http://localhost:3000/api'; // Default fallback

// Load configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      API_BASE_URL = config.apiUrl;
      console.log(`🔧 API Service loaded in ${config.mode} mode`);
      console.log(`🌐 API URL: ${API_BASE_URL}`);
    } else {
      console.warn('⚠️ Failed to load config, using fallback URL');
    }
  } catch (error) {
    console.warn('⚠️ Config loading failed, using fallback URL:', error);
  }
}

// Initialize config on module load
loadConfig();

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
        throw new Error(`Expected JSON but got: ${text.substring(0, 100)}...`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: API request failed`);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
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
      throw new Error('Upload failed');
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
