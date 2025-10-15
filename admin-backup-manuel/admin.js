/* ====== Admin Panel JavaScript ====== */

// ====== Configuration Loader ======
let API_BASE_URL = 'http://localhost:3000/api'; // Default fallback

// Load configuration from server
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      API_BASE_URL = config.apiUrl;
      console.log(`🔧 Admin panel (backup) loaded in ${config.mode} mode`);
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
// Note: Credentials are handled by login form input - never hardcode passwords!
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

// ====== Admin Theme Utilities ======
// Note: Base ThemeManager is loaded from ../theme-manager.js
// These are admin-specific theme functions

/**
 * Save custom theme to server (Admin-only)
 */
async function saveCustomThemeToServer(themeData) {
    try {
      // Get fresh token
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('No admin token found');
      }
      
      // Save to server
      const response = await fetch(`${API_BASE_URL}/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(themeData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save theme to server');
      }
      
    // Apply theme immediately
    applyThemeVariables(themeData);
    if (window.themeManager) {
      window.themeManager.setTheme(window.themeManager.getCurrentTheme());
    }
    
    // Update admin preview
    updateThemePreview(themeData);
    
    // Clear localStorage cache so main site will reload theme from server
    localStorage.removeItem('customTheme');
    console.log('✅ Cleared localStorage cache - main site will reload theme');
      
      return true;
    } catch (error) {
      console.error('Error saving theme to server:', error);
      return false;
    }
  }
  
/**
 * Reset theme to defaults (Admin-only)
 */
async function resetThemeToDefaults() {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        throw new Error('No admin token found');
      }
      
      // Reset on server
      const response = await fetch(`${API_BASE_URL}/theme`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset theme on server');
      }
    
    const data = await response.json();
    if (data.success && data.theme) {
      // Apply default theme
      applyThemeVariables(data.theme);
      if (window.themeManager) {
        window.themeManager.setTheme(window.themeManager.getCurrentTheme());
      }
      updateThemePreview(data.theme);
    }
    
    return true;
    } catch (error) {
    console.error('Error resetting theme:', error);
    return false;
  }
}

/**
 * Update theme preview in admin panel
 */
function updateThemePreview(themeData) {
  // Update color preview texts
  const textElements = {
    lightBgPreview: themeData.light.bg,
    lightPanelPreview: themeData.light.panel,
    lightInkPreview: themeData.light.ink,
    lightMutedPreview: themeData.light.muted,
    lightLinePreview: themeData.light.line,
    lightAccentPreview: themeData.light.accent,
    darkBgPreview: themeData.dark.bg,
    darkPanelPreview: themeData.dark.panel,
    darkInkPreview: themeData.dark.ink,
    darkMutedPreview: themeData.dark.muted,
    darkLinePreview: themeData.dark.line,
    darkAccentPreview: themeData.dark.accent,
    borderRadius: `${themeData.borderRadius}px`,
    shadowIntensity: `${themeData.shadowIntensity}%`,
    fontFamily: themeData.fontFamily
  };
  
  // Update text content
  Object.entries(textElements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
  
  // Update color swatch backgrounds
  const colorSwatches = {
    lightBgSwatch: themeData.light.bg,
    lightPanelSwatch: themeData.light.panel,
    lightInkSwatch: themeData.light.ink,
    lightMutedSwatch: themeData.light.muted,
    lightLineSwatch: themeData.light.line,
    lightAccentSwatch: themeData.light.accent,
    darkBgSwatch: themeData.dark.bg,
    darkPanelSwatch: themeData.dark.panel,
    darkInkSwatch: themeData.dark.ink,
    darkMutedSwatch: themeData.dark.muted,
    darkLineSwatch: themeData.dark.line,
    darkAccentSwatch: themeData.dark.accent
  };
  
  // Update swatch background colors
  Object.entries(colorSwatches).forEach(([id, color]) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.backgroundColor = color;
    }
  });
}

// Initialize theme manager (from theme-manager.js module)
let themeManager;

// ====== Modal Management ======
class ModalManager {
  constructor() {
    this.activeModal = null;
    this.init();
  }
  
  init() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target.id);
      }
    });
    
    // Close modals with close button
    $$('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) this.closeModal(modal.id);
      });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModal(this.activeModal);
      }
    });
  }
  
  openModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      // Store the element that had focus before opening modal
      this.previousFocus = document.activeElement;
      
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      this.activeModal = modalId;
      document.body.style.overflow = 'hidden';
      
      // Focus the first focusable element in the modal
      const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }
  
  closeModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      this.activeModal = null;
      document.body.style.overflow = '';
      
      // Return focus to the previous element
      if (this.previousFocus && this.previousFocus.focus) {
        this.previousFocus.focus();
      }
    }
  }
}

// ====== Blog Management ======
class BlogManager {
  constructor() {
    this.apiService = new ApiService();
    this.posts = [];
    this.filteredPosts = [];
    this.deletedPosts = []; // Initialize deletedPosts
    this.filteredDeletedPosts = []; // Initialize filteredDeletedPosts
    this.homepageEditor = null; // Will be set after HomepageEditor is created
    this.galleryManager = null; // Will be set after GalleryManager is created
  }

  setHomepageEditor(homepageEditor) {
    this.homepageEditor = homepageEditor;
  }

  setGalleryManager(galleryManager) {
    this.galleryManager = galleryManager;
  }
  
  async init() {
    // Check authentication first
    if (!this.apiService.token) {
      console.log('No authentication token found, redirecting to login');
      window.location.href = 'login.html';
      return;
    }

    try {
      await this.loadPosts();
      await this.loadTrash(); // Load trash data immediately
      this.renderDashboard();
      this.renderPostsTable();
      this.initEventListeners();
      
      // Load user info for account settings
      if (this.homepageEditor) {
        await this.homepageEditor.loadUserInfo();
      } else {
        console.warn('HomepageEditor not available yet');
      }
    } catch (error) {
      console.error('Error initializing blog manager:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
        this.showNotification('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın!', 'error');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      }
    }
  }
  
  async loadPosts() {
    try {
      // Try API first
      this.posts = await this.apiService.getPosts();
      this.filteredPosts = [...this.posts];
      console.log(`Loaded ${this.posts.length} posts from API`);
      
      // Log post statuses for debugging
      const statusCounts = {};
      this.posts.forEach(post => {
        statusCounts[post.status] = (statusCounts[post.status] || 0) + 1;
      });
      console.log('Post status counts:', statusCounts);
      
    } catch (error) {
      console.error('API Error, trying fallback:', error);
      
      // Fallback: Load from local file
      try {
        const response = await fetch('../content/posts.json');
        if (response.ok) {
          this.posts = await response.json();
          this.filteredPosts = [...this.posts];
          console.log('Loaded posts from fallback:', this.posts.length);
          
          // Log post statuses for debugging
          const statusCounts = {};
          this.posts.forEach(post => {
            statusCounts[post.status] = (statusCounts[post.status] || 0) + 1;
          });
          console.log('Post status counts (fallback):', statusCounts);
        } else {
          throw new Error('Fallback failed');
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        this.posts = [];
        this.filteredPosts = [];
      }
    }
  }


  
  async renderDashboard() {
    try {
      const stats = await this.apiService.getStats();
      
      $('#totalPosts').textContent = stats.totalPosts;
      $('#featuredPosts').textContent = stats.featuredPosts;
      $('#recentPosts').textContent = stats.recentPosts;
      $('#totalTags').textContent = stats.totalTags;
    } catch (error) {
      console.error('Error loading stats:', error);
      // Fallback to local calculation
      const totalPosts = this.posts.length;
      const featuredPosts = this.posts.filter(post => post.featured).length;
      const recentPosts = this.posts.filter(post => {
        const postDate = new Date(post.date);
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return postDate >= oneMonthAgo;
      }).length;
      
      const allTags = new Set();
      this.posts.forEach(post => {
        if (post.tags) {
          post.tags.forEach(tag => allTags.add(tag));
        }
      });
      const totalTags = allTags.size;
      
      $('#totalPosts').textContent = totalPosts;
      $('#featuredPosts').textContent = featuredPosts;
      $('#recentPosts').textContent = recentPosts;
      $('#totalTags').textContent = totalTags;
    }
  }
  
  renderPostsTable() {
    const tbody = $('#postsTableBody');
    tbody.innerHTML = '';
    
    // Filter out deleted posts from main table
    const activePosts = this.filteredPosts.filter(post => post.status !== 'deleted');
    
    activePosts.forEach(post => {
      const status = post.status || 'published';
      const publishDate = post.publishDate ? new Date(post.publishDate) : null;
      const isScheduled = status === 'scheduled' && publishDate && publishDate > new Date();
      
      // Status gösterimi
      let statusDisplay = '';
      let statusClass = '';
      if (status === 'draft') {
        statusDisplay = '📝 Taslak';
        statusClass = 'status-draft';
      } else if (status === 'published') {
        statusDisplay = '✅ Yayında';
        statusClass = 'status-published';
      } else if (isScheduled) {
        statusDisplay = `⏰ Zamanlanmış (${formatDate(post.publishDate)})`;
        statusClass = 'status-scheduled';
      } else {
        statusDisplay = '✅ Yayında';
        statusClass = 'status-published';
      }
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <a href="../post.html?slug=${post.slug}" class="post-title" target="_blank">
            ${post.title}
          </a>
          ${post.featured ? '<span class="featured-badge">⭐</span>' : ''}
        </td>
        <td class="post-date">${formatDate(post.date)}</td>
        <td>
          <div class="post-tags">
            ${post.tags ? post.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
          </div>
        </td>
        <td>
          <span class="post-status ${statusClass}">
            ${statusDisplay}
          </span>
        </td>
        <td class="post-views">
          <span class="views-count">
            <svg viewBox="0 0 24 24" width="16" height="16" style="margin-right: 4px;">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            ${post.views || 0}
          </span>
        </td>
        <td>
          <div class="post-actions">
            ${status === 'draft' ? `
              <button class="btn btn-sm btn-secondary preview-post" data-slug="${post.slug}">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                Önizle
              </button>
              <button class="btn btn-sm btn-success publish-post" data-slug="${post.slug}">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Yayınla
              </button>
              <button class="btn btn-sm btn-warning schedule-post" data-slug="${post.slug}">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                </svg>
                Zamanla
              </button>
            ` : ''}
            <button class="btn btn-sm btn-primary edit-post" data-slug="${post.slug}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Düzenle
            </button>
            <button class="btn btn-sm ${post.featured ? 'btn-warning' : 'btn-info'} toggle-featured" data-slug="${post.slug}" title="${post.featured ? 'Öne çıkarılmış' : 'Öne çıkarılmamış'}">
              ${post.featured ? '⭐ Öne Çıkarıldı' : '☆ Öne Çıkar'}
            </button>
            <button class="btn btn-sm btn-danger delete-post" data-slug="${post.slug}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Sil
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    $$('.edit-post').forEach(btn => {
      btn.addEventListener('click', () => this.editPost(btn.dataset.slug));
    });
    
    $$('.delete-post').forEach(btn => {
      btn.addEventListener('click', () => this.deletePost(btn.dataset.slug));
    });
    
    $$('.publish-post').forEach(btn => {
      btn.addEventListener('click', () => this.publishPost(btn.dataset.slug));
    });
    
    $$('.schedule-post').forEach(btn => {
      btn.addEventListener('click', () => this.schedulePost(btn.dataset.slug));
    });
    
    $$('.toggle-featured').forEach(btn => {
      btn.addEventListener('click', () => this.toggleFeatured(btn.dataset.slug));
    });
    
    $$('.preview-post').forEach(btn => {
      btn.addEventListener('click', () => this.previewPost(btn.dataset.slug));
    });
  }
  
  initEventListeners() {
    // Search functionality
    $('#searchPosts').addEventListener('input', (e) => {
      this.filterPosts();
    });
    
    // Filter functionality
    $('#filterStatus').addEventListener('change', (e) => {
      this.filterPosts();
    });
    
    // New post button - now redirects to markdown editor
    // $('#newPostBtn').addEventListener('click', () => {
    //   modalManager.openModal('newPostModal');
    //   this.setupNewPostForm();
    // });


    
    // Form submissions
    $('#newPostForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNewPost();
    });
    
    $('#editPostForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEditedPost();
    });
    
    // Delete confirmation
    $('#confirmDelete').addEventListener('click', () => {
      this.confirmDelete();
    });
    
    // Schedule confirmation
    $('#confirmSchedule').addEventListener('click', () => {
      this.confirmSchedule();
    });

    // Navigation tabs
    $$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

      // Analytics time range
  $('#timeRange').addEventListener('change', (e) => {
    this.loadAnalytics();
  });

  // Comments filter
  $('#commentFilter').addEventListener('change', (e) => {
    this.filterComments();
  });

  // Trash search
  $('#searchTrash').addEventListener('input', (e) => {
    this.filterTrash();
  });

  // Empty trash button
  $('#emptyTrashBtn').addEventListener('click', () => {
    this.emptyTrash();
  });
  }

  switchTab(tabName) {
    // Update active tab
    $$('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Show/hide sections
    $('.dashboard-section').style.display = tabName === 'dashboard' ? 'block' : 'none';
    $('.posts-section').style.display = tabName === 'dashboard' ? 'block' : 'none';
    $('#analytics-section').style.display = tabName === 'analytics' ? 'block' : 'none';
    $('#comments-section').style.display = tabName === 'comments' ? 'block' : 'none';
    $('#trash-section').style.display = tabName === 'trash' ? 'block' : 'none';
    $('#personal-section').style.display = tabName === 'personal' ? 'block' : 'none';
    $('#gallery-section').style.display = tabName === 'gallery' ? 'block' : 'none';
    $('#security-section').style.display = tabName === 'security' ? 'block' : 'none';

    // Load data based on tab
    if (tabName === 'analytics') {
      this.loadAnalytics();
    } else if (tabName === 'comments') {
      this.loadComments();
    } else if (tabName === 'trash') {
      this.loadTrash();
    } else if (tabName === 'personal') {
      // Personal information is handled by HomepageEditor class
    } else if (tabName === 'gallery') {
      console.log('Gallery tab clicked!'); // Debug log
      if (window.galleryManager) {
        window.galleryManager.loadGallery();
      } else {
        console.error('Gallery manager not available');
      }
    } else if (tabName === 'security') {
      this.loadSecurityData();
    }
  }

  async loadAnalytics() {
    try {
      console.log('Loading analytics...'); // Debug log
      const analytics = await this.apiService.getAnalytics();
      console.log('Analytics data received:', analytics); // Debug log
      this.renderAnalytics(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      this.showNotification('İstatistikler yüklenirken hata oluştu!', 'error');
    }
  }

  renderAnalytics(analytics) {
    console.log('Rendering analytics:', analytics); // Debug log
    
    // Update general stats
    $('#totalViews').textContent = analytics.totalViews.toLocaleString('tr-TR');
    
    // Use backend calculated popular blog post
    $('#popularPage').textContent = analytics.popularPage || '-';
    
    // Update total comments
    $('#totalComments').textContent = analytics.totalComments || 0;
    
    // Update last updated
    const lastUpdated = new Date(analytics.lastUpdated);
    $('#lastUpdated').textContent = lastUpdated.toLocaleDateString('tr-TR');

    // Render popular posts
    const popularPostsHTML = analytics.popularPosts.map(post => `
      <div class="popular-post-item">
        <div class="popular-post-title">${post.title}</div>
        <div class="popular-post-views">${post.views}</div>
      </div>
    `).join('');
    $('#popularPosts').innerHTML = popularPostsHTML || '<p class="muted">Henüz görüntüleme yok</p>';

    // Render popular tags
    const popularTagsHTML = analytics.popularTags ? analytics.popularTags.map(tag => `
      <div class="popular-tag-item">
        <div class="popular-tag-name">${tag.tag}</div>
        <div class="popular-tag-count">${tag.count}</div>
      </div>
    `).join('') : '';
    $('#popularTags').innerHTML = popularTagsHTML || '<p class="muted">Henüz etiket kullanılmamış</p>';

    // Render daily chart
    console.log('Calling renderDailyChart with:', analytics.dailyStats); // Debug log
    this.renderDailyChart(analytics.dailyStats);
  }

  renderDailyChart(dailyStats) {
    console.log('renderDailyChart called with:', dailyStats); // Debug log
    
    const ctx = document.getElementById('dailyChart');
    console.log('Canvas element:', ctx); // Debug log
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded!');
      $('#dailyChart').innerHTML = `
        <div style="text-align: center; color: var(--muted); padding: 2rem;">
          <p>📊 Chart.js yüklenemedi</p>
          <p>Grafik gösterilemiyor</p>
        </div>
      `;
      return;
    }
    
    console.log('Chart.js is loaded successfully'); // Debug log
    
    // Destroy existing chart if it exists
    if (this.dailyChart) {
      this.dailyChart.destroy();
    }

    // Check if we have data
    if (!dailyStats || dailyStats.length === 0) {
      $('#dailyChart').innerHTML = `
        <div style="text-align: center; color: var(--muted); padding: 2rem;">
          <p>📊 Henüz veri yok</p>
          <p>Grafik verileri yüklenirken bekleyin...</p>
        </div>
      `;
      return;
    }

    // Prepare data for chart
    const labels = dailyStats.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('tr-TR', { 
        month: 'short', 
        day: 'numeric' 
      });
    });
    
    const data = dailyStats.map(day => day.totalViews);

    console.log('Chart data:', { labels, data }); // Debug log

    // Create new chart
    this.dailyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Günlük Görüntüleme',
          data: data,
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                return `${context.parsed.y} görüntüleme`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: 'var(--text-color)',
              font: {
                size: 12
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: 'var(--text-color)',
              font: {
                size: 12
              },
              callback: function(value) {
                return value + ' görüntüleme';
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }
  
  filterPosts() {
    const searchTerm = $('#searchPosts').value.toLowerCase();
    const filterValue = $('#filterStatus').value;
    
    this.filteredPosts = this.posts.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm) ||
                           post.excerpt.toLowerCase().includes(searchTerm) ||
                           (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
      
      let matchesFilter = true;
      if (filterValue === 'featured') {
        matchesFilter = post.featured;
      } else if (filterValue === 'recent') {
        const postDate = new Date(post.date);
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        matchesFilter = postDate >= oneMonthAgo;
      }
      
      return matchesSearch && matchesFilter;
    });
    
    this.renderPostsTable();
  }
  
  setupNewPostForm() {
    const form = $('#newPostForm');
    form.reset();
    
    // Set default date to today
    $('#postDate').value = new Date().toISOString().split('T')[0];
    
    // Auto-generate slug from title
    $('#postTitle').addEventListener('input', (e) => {
      $('#postSlug').value = generateSlug(e.target.value);
    });
  }
  
  async saveNewPost() {
    const formData = new FormData($('#newPostForm'));
    
    // Get content from markdown editor
    const markdownEditor = document.getElementById('markdownEditor');
    const content = markdownEditor ? markdownEditor.innerText : formData.get('content');
    
    const postData = {
      title: formData.get('title'),
      excerpt: formData.get('excerpt'),
      date: formData.get('date'),
      cover: formData.get('cover') || '',
      tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).join(',') : '',
      featured: false, // Yeni yazılar varsayılan olarak öne çıkarılmamış
      content: content,
      status: 'draft' // Yeni yazılar taslak olarak kaydedilecek
    };
    
    try {
      // Create post via API
      const response = await this.apiService.createPost(postData);
      
      // Reload posts
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      modalManager.closeModal('newPostModal');
      
      this.showNotification('Blog yazısı taslak olarak kaydedildi! Yayınlamak için onaylayın.', 'success');
    } catch (error) {
      console.error('Error saving post:', error);
      this.showNotification(`Blog yazısı kaydedilirken hata oluştu: ${error.message}`, 'error');
    }
  }
  
  async editPost(slug) {
    try {
      // Redirect to markdown editor with edit parameter
      window.location.href = `../markdown-editor/index.html?edit=${slug}`;
    } catch (error) {
      console.error('Error redirecting to editor:', error);
      this.showNotification('Editöre yönlendirilirken hata oluştu!', 'error');
    }
  }
  
  async saveEditedPost() {
    const formData = new FormData($('#editPostForm'));
    const originalSlug = formData.get('originalSlug');
    
    // Get content from markdown editor
    const markdownEditor = document.getElementById('editMarkdownEditor');
    const content = markdownEditor ? markdownEditor.innerText : formData.get('content');
    
    const postData = {
      title: formData.get('title'),
      excerpt: formData.get('excerpt'),
      date: formData.get('date'),
      cover: formData.get('cover') || '',
      tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).join(',') : '',
      featured: false, // Düzenleme sırasında featured durumu korunmaz, toggle butonu ile yönetilir
      content: content
    };
    
    try {
      // Update post via API
      await this.apiService.updatePost(originalSlug, postData);
      
      // Reload posts
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      modalManager.closeModal('editPostModal');
      
      this.showNotification('Blog yazısı başarıyla güncellendi!', 'success');
    } catch (error) {
      console.error('Error updating post:', error);
      this.showNotification(`Blog yazısı güncellenirken hata oluştu: ${error.message}`, 'error');
    }
  }
  
  deletePost(slug) {
    this.postToDelete = slug;
    modalManager.openModal('deleteModal');
  }
  
  async confirmDelete() {
    if (!this.postToDelete) return;
    
    try {
      // Delete post via API
      await this.apiService.deletePost(this.postToDelete);
      
      // Reload posts
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      this.updateTrashCount(); // Update trash count
      modalManager.closeModal('deleteModal');
      
      this.showNotification('Blog yazısı geri dönüşüm kutusuna taşındı!', 'success');
      this.postToDelete = null;
    } catch (error) {
      console.error('Error deleting post:', error);
      this.showNotification(`Blog yazısı silinirken hata oluştu: ${error.message}`, 'error');
    }
  }
  
  async publishPost(slug) {
    try {
      await this.apiService.publishPost(slug, { status: 'published' });
      
      // Reload posts
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      
      this.showNotification('Blog yazısı başarıyla yayınlandı!', 'success');
    } catch (error) {
      console.error('Error publishing post:', error);
      this.showNotification(`Blog yazısı yayınlanırken hata oluştu: ${error.message}`, 'error');
    }
  }
  
  schedulePost(slug) {
    // Schedule modal açmak için
    this.postToSchedule = slug;
    
    // Current date + 1 day as default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDateTime = tomorrow.toISOString().slice(0, 16);
    
    // Set default value
    $('#scheduleDateTime').value = defaultDateTime;
    
    modalManager.openModal('scheduleModal');
  }
  
  async confirmSchedule() {
    if (!this.postToSchedule) return;
    
    const publishDate = $('#scheduleDateTime').value;
    if (!publishDate) {
      this.showNotification('Lütfen yayın tarihini seçin!', 'error');
      return;
    }
    
    try {
      await this.apiService.publishPost(this.postToSchedule, { 
        status: 'scheduled',
        publishDate: new Date(publishDate).toISOString()
      });
      
      // Reload posts
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      modalManager.closeModal('scheduleModal');
      
      this.showNotification('Blog yazısı başarıyla zamanlandı!', 'success');
      this.postToSchedule = null;
    } catch (error) {
      console.error('Error scheduling post:', error);
      this.showNotification(`Blog yazısı zamanlanırken hata oluştu: ${error.message}`, 'error');
    }
  }

  async toggleFeatured(slug) {
    try {
      const post = this.posts.find(p => p.slug === slug);
      if (!post) {
        this.showNotification('Blog yazısı bulunamadı!', 'error');
        return;
      }
      
      const newFeaturedStatus = !post.featured;
      
      // Use the new dedicated featured endpoint
      await this.apiService.toggleFeatured(slug, newFeaturedStatus);
      
      // Reload posts
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      
      this.showNotification(
        newFeaturedStatus 
          ? 'Blog yazısı öne çıkarıldı! ✅' 
          : 'Blog yazısı öne çıkarılmaktan çıkarıldı! ⭐', 
        'success'
      );
    } catch (error) {
      console.error('Error toggling featured status:', error);
      this.showNotification(`Öne çıkarılan durumu değiştirilirken hata oluştu: ${error.message}`, 'error');
    }
  }

  previewPost(slug) {
    try {
      // Open preview in new tab
      const previewUrl = `../post.html?slug=${slug}&preview=true`;
      window.open(previewUrl, '_blank');
    } catch (error) {
      console.error('Error opening preview:', error);
      this.showNotification('Önizleme açılırken hata oluştu!', 'error');
    }
  }

  async restorePost(slug) {
    try {
      await this.apiService.restorePost(slug);
      
      // Reload posts
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      this.loadTrash(); // Refresh trash
      
      this.showNotification('Blog yazısı başarıyla geri yüklendi!', 'success');
    } catch (error) {
      console.error('Error restoring post:', error);
      this.showNotification(`Blog yazısı geri yüklenirken hata oluştu: ${error.message}`, 'error');
    }
  }

  async permanentDeletePost(slug) {
    if (!confirm('Bu yazıyı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }
    
    try {
      // Log what we're about to delete for debugging
      const postToDelete = this.posts.find(p => p.slug === slug);
      if (postToDelete) {
        console.log('About to permanently delete post:', { 
          slug: postToDelete.slug, 
          title: postToDelete.title, 
          status: postToDelete.status 
        });
      }
      
      await this.apiService.permanentDeletePost(slug);
      
      // Reload posts from server to get updated data
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      this.loadTrash(); // Refresh trash
      
      this.showNotification('Blog yazısı kalıcı olarak silindi!', 'success');
    } catch (error) {
      console.error('Error permanently deleting post:', error);
      this.showNotification(`Blog yazısı kalıcı olarak silinirken hata oluştu: ${error.message}`, 'error');
    }
  }

  // Restore deleted post
  async restorePost(slug) {
    try {
      await this.apiService.restorePost(slug);
      
      // Reload posts from server to get updated data
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      this.loadTrash(); // Refresh trash
      this.updateTrashCount(); // Update trash count
      
      this.showNotification('Blog yazısı başarıyla geri yüklendi!', 'success');
    } catch (error) {
      console.error('Error restoring post:', error);
      this.showNotification(`Blog yazısı geri yüklenirken hata oluştu: ${error.message}`, 'error');
    }
  }

  async emptyTrash() {
    if (!confirm('Geri dönüşüm kutusundaki tüm yazıları kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }
    
    try {
      // First, make sure we have the latest posts data from server
      await this.loadPosts();
      
      // Get all deleted posts from the current posts list
      const deletedPosts = this.posts.filter(post => post.status === 'deleted');
      
      if (deletedPosts.length === 0) {
        this.showNotification('Geri dönüşüm kutusunda silinecek yazı bulunamadı!', 'info');
        return;
      }
      
      // Double-check: Only delete posts with 'deleted' status
      const validDeletedPosts = deletedPosts.filter(post => {
        if (post.status !== 'deleted') {
          console.warn(`Skipping post ${post.slug} with invalid status: ${post.status}`);
          return false;
        }
        return true;
      });
      
      if (validDeletedPosts.length === 0) {
        this.showNotification('Geri dönüşüm kutusunda geçerli silinmiş yazı bulunamadı!', 'info');
        return;
      }
      
      // Log what we're about to delete for debugging
      console.log('About to permanently delete these posts:', validDeletedPosts.map(p => ({ slug: p.slug, title: p.title, status: p.status })));
      
      // Delete all valid deleted posts permanently with error handling
      const deleteResults = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const post of validDeletedPosts) {
        try {
          await this.apiService.permanentDeletePost(post.slug);
          deleteResults.push({ slug: post.slug, success: true });
          successCount++;
        } catch (error) {
          console.warn(`Failed to delete post ${post.slug}:`, error.message);
          deleteResults.push({ slug: post.slug, success: false, error: error.message });
          errorCount++;
        }
      }
      
      // Reload posts from server to get updated data
      await this.loadPosts();
      
      // Update UI
      await this.renderDashboard();
      this.renderPostsTable();
      this.loadTrash(); // Refresh trash
      this.updateTrashCount(); // Update trash count
      
      // Show appropriate notification based on results
      if (successCount > 0 && errorCount === 0) {
        this.showNotification(`Geri dönüşüm kutusu başarıyla boşaltıldı! ${successCount} yazı kalıcı olarak silindi.`, 'success');
      } else if (successCount > 0 && errorCount > 0) {
        this.showNotification(`${successCount} yazı başarıyla silindi, ${errorCount} yazı silinemedi. Detaylar için konsolu kontrol edin.`, 'warning');
      } else {
        this.showNotification('Hiçbir yazı silinemedi. Tüm yazılar zaten silinmiş olabilir.', 'error');
      }
    } catch (error) {
      console.error('Error emptying trash:', error);
      this.showNotification(`Geri dönüşüm kutusu boşaltılırken hata oluştu: ${error.message}`, 'error');
    }
  }
  

  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    if (type === 'success') {
      notification.style.background = '#10b981';
    } else if (type === 'error') {
      notification.style.background = '#ef4444';
    } else {
      notification.style.background = '#3b82f6';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // ====== Comments Management ======
  async loadComments() {
    try {
      const response = await this.apiService.request('/admin/comments');
      this.comments = response.comments || [];
      this.filteredComments = [...this.comments];
      this.renderCommentsTable();
    } catch (error) {
      console.error('Error loading comments:', error);
      this.showNotification('Yorumlar yüklenirken hata oluştu!', 'error');
    }
  }

  async loadTrash() {
    try {
      // Make sure we have posts data
      if (!this.posts || this.posts.length === 0) {
        await this.loadPosts();
      }
      
      // Filter deleted posts from existing posts
      this.deletedPosts = this.posts.filter(post => post.status === 'deleted');
      this.filteredDeletedPosts = [...this.deletedPosts];
      this.renderTrashTable();
      this.updateTrashCount();
    } catch (error) {
      console.error('Error loading trash:', error);
      this.showNotification('Geri dönüşüm kutusu yüklenirken hata oluştu!', 'error');
    }
  }

  updateTrashCount() {
    // Güvenli kontrol - deletedPosts undefined olabilir
    const deletedPosts = this.deletedPosts || [];
    const count = deletedPosts.length;
    const trashCountElement = $('#trashCount');
    if (trashCountElement) {
      trashCountElement.textContent = `(${count})`;
      // Hide count if 0
      trashCountElement.style.display = count > 0 ? 'inline-block' : 'none';
    }
    
    // Also update the empty trash button state
    const emptyTrashBtn = $('#emptyTrashBtn');
    if (emptyTrashBtn) {
      emptyTrashBtn.disabled = count === 0;
      emptyTrashBtn.style.opacity = count === 0 ? '0.5' : '1';
    }
  }

  calculateRemainingDays(deletedAt) {
    if (!deletedAt) return 30; // Default 30 days if no deletion date
    
    const deletionDate = new Date(deletedAt);
    const now = new Date();
    const daysSinceDeletion = Math.floor((now - deletionDate) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, 30 - daysSinceDeletion);
    
    return remainingDays;
  }

  formatRemainingDays(remainingDays) {
    if (remainingDays === 0) {
      return '<span style="color: #ef4444; font-weight: 600;">⚠️ Bugün silinecek</span>';
    } else if (remainingDays <= 3) {
      return `<span style="color: #f59e0b; font-weight: 600;">⏰ ${remainingDays} gün kaldı</span>`;
    } else if (remainingDays <= 7) {
      return `<span style="color: #f97316; font-weight: 600;">📅 ${remainingDays} gün kaldı</span>`;
    } else {
      return `<span style="color: var(--muted);">📅 ${remainingDays} gün kaldı</span>`;
    }
  }

  renderCommentsTable() {
    const tbody = $('#commentsTableBody');
    tbody.innerHTML = '';
    
    this.filteredComments.forEach(comment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="comment-author-cell">
          <div class="comment-author-name">${this.escapeHtml(comment.name)}</div>
          <div class="comment-author-email">${this.escapeHtml(comment.email)}</div>
        </td>
        <td class="comment-content-cell">
          <div class="comment-content">${this.escapeHtml(comment.content)}</div>
        </td>
        <td class="comment-post-cell">
          <div class="comment-post-title">${this.escapeHtml(comment.postTitle)}</div>
          <div class="comment-post-slug">${comment.postSlug}</div>
        </td>
        <td class="comment-date-cell">
          <div class="comment-date">${this.formatCommentDate(comment.date)}</div>
        </td>
        <td class="comment-status-cell">
          <span class="comment-status ${comment.approved ? 'approved' : 'pending'}">
            ${comment.approved ? '✅ Onaylandı' : '⏳ Bekliyor'}
          </span>
        </td>
        <td class="comment-actions-cell">
          <div class="comment-actions">
            ${!comment.approved ? `
              <button class="comment-action-btn approve" data-id="${comment.id}">
                <svg viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Onayla
              </button>
            ` : ''}
            <button class="comment-action-btn reject" data-id="${comment.id}">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              Reddet
            </button>
            <button class="comment-action-btn delete" data-id="${comment.id}">
              <svg viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Sil
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    $$('.comment-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.dataset.id;
        const action = btn.classList.contains('approve') ? 'approve' : 
                      btn.classList.contains('reject') ? 'reject' : 'delete';
        this.handleCommentAction(commentId, action);
      });
    });
  }

  filterComments() {
    const filterValue = $('#commentFilter').value;
    
    this.filteredComments = this.comments.filter(comment => {
      if (filterValue === 'pending') {
        return !comment.approved;
      } else if (filterValue === 'approved') {
        return comment.approved;
      } else if (filterValue === 'rejected') {
        return comment.approved === false; // Explicitly rejected
      }
      return true; // 'all'
    });
    
    this.renderCommentsTable();
  }

  renderTrashTable() {
    const tbody = $('#trashTableBody');
    tbody.innerHTML = '';
    
    if (this.filteredDeletedPosts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-trash">
            <div style="text-align: center; padding: 2rem; color: var(--muted);">
              <svg viewBox="0 0 24 24" width="48" height="48" style="margin-bottom: 1rem; opacity: 0.5;">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              <p>Geri dönüşüm kutusu boş</p>
              <p style="font-size: 0.875rem;">Silinen yazı bulunmuyor</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    this.filteredDeletedPosts.forEach(post => {
      const remainingDays = this.calculateRemainingDays(post.deletedAt);
      const remainingDaysFormatted = this.formatRemainingDays(remainingDays);
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="post-title">${post.title}</div>
          ${post.featured ? '<span class="featured-badge">⭐</span>' : ''}
        </td>
        <td class="post-date">
          <div>${formatDate(post.deletedAt)}</div>
          <div style="font-size: 0.875rem; margin-top: 0.25rem;">
            ${remainingDaysFormatted}
          </div>
        </td>
        <td>
          <span class="post-status status-${post.status || 'published'}">
            ${post.status === 'draft' ? '📝 Taslak' : 
              post.status === 'published' ? '✅ Yayında' : 
              post.status === 'scheduled' ? '⏰ Zamanlanmış' : '✅ Yayında'}
          </span>
        </td>
        <td>
          <div class="post-tags">
            ${post.tags ? post.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
          </div>
        </td>
        <td>
          <div class="post-actions">
            <button class="btn btn-sm btn-success restore-post" data-slug="${post.slug}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Geri Yükle
            </button>
            <button class="btn btn-sm btn-danger permanent-delete" data-slug="${post.slug}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Kalıcı Sil
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    $$('.restore-post').forEach(btn => {
      btn.addEventListener('click', () => this.restorePost(btn.dataset.slug));
    });
    
    $$('.permanent-delete').forEach(btn => {
      btn.addEventListener('click', () => this.permanentDeletePost(btn.dataset.slug));
    });
  }

  filterTrash() {
    const searchTerm = $('#searchTrash').value.toLowerCase();
    
    this.filteredDeletedPosts = this.deletedPosts.filter(post => {
      return post.title.toLowerCase().includes(searchTerm) ||
             (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
    });
    
    this.renderTrashTable();
  }

  async handleCommentAction(commentId, action) {
    try {
      if (action === 'delete') {
        if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
          return;
        }
        
        await this.apiService.request(`/admin/comments/${commentId}`, {
          method: 'DELETE'
        });
        
        this.showNotification('Yorum başarıyla silindi!', 'success');
      } else {
        const approved = action === 'approve';
        
        await this.apiService.request(`/admin/comments/${commentId}`, {
          method: 'PUT',
          body: JSON.stringify({ approved })
        });
        
        this.showNotification(`Yorum başarıyla ${approved ? 'onaylandı' : 'reddedildi'}!`, 'success');
      }
      
      // Reload comments
      await this.loadComments();
    } catch (error) {
      console.error('Error handling comment action:', error);
      this.showNotification('İşlem sırasında hata oluştu!', 'error');
    }
  }

  formatCommentDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ====== Security & Sessions Management ======
  
  async loadSecurityData() {
    try {
      const securityData = await this.apiService.getSecurityData();
      this.renderSecurityData(securityData);
    } catch (error) {
      console.error('Error loading security data:', error);
      this.showNotification('Güvenlik verileri yüklenirken hata oluştu!', 'error');
    }
  }

  renderSecurityData(data) {
    this.renderActiveSessions(data.activeSessions);
    this.renderLoginHistory(data.loginHistory);
    this.renderFailedLogins(data.failedLogins);
    this.renderIPAnalysis(data.ipAnalysis);
  }

  renderActiveSessions(sessions) {
    const container = $('#activeSessions');
    if (!container) return;

    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<p class="muted">Aktif oturum bulunamadı</p>';
      return;
    }

    const sessionsHTML = sessions.map(session => {
      const loginTime = new Date(session.loginTime).toLocaleString('tr-TR');
      const lastActivity = new Date(session.lastActivity).toLocaleString('tr-TR');
      
      return `
        <div class="session-item">
          <div class="session-info">
            <div class="session-user">
              <span class="user-badge">👤 ${session.username}</span>
              <span class="session-status active">🟢 Aktif</span>
            </div>
            <div class="session-details">
              <div class="detail-item">
                <span class="detail-label">IP:</span>
                <span class="detail-value">${session.ip}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Giriş:</span>
                <span class="detail-value">${loginTime}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Son Aktivite:</span>
                <span class="detail-value">${lastActivity}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarayıcı:</span>
                <span class="detail-value">${this.getBrowserInfo(session.userAgent)}</span>
              </div>
            </div>
          </div>
          <div class="session-actions">
            <button class="btn btn-danger btn-sm" onclick="blogManager.terminateSession('${session.id}')">
              Sonlandır
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = sessionsHTML;
  }

  renderLoginHistory(loginHistory) {
    const container = $('#loginHistory');
    if (!container) return;

    if (!loginHistory || loginHistory.length === 0) {
      container.innerHTML = '<p class="muted">Giriş geçmişi bulunamadı</p>';
      return;
    }

    // Son 5 girişi göster
    const recentLogins = loginHistory.slice(0, 5);
    const totalCount = loginHistory.length;

    const historyHTML = recentLogins.map(login => {
      const timestamp = new Date(login.timestamp).toLocaleString('tr-TR');
      
      return `
        <div class="login-history-item">
          <div class="login-info">
            <div class="login-user">
              <span class="user-badge">👤 ${login.username}</span>
              <span class="login-status success">✅ Başarılı</span>
            </div>
            <div class="login-details">
              <div class="detail-item">
                <span class="detail-label">IP:</span>
                <span class="detail-value">${login.ip}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarih:</span>
                <span class="detail-value">${timestamp}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarayıcı:</span>
                <span class="detail-value">${this.getBrowserInfo(login.userAgent)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Toplam sayı bilgisi ekle
    const summaryHTML = totalCount > 7 ? 
      `<div class="security-summary">
        <p class="muted">Son 7 giriş gösteriliyor (Toplam: ${totalCount} kayıt)</p>
      </div>` : '';

    container.innerHTML = summaryHTML + historyHTML;
  }

  renderFailedLogins(failedLogins) {
    const container = $('#failedLogins');
    if (!container) return;

    if (!failedLogins || failedLogins.length === 0) {
      container.innerHTML = '<p class="muted">Hatalı giriş denemesi bulunamadı</p>';
      return;
    }

    // Son 5 hatalı girişi göster
    const recentFailedLogins = failedLogins.slice(0, 5);
    const totalCount = failedLogins.length;

    const failedHTML = recentFailedLogins.map(login => {
      const timestamp = new Date(login.timestamp).toLocaleString('tr-TR');
      
      return `
        <div class="failed-login-item">
          <div class="failed-login-info">
            <div class="failed-login-user">
              <span class="user-badge">👤 ${login.username}</span>
              <span class="failed-login-status error">❌ Başarısız</span>
            </div>
            <div class="failed-login-details">
              <div class="detail-item">
                <span class="detail-label">IP:</span>
                <span class="detail-value">${login.ip}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarih:</span>
                <span class="detail-value">${timestamp}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Sebep:</span>
                <span class="detail-value">${login.reason}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarayıcı:</span>
                <span class="detail-value">${this.getBrowserInfo(login.userAgent)}</span>
              </div>
            </div>
          </div>
          <div class="failed-login-actions">
            <button class="btn btn-danger btn-sm" onclick="blogManager.blockIP('${login.ip}')">
              IP'yi Engelle
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Toplam sayı bilgisi ve temizleme butonu ekle
    const summaryHTML = totalCount > 5 ? 
      `<div class="security-summary">
        <p class="muted">Son 5 hatalı giriş gösteriliyor (Toplam: ${totalCount} kayıt)</p>
        <button class="btn btn-warning btn-sm" onclick="blogManager.clearFailedLogins()">
          Tüm Logları Temizle
        </button>
      </div>` : 
      `<div class="security-summary">
        <button class="btn btn-warning btn-sm" onclick="blogManager.clearFailedLogins()">
          Logları Temizle
        </button>
      </div>`;

    container.innerHTML = summaryHTML + failedHTML;
  }

  renderIPAnalysis(ipAnalysis) {
    const container = $('#ipAnalysis');
    if (!container) return;

    if (!ipAnalysis || ipAnalysis.length === 0) {
      container.innerHTML = '<p class="muted">IP analizi bulunamadı</p>';
      return;
    }

    // Risk seviyesine göre sırala ve en riskli 10 IP'yi göster
    const sortedAnalysis = ipAnalysis.sort((a, b) => b.failedAttempts - a.failedAttempts);
    const topRiskyIPs = sortedAnalysis.slice(0, 10);
    const totalCount = ipAnalysis.length;

    const analysisHTML = topRiskyIPs.map(analysis => {
      const lastAttempt = new Date(analysis.lastAttempt).toLocaleString('tr-TR');
      const riskLevel = analysis.failedAttempts > 10 ? 'high' : analysis.failedAttempts > 5 ? 'medium' : 'low';
      
      return `
        <div class="ip-analysis-item">
          <div class="ip-analysis-info">
            <div class="ip-header">
              <span class="ip-address">🌐 ${analysis.ip}</span>
              <span class="risk-level ${riskLevel}">
                ${riskLevel === 'high' ? '🔴 Yüksek Risk' : riskLevel === 'medium' ? '🟡 Orta Risk' : '🟢 Düşük Risk'}
              </span>
            </div>
            <div class="ip-details">
              <div class="detail-item">
                <span class="detail-label">Başarısız Deneme:</span>
                <span class="detail-value">${analysis.failedAttempts}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Son Deneme:</span>
                <span class="detail-value">${lastAttempt}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Denenen Kullanıcılar:</span>
                <span class="detail-value">${analysis.usernames.join(', ')}</span>
              </div>
            </div>
          </div>
          <div class="ip-analysis-actions">
            <button class="btn btn-danger btn-sm" onclick="blogManager.blockIP('${analysis.ip}')">
              IP'yi Engelle
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Toplam sayı bilgisi ekle
    const summaryHTML = totalCount > 10 ? 
      `<div class="security-summary">
        <p class="muted">En riskli 10 IP gösteriliyor (Toplam: ${totalCount} IP)</p>
      </div>` : '';

    container.innerHTML = summaryHTML + analysisHTML;
  }

  getBrowserInfo(userAgent) {
    if (!userAgent) return 'Bilinmiyor';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Diğer';
  }

  async terminateSession(sessionId) {
    try {
      await this.apiService.terminateSession(sessionId);
      this.showNotification('Oturum başarıyla sonlandırıldı!', 'success');
      this.loadSecurityData(); // Refresh data
    } catch (error) {
      console.error('Error terminating session:', error);
      this.showNotification('Oturum sonlandırılırken hata oluştu!', 'error');
    }
  }

  async terminateAllSessions() {
    try {
      await this.apiService.terminateAllSessions();
      this.showNotification('Tüm oturumlar başarıyla sonlandırıldı!', 'success');
      this.loadSecurityData(); // Refresh data
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      this.showNotification('Oturumlar sonlandırılırken hata oluştu!', 'error');
    }
  }

  async blockIP(ip, reason = 'Suspicious activity') {
    try {
      await this.apiService.blockIP(ip, reason);
      this.showNotification(`IP adresi ${ip} başarıyla engellendi!`, 'success');
      this.loadSecurityData(); // Refresh data
    } catch (error) {
      console.error('Error blocking IP:', error);
      this.showNotification('IP engellenirken hata oluştu!', 'error');
    }
  }

  async clearFailedLogins() {
    try {
      await this.apiService.clearFailedLogins();
      this.showNotification('Hatalı giriş logları başarıyla temizlendi!', 'success');
      this.loadSecurityData(); // Refresh data
    } catch (error) {
      console.error('Error clearing failed logins:', error);
      this.showNotification('Loglar temizlenirken hata oluştu!', 'error');
    }
  }
}

// ====== Homepage Editor ======
class HomepageEditor {
  constructor(apiService) {
    this.apiService = apiService;
    this.siteConfig = null;
    this.currentPreview = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSiteConfig();
  }

  bindEvents() {
    // Edit homepage button
    $('#editHomepageBtn')?.addEventListener('click', () => {
      this.openEditor();
    });

    // Form submission
    $('#homepageEditorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveChanges();
    });

    // Save as draft button
    $('#saveAsDraft')?.addEventListener('click', () => {
      this.saveAsDraft();
    });

    // Refresh preview button
    $('#refreshPreview')?.addEventListener('click', () => {
      this.updateLivePreview();
    });

    // Form field changes for live preview
    const formFields = [
      'heroName', 'heroAvatar', 'heroHeadline', 'heroBio',
      'linkEmail', 'linkGithub', 'linkLinkedin', 'linkTwitter', 'linkYoutube',
      'siteTitle', 'siteDescription', 'siteUrl', 'siteLanguage'
    ];

    formFields.forEach(fieldId => {
      $(`#${fieldId}`)?.addEventListener('input', () => {
        this.updateLivePreview();
      });
    });

    // Modal close
    $('#homepageEditorModal .modal-close')?.addEventListener('click', () => {
      this.closeEditor();
    });

    $('#homepageEditorModal .modal-cancel')?.addEventListener('click', () => {
      this.closeEditor();
    });

    // Account settings button
    $('#editAccountBtn')?.addEventListener('click', () => {
      this.openAccountSettings();
    });

    // Account settings form submission
    $('#accountSettingsForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveAccountSettings();
    });

    // Account settings modal close
    $('#accountSettingsModal .modal-close')?.addEventListener('click', () => {
      this.closeAccountSettings();
    });

    $('#accountSettingsModal .modal-cancel')?.addEventListener('click', () => {
      this.closeAccountSettings();
    });

    // ====== Theme Editor Event Listeners ======
    
    // Edit theme button
    $('#editThemeBtn')?.addEventListener('click', () => {
      this.openThemeEditor();
    });

    // Theme editor form submission
    $('#themeEditorForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTheme();
    });

    // Reset theme button
    $('#resetTheme')?.addEventListener('click', () => {
      this.resetTheme();
    });

    // Theme preview toggle
    $('#previewLightTheme')?.addEventListener('click', () => {
      this.setPreviewTheme('light');
    });

    $('#previewDarkTheme')?.addEventListener('click', () => {
      this.setPreviewTheme('dark');
    });

    // Theme editor modal close
    $('#themeEditorModal .modal-close')?.addEventListener('click', () => {
      this.closeThemeEditor();
    });

    $('#themeEditorModal .modal-cancel')?.addEventListener('click', () => {
      this.closeThemeEditor();
    });

    // Color input changes for live preview
    const colorInputs = [
      'lightBg', 'lightPanel', 'lightInk', 'lightMuted', 'lightLine', 'lightAccent',
      'darkBg', 'darkPanel', 'darkInk', 'darkMuted', 'darkLine', 'darkAccent'
    ];

    colorInputs.forEach(inputId => {
      $(`#${inputId}`)?.addEventListener('input', () => {
        this.updateThemePreview();
        this.updateColorText(inputId);
      });
    });

    // Range input changes
    $('#borderRadius')?.addEventListener('input', (e) => {
      this.updateRangeValue('borderRadius', e.target.value, 'px');
      this.updateThemePreview();
    });

    $('#shadowIntensity')?.addEventListener('input', (e) => {
      this.updateRangeValue('shadowIntensity', e.target.value, '%');
      this.updateThemePreview();
    });

    // Font family change
    $('#fontFamily')?.addEventListener('change', () => {
      this.updateThemePreview();
    });

    // ====== Security & Sessions Event Listeners ======
    
    // Refresh security data buttons
    $('#refreshSessionsBtn')?.addEventListener('click', () => {
      this.loadSecurityData();
    });

    $('#refreshLoginHistoryBtn')?.addEventListener('click', () => {
      this.loadSecurityData();
    });

    $('#refreshFailedLoginsBtn')?.addEventListener('click', () => {
      this.loadSecurityData();
    });

    $('#refreshIPAnalysisBtn')?.addEventListener('click', () => {
      this.loadSecurityData();
    });

    // Terminate all sessions
    $('#terminateAllSessionsBtn')?.addEventListener('click', () => {
      this.terminateAllSessions();
    });

    // Clear failed logins
    $('#clearFailedLoginsBtn')?.addEventListener('click', () => {
      this.clearFailedLogins();
    });
  }

  async loadSiteConfig() {
    try {
      // Check if user is authenticated
      if (!this.apiService.token) {
        console.error('No authentication token found');
        this.showNotification('Lütfen önce giriş yapın!', 'error');
        return;
      }

      this.siteConfig = await this.apiService.getSiteConfig();
      this.renderHomepagePreview();
    } catch (error) {
      console.error('Error loading site config:', error);
      
      if (error.message.includes('401') || error.message.includes('403')) {
        this.showNotification('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın!', 'error');
        // Redirect to login
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        this.showNotification('Site ayarları yüklenirken hata oluştu!', 'error');
      }
    }
  }

  async loadUserInfo() {
    try {
      const response = await this.apiService.request('/user/info', 'GET');
      this.updateAccountInfo(response);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  }

  updateAccountInfo(userInfo) {
    console.log('Updating account info:', userInfo);
    
    // Daha spesifik selector'lar kullanarak elementleri bulalım
    const accountInfo = document.querySelector('.account-info');
    if (!accountInfo) {
      console.error('Account info element not found');
      return;
    }
    
    const infoItems = accountInfo.querySelectorAll('.info-item');
    console.log('Found info items:', infoItems.length);
    
    if (infoItems.length >= 2) {
      // Kullanıcı adı
      const usernameValue = infoItems[0].querySelector('.info-value');
      if (usernameValue) {
        usernameValue.textContent = userInfo.username;
        console.log('Updated username to:', userInfo.username);
      }
      
      // Son güncelleme tarihi
      const lastUpdatedValue = infoItems[1].querySelector('.info-value');
      if (lastUpdatedValue) {
        if (userInfo.lastUpdated) {
          const date = new Date(userInfo.lastUpdated);
          const formattedDate = date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          lastUpdatedValue.textContent = formattedDate;
          console.log('Updated last updated to:', formattedDate);
        } else {
          lastUpdatedValue.textContent = 'Hiç güncellenmedi';
          console.log('Set last updated to: Hiç güncellenmedi');
        }
      }
    }
  }

  renderHomepagePreview() {
    if (!this.siteConfig) return;

    const preview = $('#homepagePreview');
    if (!preview) return;

    // Mevcut tema renklerini al
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    const currentTheme = {
      bg: computedStyle.getPropertyValue('--bg').trim(),
      panel: computedStyle.getPropertyValue('--panel').trim(),
      ink: computedStyle.getPropertyValue('--ink').trim(),
      muted: computedStyle.getPropertyValue('--muted').trim(),
      line: computedStyle.getPropertyValue('--line').trim(),
      accent: computedStyle.getPropertyValue('--accent').trim(),
      radius: computedStyle.getPropertyValue('--radius').trim(),
      shadow: computedStyle.getPropertyValue('--shadow').trim()
    };

    preview.innerHTML = `
      <div class="hero-preview">
        <div class="hero-preview-content" style="
          background: ${currentTheme.bg};
          color: ${currentTheme.ink};
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.65;
          padding: 1rem;
        ">
          <div style="
            display: grid;
            gap: 1rem;
            grid-template-columns: 1fr 1.5fr;
            align-items: center;
            height: 100%;
          ">
            <img src="../${this.siteConfig.hero.avatar}" alt="Portre Fotoğraf" 
                 style="
                   width: 100%;
                   max-width: 120px;
                   aspect-ratio: 4/5;
                   object-fit: cover;
                   border-radius: ${currentTheme.radius};
                   border: 1px solid ${currentTheme.line};
                   background: #ddd;
                   box-shadow: ${currentTheme.shadow};
                 "
                 onerror="this.style.visibility='hidden'">
            <div>
              <div style="
                color: ${currentTheme.accent};
                font-weight: 600;
                font-family: 'Montserrat', sans-serif;
                font-size: 0.9rem;
                margin-bottom: 0.3rem;
              ">Merhaba, ben <strong>${this.escapeHtml(this.siteConfig.hero.name)}</strong></div>
              <h1 style="
                font-size: 1.2rem;
                line-height: 1.2;
                margin: 0 0 0.3rem;
                color: ${currentTheme.ink};
              ">${this.escapeHtml(this.siteConfig.hero.headline)}</h1>
              <p style="
                font-size: 0.8rem;
                color: ${currentTheme.muted};
                margin: 0 0 0.5rem;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              ">${this.escapeHtml(this.siteConfig.hero.bio)}</p>
              <div style="
                display: flex;
                gap: 0.3rem;
                flex-wrap: wrap;
              ">
                <a href="#blog" style="
                  background: ${currentTheme.accent};
                  color: white;
                  padding: 0.3rem 0.6rem;
                  border-radius: ${currentTheme.radius};
                  text-decoration: none;
                  font-weight: 500;
                  border: none;
                  font-size: 0.7rem;
                ">Blog'a göz at</a>
                ${this.siteConfig.social?.email ? `<a href="mailto:${this.siteConfig.social.email}" style="
                  background: transparent;
                  color: ${currentTheme.ink};
                  padding: 0.3rem 0.6rem;
                  border-radius: ${currentTheme.radius};
                  text-decoration: none;
                  font-weight: 500;
                  border: 1px solid ${currentTheme.line};
                  font-size: 0.7rem;
                ">E‑posta</a>` : ""}
                ${this.siteConfig.social?.linkedin ? `<a target="_blank" href="${this.siteConfig.social.linkedin}" style="
                  background: transparent;
                  color: ${currentTheme.ink};
                  padding: 0.3rem 0.6rem;
                  border-radius: ${currentTheme.radius};
                  text-decoration: none;
                  font-weight: 500;
                  border: 1px solid ${currentTheme.line};
                  font-size: 0.7rem;
                ">LinkedIn</a>` : ""}
                ${this.siteConfig.social?.github ? `<a target="_blank" href="${this.siteConfig.social.github}" style="
                  background: transparent;
                  color: ${currentTheme.ink};
                  padding: 0.3rem 0.6rem;
                  border-radius: ${currentTheme.radius};
                  text-decoration: none;
                  font-weight: 500;
                  border: 1px solid ${currentTheme.line};
                  font-size: 0.7rem;
                ">GitHub</a>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }



  openEditor() {
    // Check if user is authenticated
    if (!this.apiService.token) {
      this.showNotification('Lütfen önce giriş yapın!', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }

    if (!this.siteConfig) {
      this.showNotification('Site ayarları yüklenemedi! Lütfen sayfayı yenileyin.', 'error');
      return;
    }

    this.populateForm();
    this.updateLivePreview();
    this.showModal('homepageEditorModal');
  }

  populateForm() {
    // Hero section
    $('#heroName').value = this.siteConfig.hero.name || '';
    $('#heroAvatar').value = this.siteConfig.hero.avatar || '';
    $('#heroHeadline').value = this.siteConfig.hero.headline || '';
    $('#heroBio').value = this.siteConfig.hero.bio || '';

    // Social links section
    $('#linkEmail').value = this.siteConfig.social?.email || '';
    $('#linkGithub').value = this.siteConfig.social?.github || '';
    $('#linkLinkedin').value = this.siteConfig.social?.linkedin || '';
    $('#linkTwitter').value = this.siteConfig.social?.twitter || '';
    $('#linkYoutube').value = this.siteConfig.social?.youtube || '';

    // Site section
    $('#siteTitle').value = this.siteConfig.site.title || '';
    $('#siteDescription').value = this.siteConfig.site.description || '';
    $('#siteUrl').value = this.siteConfig.site.url || '';
    $('#siteLanguage').value = this.siteConfig.site.language || 'tr';
  }

  updateLivePreview() {
    const preview = $('#livePreview');
    if (!preview) return;

    const formData = this.getFormData();
    
    // Mevcut tema renklerini al
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    const currentTheme = {
      bg: computedStyle.getPropertyValue('--bg').trim(),
      panel: computedStyle.getPropertyValue('--panel').trim(),
      ink: computedStyle.getPropertyValue('--ink').trim(),
      muted: computedStyle.getPropertyValue('--muted').trim(),
      line: computedStyle.getPropertyValue('--line').trim(),
      accent: computedStyle.getPropertyValue('--accent').trim(),
      radius: computedStyle.getPropertyValue('--radius').trim(),
      shadow: computedStyle.getPropertyValue('--shadow').trim()
    };
    
    // Basit 16:9 ekran önizlemesi
    preview.innerHTML = `
      <div class="hero-preview">
        <div class="hero-preview-content" style="
          background: ${currentTheme.bg};
          color: ${currentTheme.ink};
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.65;
          padding: 1rem;
        ">
          <div style="
            display: grid;
            gap: 1rem;
            grid-template-columns: 1fr 1.5fr;
            align-items: center;
            height: 100%;
          ">
            <img src="../${formData.hero.avatar}" alt="Portre Fotoğraf" 
                 style="
                   width: 100%;
                   max-width: 120px;
                   aspect-ratio: 4/5;
                   object-fit: cover;
                   border-radius: ${currentTheme.radius};
                   border: 1px solid ${currentTheme.line};
                   background: #ddd;
                   box-shadow: ${currentTheme.shadow};
                 "
                 onerror="this.style.visibility='hidden'">
            <div>
              <div style="
                color: ${currentTheme.accent};
                font-weight: 600;
                font-family: 'Montserrat', sans-serif;
                font-size: 0.9rem;
                margin-bottom: 0.3rem;
              ">Merhaba, ben <strong>${this.escapeHtml(formData.hero.name)}</strong></div>
              <h1 style="
                font-size: 1.2rem;
                line-height: 1.2;
                margin: 0 0 0.3rem;
                color: ${currentTheme.ink};
              ">${this.escapeHtml(formData.hero.headline)}</h1>
              <p style="
                font-size: 0.8rem;
                color: ${currentTheme.muted};
                margin: 0 0 0.5rem;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              ">${this.escapeHtml(formData.hero.bio)}</p>
              <div style="
                display: flex;
                gap: 0.3rem;
                flex-wrap: wrap;
              ">
                <a href="#blog" style="
                  background: ${currentTheme.accent};
                  color: white;
                  padding: 0.3rem 0.6rem;
                  border-radius: ${currentTheme.radius};
                  text-decoration: none;
                  font-weight: 500;
                  border: none;
                  font-size: 0.7rem;
                ">Blog'a göz at</a>
                ${formData.social?.email ? `<a href="mailto:${formData.social.email}" style="
                  background: transparent;
                  color: ${currentTheme.ink};
                  padding: 0.3rem 0.6rem;
                  border-radius: ${currentTheme.radius};
                  text-decoration: none;
                  font-weight: 500;
                  border: 1px solid ${currentTheme.line};
                  font-size: 0.7rem;
                ">E‑posta</a>` : ""}
                ${formData.social?.linkedin ? `<a target="_blank" href="${formData.social.linkedin}" style="
                  background: transparent;
                  color: ${currentTheme.ink};
                  padding: 0.3rem 0.6rem;
                  border-radius: ${currentTheme.radius};
                  text-decoration: none;
                  font-weight: 500;
                  border: 1px solid ${currentTheme.line};
                  font-size: 0.7rem;
                ">LinkedIn</a>` : ""}
                ${formData.social?.github ? `<a target="_blank" href="${formData.social.github}" style="
                  background: transparent;
                  color: ${currentTheme.ink};
                  padding: 0.3rem 0.6rem;
                  border-radius: ${currentTheme.radius};
                  text-decoration: none;
                  font-weight: 500;
                  border: 1px solid ${currentTheme.line};
                  font-size: 0.7rem;
                ">GitHub</a>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }



  getFormData() {
    return {
      hero: {
        name: $('#heroName').value || '',
        avatar: $('#heroAvatar').value || '',
        headline: $('#heroHeadline').value || '',
        bio: $('#heroBio').value || ''
      },
      social: {
        email: $('#linkEmail').value || '',
        github: $('#linkGithub').value || '',
        linkedin: $('#linkLinkedin').value || '',
        twitter: $('#linkTwitter').value || '',
        youtube: $('#linkYoutube').value || ''
      },
      site: {
        title: $('#siteTitle').value || '',
        description: $('#siteDescription').value || '',
        url: $('#siteUrl').value || '',
        language: $('#siteLanguage').value || 'tr'
      }
    };
  }

  async saveChanges() {
    try {
      const formData = this.getFormData();
      
      // Validate required fields
      if (!formData.hero.name || !formData.hero.headline || !formData.hero.bio) {
        this.showNotification('Lütfen tüm zorunlu alanları doldurun!', 'error');
        return;
      }

      // Update site config
      const updatedConfig = {
        ...this.siteConfig,
        hero: formData.hero,
        social: formData.social,
        site: formData.site
      };

      await this.apiService.updateSiteConfig(updatedConfig);
      
      // Update local config
      this.siteConfig = updatedConfig;
      
      this.showNotification('Ana ekran başarıyla güncellendi!', 'success');
      this.closeEditor();
      this.renderHomepagePreview();
      
    } catch (error) {
      console.error('Error saving site config:', error);
      this.showNotification('Değişiklikler kaydedilirken hata oluştu!', 'error');
    }
  }

  async saveAsDraft() {
    try {
      const formData = this.getFormData();
      
      // Save to localStorage as draft
      localStorage.setItem('homepage_draft', JSON.stringify(formData));
      
      this.showNotification('Taslak kaydedildi!', 'success');
      
    } catch (error) {
      console.error('Error saving draft:', error);
      this.showNotification('Taslak kaydedilirken hata oluştu!', 'error');
    }
  }

  closeEditor() {
    this.hideModal('homepageEditorModal');
  }

  showModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  hideModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (window.blogManager && window.blogManager.showNotification) {
      window.blogManager.showNotification(message, type);
    } else {
      alert(message);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Account Settings Methods
  openAccountSettings() {
    // Check if user is authenticated
    if (!this.apiService.token) {
      this.showNotification('Lütfen önce giriş yapın!', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }

    this.showModal('accountSettingsModal');
  }

  async saveAccountSettings() {
    try {
      const newUsername = $('#newUsername').value.trim();
      const currentPassword = $('#currentPassword').value;
      const newPassword = $('#newPassword').value;
      const confirmPassword = $('#confirmPassword').value;

      // Validation
      if (!newUsername || newUsername.length < 3) {
        this.showNotification('Kullanıcı adı en az 3 karakter olmalıdır!', 'error');
        return;
      }

      if (!currentPassword) {
        this.showNotification('Mevcut şifrenizi girmelisiniz!', 'error');
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        this.showNotification('Yeni şifre en az 6 karakter olmalıdır!', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        this.showNotification('Yeni şifreler eşleşmiyor!', 'error');
        return;
      }

      // Send update request
      const response = await fetch('/api/account/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiService.token}`
        },
        body: JSON.stringify({
          newUsername,
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Hesap güncellenirken hata oluştu');
      }

      this.showNotification('Hesap ayarları başarıyla güncellendi! Yeni bilgilerle giriş yapmanız gerekiyor.', 'success');
      this.closeAccountSettings();
      
      // Clear form
      $('#newUsername').value = '';
      $('#currentPassword').value = '';
      $('#newPassword').value = '';
      $('#confirmPassword').value = '';
      
      // 3 saniye sonra logout yap ve login sayfasına yönlendir
      setTimeout(() => {
        localStorage.removeItem('admin_token');
        window.location.href = 'login.html';
      }, 3000);

    } catch (error) {
      console.error('Error saving account settings:', error);
      this.showNotification(error.message || 'Hesap ayarları kaydedilirken hata oluştu!', 'error');
    }
  }

  closeAccountSettings() {
    this.hideModal('accountSettingsModal');
  }

  // ====== Security & Sessions Management ======
  
  async loadSecurityData() {
    try {
      const securityData = await this.apiService.getSecurityData();
      this.renderSecurityData(securityData);
    } catch (error) {
      console.error('Error loading security data:', error);
      this.showNotification('Güvenlik verileri yüklenirken hata oluştu!', 'error');
    }
  }

  // Gallery functionality is handled by GalleryManager class

  renderSecurityData(data) {
    this.renderActiveSessions(data.activeSessions);
    this.renderLoginHistory(data.loginHistory);
    this.renderFailedLogins(data.failedLogins);
    this.renderIPAnalysis(data.ipAnalysis);
  }

  renderActiveSessions(sessions) {
    const container = $('#activeSessionsList');
    
    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<p class="muted">Aktif oturum bulunamadı</p>';
      return;
    }

    const sessionsHTML = sessions.map(session => {
      const loginTime = new Date(session.loginTime).toLocaleString('tr-TR');
      const lastActivity = new Date(session.lastActivity).toLocaleString('tr-TR');
      
      return `
        <div class="session-item">
          <div class="session-info">
            <div class="session-user">
              <span class="user-badge">👤 ${session.username}</span>
              <span class="session-status active">🟢 Aktif</span>
            </div>
            <div class="session-details">
              <div class="detail-item">
                <span class="detail-label">IP:</span>
                <span class="detail-value">${session.ip}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Giriş:</span>
                <span class="detail-value">${loginTime}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Son Aktivite:</span>
                <span class="detail-value">${lastActivity}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarayıcı:</span>
                <span class="detail-value">${this.getBrowserInfo(session.userAgent)}</span>
              </div>
            </div>
          </div>
          <div class="session-actions">
            <button class="btn btn-danger btn-sm" onclick="blogManager.terminateSession('${session.id}')">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Sonlandır
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = sessionsHTML;
  }

  renderLoginHistory(history) {
    const container = $('#loginHistoryList');
    
    if (!history || history.length === 0) {
      container.innerHTML = '<p class="muted">Giriş geçmişi bulunamadı</p>';
      return;
    }

    const historyHTML = history.map(login => {
      const timestamp = new Date(login.timestamp).toLocaleString('tr-TR');
      
      return `
        <div class="login-history-item">
          <div class="login-info">
            <div class="login-user">
              <span class="user-badge">👤 ${login.username}</span>
              <span class="login-status success">✅ Başarılı</span>
            </div>
            <div class="login-details">
              <div class="detail-item">
                <span class="detail-label">IP:</span>
                <span class="detail-value">${login.ip}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarih:</span>
                <span class="detail-value">${timestamp}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarayıcı:</span>
                <span class="detail-value">${this.getBrowserInfo(login.userAgent)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = historyHTML;
  }

  renderFailedLogins(failedLogins) {
    const container = $('#failedLoginsList');
    
    if (!failedLogins || failedLogins.length === 0) {
      container.innerHTML = '<p class="muted">Hatalı giriş denemesi bulunamadı</p>';
      return;
    }

    const failedLoginsHTML = failedLogins.map(login => {
      const timestamp = new Date(login.timestamp).toLocaleString('tr-TR');
      
      return `
        <div class="failed-login-item">
          <div class="failed-login-info">
            <div class="failed-login-user">
              <span class="user-badge">👤 ${login.username}</span>
              <span class="failed-login-status error">❌ Başarısız</span>
            </div>
            <div class="failed-login-details">
              <div class="detail-item">
                <span class="detail-label">IP:</span>
                <span class="detail-value">${login.ip}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarih:</span>
                <span class="detail-value">${timestamp}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Sebep:</span>
                <span class="detail-value">${login.reason}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tarayıcı:</span>
                <span class="detail-value">${this.getBrowserInfo(login.userAgent)}</span>
              </div>
            </div>
          </div>
          <div class="failed-login-actions">
            <button class="btn btn-danger btn-sm" onclick="blogManager.blockIP('${login.ip}')">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              IP'yi Engelle
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = failedLoginsHTML;
  }

  renderIPAnalysis(ipAnalysis) {
    const container = $('#ipAnalysisList');
    
    if (!ipAnalysis || ipAnalysis.length === 0) {
      container.innerHTML = '<p class="muted">IP analizi bulunamadı</p>';
      return;
    }

    const analysisHTML = ipAnalysis.map(analysis => {
      const lastAttempt = new Date(analysis.lastAttempt).toLocaleString('tr-TR');
      const riskLevel = analysis.failedAttempts > 10 ? 'high' : analysis.failedAttempts > 5 ? 'medium' : 'low';
      
      return `
        <div class="ip-analysis-item">
          <div class="ip-analysis-info">
            <div class="ip-header">
              <span class="ip-address">🌐 ${analysis.ip}</span>
              <span class="risk-level ${riskLevel}">
                ${riskLevel === 'high' ? '🔴 Yüksek Risk' : riskLevel === 'medium' ? '🟡 Orta Risk' : '🟢 Düşük Risk'}
              </span>
            </div>
            <div class="ip-details">
              <div class="detail-item">
                <span class="detail-label">Başarısız Deneme:</span>
                <span class="detail-value">${analysis.failedAttempts}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Son Deneme:</span>
                <span class="detail-value">${lastAttempt}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Denenen Kullanıcılar:</span>
                <span class="detail-value">${analysis.usernames.join(', ')}</span>
              </div>
            </div>
          </div>
          <div class="ip-analysis-actions">
            <button class="btn btn-danger btn-sm" onclick="blogManager.blockIP('${analysis.ip}')">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              IP'yi Engelle
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = analysisHTML;
  }

  getBrowserInfo(userAgent) {
    if (!userAgent || userAgent === 'Unknown') return 'Bilinmeyen';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Diğer';
  }

  async terminateSession(sessionId) {
    try {
      await this.apiService.terminateSession(sessionId);
      this.showNotification('Oturum başarıyla sonlandırıldı!', 'success');
      this.loadSecurityData(); // Refresh data
    } catch (error) {
      console.error('Error terminating session:', error);
      this.showNotification('Oturum sonlandırılırken hata oluştu!', 'error');
    }
  }

  async terminateAllSessions() {
    if (!confirm('Tüm diğer oturumları sonlandırmak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await this.apiService.terminateAllSessions();
      this.showNotification('Tüm diğer oturumlar sonlandırıldı!', 'success');
      this.loadSecurityData(); // Refresh data
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      this.showNotification('Oturumlar sonlandırılırken hata oluştu!', 'error');
    }
  }

  async blockIP(ip) {
    const reason = prompt(`IP adresi ${ip} için engelleme sebebi:`);
    if (!reason) return;

    try {
      await this.apiService.blockIP(ip, reason);
      this.showNotification(`IP adresi ${ip} engellendi!`, 'success');
    } catch (error) {
      console.error('Error blocking IP:', error);
      this.showNotification('IP engellenirken hata oluştu!', 'error');
    }
  }

  async clearFailedLogins() {
    if (!confirm('Tüm hatalı giriş loglarını temizlemek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await this.apiService.clearFailedLogins();
      this.showNotification('Hatalı giriş logları temizlendi!', 'success');
      this.loadSecurityData(); // Refresh data
    } catch (error) {
      console.error('Error clearing failed logins:', error);
      this.showNotification('Loglar temizlenirken hata oluştu!', 'error');
    }
  }

  // ====== Theme Editor Methods ======
  
  async openThemeEditor() {
    modalManager.openModal('themeEditorModal');
    
    // Wait for modal to be fully rendered
    setTimeout(async () => {
      await this.loadCurrentTheme();
      this.updateThemePreview();
      
      // Ana ekran önizlemesini de güncelle
      this.renderHomepagePreview();
      
      // Set initial preview theme based on current theme
      const currentTheme = themeManager.getCurrentTheme();
      this.setPreviewTheme(currentTheme);
    }, 100);
  }

  closeThemeEditor() {
    modalManager.closeModal('themeEditorModal');
  }

  async loadCurrentTheme() {
    try {
      // First try to load from server
      const response = await fetch('/api/theme');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.theme) {
          const themeData = data.theme;
          console.log('Loading theme from server:', themeData);
          
          // Set form values from server theme
          $('#lightBg').value = themeData.light.bg;
          $('#lightPanel').value = themeData.light.panel;
          $('#lightInk').value = themeData.light.ink;
          $('#lightMuted').value = themeData.light.muted;
          $('#lightLine').value = themeData.light.line;
          // Force update color input by removing and re-adding value
          const lightAccentInput = $('#lightAccent');
          lightAccentInput.value = themeData.light.accent;
          
          // Force browser to update color picker display
          lightAccentInput.style.backgroundColor = themeData.light.accent;
          
          console.log('Setting lightAccent to:', themeData.light.accent);
          console.log('lightAccent input value:', lightAccentInput.value);
          console.log('lightAccent input element:', lightAccentInput);
          
          $('#darkBg').value = themeData.dark.bg;
          $('#darkPanel').value = themeData.dark.panel;
          $('#darkInk').value = themeData.dark.ink;
          $('#darkMuted').value = themeData.dark.muted;
          $('#darkLine').value = themeData.dark.line;
          // Force update dark accent color input
          const darkAccentInput = $('#darkAccent');
          darkAccentInput.value = themeData.dark.accent;
          darkAccentInput.style.backgroundColor = themeData.dark.accent;
          
          $('#borderRadius').value = themeData.borderRadius;
          $('#shadowIntensity').value = themeData.shadowIntensity;
          $('#fontFamily').value = themeData.fontFamily;
          
          this.updateAllColorTexts();
          this.updateRangeValue('borderRadius', themeData.borderRadius, 'px');
          this.updateRangeValue('shadowIntensity', themeData.shadowIntensity, '%');
          
          // Update theme preview after loading
          this.updateThemePreview();
          
          return;
        }
      }
    } catch (error) {
      console.error('Error loading theme from server:', error);
    }
    
    // Fallback to localStorage
    const savedTheme = localStorage.getItem('customTheme');
    if (savedTheme) {
      try {
        const themeData = JSON.parse(savedTheme);
        
        // Set form values from saved theme
        $('#lightBg').value = themeData.light.bg;
        $('#lightPanel').value = themeData.light.panel;
        $('#lightInk').value = themeData.light.ink;
        $('#lightMuted').value = themeData.light.muted;
        $('#lightLine').value = themeData.light.line;
        $('#lightAccent').value = themeData.light.accent;
        
        $('#darkBg').value = themeData.dark.bg;
        $('#darkPanel').value = themeData.dark.panel;
        $('#darkInk').value = themeData.dark.ink;
        $('#darkMuted').value = themeData.dark.muted;
        $('#darkLine').value = themeData.dark.line;
        $('#darkAccent').value = themeData.dark.accent;
        
        $('#borderRadius').value = themeData.borderRadius;
        $('#shadowIntensity').value = themeData.shadowIntensity;
        $('#fontFamily').value = themeData.fontFamily;
        
        this.updateAllColorTexts();
        this.updateRangeValue('borderRadius', themeData.borderRadius, 'px');
        this.updateRangeValue('shadowIntensity', themeData.shadowIntensity, '%');
        
        // Update theme preview after loading
        this.updateThemePreview();
        return;
      } catch (error) {
        console.error('Error loading saved theme:', error);
      }
    }
    
    // Load current theme values from CSS variables (fallback)
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    // Light theme colors
    $('#lightBg').value = this.rgbToHex(computedStyle.getPropertyValue('--bg').trim());
    $('#lightPanel').value = this.rgbToHex(computedStyle.getPropertyValue('--panel').trim());
    $('#lightInk').value = this.rgbToHex(computedStyle.getPropertyValue('--ink').trim());
    $('#lightMuted').value = this.rgbToHex(computedStyle.getPropertyValue('--muted').trim());
    $('#lightLine').value = this.rgbToHex(computedStyle.getPropertyValue('--line').trim());
    $('#lightAccent').value = this.rgbToHex(computedStyle.getPropertyValue('--accent').trim());
    
    // Dark theme colors - get from CSS variables or use defaults
    const darkBg = computedStyle.getPropertyValue('--dark-bg').trim() || '#0b0d0f';
    const darkPanel = computedStyle.getPropertyValue('--dark-panel').trim() || '#14171a';
    const darkInk = computedStyle.getPropertyValue('--dark-ink').trim() || '#e8edf2';
    const darkMuted = computedStyle.getPropertyValue('--dark-muted').trim() || '#9aa4b2';
    const darkLine = computedStyle.getPropertyValue('--dark-line').trim() || '#2a2f35';
    const darkAccent = computedStyle.getPropertyValue('--dark-accent').trim() || '#84CC16';
    
    $('#darkBg').value = this.rgbToHex(darkBg);
    $('#darkPanel').value = this.rgbToHex(darkPanel);
    $('#darkInk').value = this.rgbToHex(darkInk);
    $('#darkMuted').value = this.rgbToHex(darkMuted);
    $('#darkLine').value = this.rgbToHex(darkLine);
    $('#darkAccent').value = this.rgbToHex(darkAccent);
    
    // Update text inputs
    this.updateAllColorTexts();
    
    // Load other settings
    const borderRadius = computedStyle.getPropertyValue('--radius').trim();
    $('#borderRadius').value = parseInt(borderRadius) || 16;
    $('#borderRadiusValue').textContent = `${$('#borderRadius').value}px`;
    
    const shadowIntensity = 60; // Default value
    $('#shadowIntensity').value = shadowIntensity;
    $('#shadowIntensityValue').textContent = `${shadowIntensity}%`;
    
    // Font family
    $('#fontFamily').value = 'Inter'; // Default
    
    // Update theme preview after loading
    this.updateThemePreview();
  }

  updateColorText(inputId) {
    const colorInput = $(`#${inputId}`);
    const textInput = $(`#${inputId}Text`);
    if (colorInput && textInput) {
      textInput.value = colorInput.value.toUpperCase();
    }
  }

  updateAllColorTexts() {
    const colorInputs = [
      'lightBg', 'lightPanel', 'lightInk', 'lightMuted', 'lightLine', 'lightAccent',
      'darkBg', 'darkPanel', 'darkInk', 'darkMuted', 'darkLine', 'darkAccent'
    ];
    
    colorInputs.forEach(inputId => {
      this.updateColorText(inputId);
    });
  }

  updateRangeValue(rangeId, value, unit) {
    const valueElement = $(`#${rangeId}Value`);
    if (valueElement) {
      valueElement.textContent = `${value}${unit}`;
    }
  }

  setPreviewTheme(theme) {
    $('#previewLightTheme').classList.toggle('active', theme === 'light');
    $('#previewDarkTheme').classList.toggle('active', theme === 'dark');
    this.updateThemePreview();
    
    // Also update the actual page theme if in theme editor
    themeManager.setTheme(theme);
  }

  updateThemePreview() {
    const previewContainer = $('#themeLivePreview');
    if (!previewContainer) return;

    const lightTheme = {
      bg: $('#lightBg').value,
      panel: $('#lightPanel').value,
      ink: $('#lightInk').value,
      muted: $('#lightMuted').value,
      line: $('#lightLine').value,
      accent: $('#lightAccent').value
    };

    const darkTheme = {
      bg: $('#darkBg').value,
      panel: $('#darkPanel').value,
      ink: $('#darkInk').value,
      muted: $('#darkMuted').value,
      line: $('#darkLine').value,
      accent: $('#darkAccent').value
    };

    // Apply theme changes to the actual site in real-time
    const themeData = {
      light: lightTheme,
      dark: darkTheme,
      borderRadius: $('#borderRadius').value,
      shadowIntensity: $('#shadowIntensity').value,
      fontFamily: $('#fontFamily').value
    };
    
    // Apply the theme changes immediately (using global function from theme-manager.js)
    applyThemeVariables(themeData);
    
    // Update admin panel preview elements (using global function from admin.js)
    window.updateThemePreview(themeData);

    const borderRadius = $('#borderRadius').value;
    const shadowIntensity = $('#shadowIntensity').value;
    const fontFamily = $('#fontFamily').value;

    const isDarkPreview = $('#previewDarkTheme').classList.contains('active');
    const theme = isDarkPreview ? darkTheme : lightTheme;

    // Apply theme to preview container
    previewContainer.style.cssText = `
      --bg: ${theme.bg};
      --panel: ${theme.panel};
      --ink: ${theme.ink};
      --muted: ${theme.muted};
      --line: ${theme.line};
      --accent: ${theme.accent};
      --radius: ${borderRadius}px;
      --shadow: 0 10px 24px rgba(0,0,0,${shadowIntensity / 100 * 0.06});
      --shadow-lg: 0 20px 40px rgba(0,0,0,${shadowIntensity / 100 * 0.1});
      font-family: '${fontFamily}', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 1.5rem;
      height: 100%;
      overflow-y: auto;
    `;

    // Render preview content
    previewContainer.innerHTML = `
      <div class="theme-preview-card" style="background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.5rem; margin-bottom: 1rem; box-shadow: var(--shadow);">
        <div class="theme-preview-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--line);">
          <h3 class="theme-preview-title" style="font-size: 1.1rem; font-weight: 600; color: var(--ink); margin: 0;">Tema Önizlemesi</h3>
          <span style="color: var(--muted); font-size: 0.875rem;">${isDarkPreview ? '🌙 Koyu Tema' : '🌞 Açık Tema'}</span>
        </div>
        <p class="theme-preview-text" style="color: var(--muted); font-size: 0.9rem; line-height: 1.6;">
          Bu, sitenizin nasıl görüneceğinin canlı önizlemesidir. Renkleri, yazı tipini ve diğer stil ayarlarını değiştirerek 
          sonucu anında görebilirsiniz.
        </p>
        <button class="theme-preview-button" style="background: var(--accent); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: var(--radius); font-weight: 500; cursor: pointer; transition: all 0.2s ease; margin-top: 1rem;">Örnek Buton</button>
      </div>
      
      <div class="theme-preview-card" style="background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.5rem; margin-bottom: 1rem; box-shadow: var(--shadow);">
        <div class="theme-preview-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--line);">
          <h3 class="theme-preview-title" style="font-size: 1.1rem; font-weight: 600; color: var(--ink); margin: 0;">Renk Paleti</h3>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem;">
          <div style="background: var(--accent); height: 40px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">Vurgu</div>
          <div style="background: var(--panel); border: 1px solid var(--line); height: 40px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; color: var(--ink);">Panel</div>
          <div style="background: var(--muted); height: 40px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; color: white;">Soluk</div>
        </div>
      </div>
      
      <div class="theme-preview-card" style="background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 1.5rem; margin-bottom: 1rem; box-shadow: var(--shadow);">
        <div class="theme-preview-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--line);">
          <h3 class="theme-preview-title" style="font-size: 1.1rem; font-weight: 600; color: var(--ink); margin: 0;">Örnek İçerik</h3>
        </div>
        <div style="color: var(--ink); line-height: 1.6;">
          <h4 style="margin: 0 0 0.5rem 0; color: var(--ink);">Başlık Örneği</h4>
          <p style="color: var(--muted); margin: 0 0 1rem 0;">Bu bir paragraf örneğidir. Yazı tipi ve renkler tema ayarlarınıza göre değişir.</p>
          <div style="display: flex; gap: 0.5rem;">
            <button style="background: var(--accent); color: white; border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-size: 0.875rem;">Birincil</button>
            <button style="background: transparent; color: var(--ink); border: 1px solid var(--line); padding: 0.5rem 1rem; border-radius: var(--radius); font-size: 0.875rem;">İkincil</button>
          </div>
        </div>
      </div>
    `;
  }

  rgbToHex(rgb) {
    if (!rgb || rgb === 'none') return '#000000';
    
    // Handle rgb(r, g, b) format
    const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    // Handle hex format
    if (rgb.startsWith('#')) {
      return rgb;
    }
    
    return '#000000';
  }

  async saveTheme() {
    try {
      const themeData = {
        light: {
          bg: $('#lightBg').value,
          panel: $('#lightPanel').value,
          ink: $('#lightInk').value,
          muted: $('#lightMuted').value,
          line: $('#lightLine').value,
          accent: $('#lightAccent').value
        },
        dark: {
          bg: $('#darkBg').value,
          panel: $('#darkPanel').value,
          ink: $('#darkInk').value,
          muted: $('#darkMuted').value,
          line: $('#darkLine').value,
          accent: $('#darkAccent').value
        },
        borderRadius: $('#borderRadius').value,
        shadowIntensity: $('#shadowIntensity').value,
        fontFamily: $('#fontFamily').value
      };

      // Save theme to server (admin-specific function)
      await saveCustomThemeToServer(themeData);
      
      // Ana ekran önizlemesini güncelle
      this.renderHomepagePreview();
      
      // Tema önizleme kısmını da güncelle (global fonksiyon)
      const currentThemeData = await this.getCurrentThemeData();
      if (currentThemeData) {
        updateThemePreview(currentThemeData);
      }
      
      this.showNotification('Tema başarıyla kaydedildi!', 'success');
      this.closeThemeEditor();
    } catch (error) {
      console.error('Error saving theme:', error);
      this.showNotification('Tema kaydedilirken hata oluştu!', 'error');
    }
  }

  // applyTheme function removed - now using ThemeManager

  async getCurrentThemeData() {
    try {
      const response = await fetch('/api/theme');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.theme) {
          return data.theme;
        }
      }
    } catch (error) {
      console.error('Error getting current theme data:', error);
    }
    return null;
  }

  async resetTheme() {
    if (!confirm('Temayı varsayılan ayarlara döndürmek istediğinizden emin misiniz?')) {
      return;
    }

    // Reset theme to defaults (admin-specific function)
    await resetThemeToDefaults();
    
    // Reset form values to defaults
    $('#lightBg').value = '#f8f8f6';
    $('#lightPanel').value = '#fafaf8';
    $('#lightInk').value = '#0b0b0b';
    $('#lightMuted').value = '#6b7280';
    $('#lightLine').value = '#e5e7eb';
    $('#lightAccent').value = '#84CC16';
    
    $('#darkBg').value = '#0b0d0f';
    $('#darkPanel').value = '#14171a';
    $('#darkInk').value = '#e8edf2';
    $('#darkMuted').value = '#9aa4b2';
    $('#darkLine').value = '#2a2f35';
    $('#darkAccent').value = '#84CC16';
    
    $('#borderRadius').value = 16;
    $('#shadowIntensity').value = 60;
    $('#fontFamily').value = 'Inter';
    
    this.updateAllColorTexts();
    this.updateRangeValue('borderRadius', 16, 'px');
    this.updateRangeValue('shadowIntensity', 60, '%');
    this.updateThemePreview();
    
    this.showNotification('Tema varsayılan ayarlara döndürüldü!', 'success');
  }
}

// ====== Initialize ======
let modalManager;
let blogManager;
let homepageEditor;

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first
  const token = localStorage.getItem('admin_token');
  if (!token) {
    console.log('No authentication token found, redirecting to login');
    window.location.href = 'login.html';
    return;
  }

  // Initialize theme manager first
  themeManager = new ThemeManager();
  
  modalManager = new ModalManager();
  blogManager = new BlogManager();
  homepageEditor = new HomepageEditor(blogManager.apiService);
  
  // Load and display current theme preview
  try {
    const currentTheme = await loadCustomTheme();
    if (currentTheme) {
      updateThemePreview(currentTheme);
    }
  } catch (error) {
    console.log('Could not load theme preview:', error);
  }
  
  // Set the reference between BlogManager and HomepageEditor
  blogManager.setHomepageEditor(homepageEditor);
  
  // Make blogManager globally available for notifications
  window.blogManager = blogManager;
  
  // Initialize blog manager after homepageEditor is created
  await blogManager.init();
  
  // Set gallery manager reference in blog manager
  if (galleryManager) {
    blogManager.setGalleryManager(galleryManager);
  }
});

// ====== Markdown Editor Functions ======
function formatText(type) {
  // Get the active editor (new post or edit post)
  let editor = document.getElementById('markdownEditor');
  if (!editor || !editor.contains(document.activeElement)) {
    editor = document.getElementById('editMarkdownEditor');
  }
  
  if (!editor) return;
  
  const selection = window.getSelection();
  
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  
  if (!selectedText && type !== 'list' && type !== 'orderedList' && type !== 'taskList' && type !== 'code' && type !== 'horizontalRule' && type !== 'table') {
    // If no text selected, insert placeholder
    let placeholder = '';
    switch(type) {
      case 'bold': placeholder = '**kalın metin**'; break;
      case 'italic': placeholder = '*italik metin*'; break;
      case 'h1': placeholder = '# Başlık 1'; break;
      case 'h2': placeholder = '## Başlık 2'; break;
      case 'h3': placeholder = '### Başlık 3'; break;
      case 'link': placeholder = '[link metni](URL)'; break;
      case 'image': placeholder = '![resim açıklaması](resim-url)'; break;
      case 'code': placeholder = '```\nkod bloğu\n```'; break;
      case 'list': placeholder = '- liste öğesi'; break;
      case 'blockquote': placeholder = '> alıntı metni'; break;
    }
    
    const textNode = document.createTextNode(placeholder);
    range.insertNode(textNode);
    range.selectNodeContents(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    return;
  }
  
  switch(type) {
    case 'bold':
      insertMarkdown(editor, '**', '**', selectedText);
      break;
    case 'italic':
      insertMarkdown(editor, '*', '*', selectedText);
      break;
    case 'h1':
      insertMarkdown(editor, '# ', '', selectedText);
      break;
    case 'h2':
      insertMarkdown(editor, '## ', '', selectedText);
      break;
    case 'h3':
      insertMarkdown(editor, '### ', '', selectedText);
      break;
    case 'link':
      const url = prompt('Link URL\'sini girin:');
      if (url) {
        insertMarkdown(editor, '[', `](${url})`, selectedText);
      }
      break;
    case 'image':
      const imgUrl = prompt('Resim URL\'sini girin:');
      if (imgUrl) {
        insertMarkdown(editor, '![', `](${imgUrl})`, selectedText);
      }
      break;
    case 'code':
      insertMarkdown(editor, '```\n', '\n```', selectedText);
      break;
    case 'list':
      insertMarkdown(editor, '- ', '', selectedText);
      break;
    case 'blockquote':
      insertMarkdown(editor, '> ', '', selectedText);
      break;
  }
}

function insertMarkdown(editor, before, after, selectedText) {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  
  const markdownText = before + selectedText + after;
  const textNode = document.createTextNode(markdownText);
  
  range.deleteContents();
  range.insertNode(textNode);
  
  // Update hidden textarea
  updateHiddenTextarea(editor);
}

function updateHiddenTextarea(editor) {
  const editorId = editor.id;
  const textareaId = editorId === 'markdownEditor' ? 'postContent' : 'editPostContent';
  const textarea = document.getElementById(textareaId);
  
  if (textarea) {
    textarea.value = editor.innerText;
  }
}

// Initialize markdown editors
function initMarkdownEditors() {
  const newEditor = document.getElementById('markdownEditor');
  const editEditor = document.getElementById('editMarkdownEditor');
  
  if (newEditor) {
    newEditor.addEventListener('input', () => updateHiddenTextarea(newEditor));
    newEditor.addEventListener('blur', () => updateHiddenTextarea(newEditor));
  }
  
  if (editEditor) {
    editEditor.addEventListener('input', () => updateHiddenTextarea(editEditor));
    editEditor.addEventListener('blur', () => updateHiddenTextarea(editEditor));
  }
}

// Call initMarkdownEditors when modals are opened
document.addEventListener('DOMContentLoaded', () => {
  // Initialize markdown editors for existing modals
  initMarkdownEditors();
  
  // Watch for modal openings
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList && node.classList.contains('modal')) {
          setTimeout(initMarkdownEditors, 100);
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

// ====== Gallery Management System ======
class GalleryManager {
  constructor() {
    this.currentFolder = 'all';
    this.uploadedFiles = [];
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadGallery();
  }

  bindEvents() {
    // Gallery folder filter
    const folderSelect = document.getElementById('galleryFolder');
    if (folderSelect) {
      folderSelect.addEventListener('change', (e) => {
        this.currentFolder = e.target.value;
        this.filterGallery();
      });
    }

    // Upload to gallery button
    const uploadBtn = document.getElementById('uploadToGalleryBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        this.showUploadArea();
      });
    }

    // File input change
    const fileInput = document.getElementById('galleryFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelection(e.target.files);
      });
    }

    // Start upload button
    const startUploadBtn = document.getElementById('startUploadBtn');
    if (startUploadBtn) {
      startUploadBtn.addEventListener('click', () => {
        this.startUpload();
      });
    }

    // Drag and drop events
    this.initDragAndDrop();
  }

  initDragAndDrop() {
    const uploadZone = document.getElementById('uploadZone');
    if (!uploadZone) return;

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      this.handleFileSelection(files);
    });

    uploadZone.addEventListener('click', () => {
      document.getElementById('galleryFileInput').click();
    });
  }

  async loadGallery() {
    try {
      // Load images from each folder
      await Promise.all([
        this.loadFolderImages('system', 'systemImages'),
        this.loadFolderImages('profile', 'profileImages'),
        this.loadFolderImages('blog-covers', 'blogCoversImages'),
        this.loadFolderImages('blog-content', 'blogContentImages'),
        this.loadDeletedImages()
      ]);

      this.updateFolderCounts();
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  }

  async loadFolderImages(folderName, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      // Get images from the folder
      const images = await this.getFolderImages(folderName);
      this.renderFolderImages(container, images, folderName);
    } catch (error) {
      console.error(`Error loading ${folderName} images:`, error);
      this.showEmptyFolder(container, folderName);
    }
  }

  async getFolderImages(folderName) {
    try {
      const response = await fetch(`${API_BASE_URL}/gallery/${folderName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to get images`);
      }

      const data = await response.json();
      return data.images || [];
    } catch (error) {
      console.error(`Error getting ${folderName} images:`, error);
      return [];
    }
  }

  renderFolderImages(container, images, folderName) {
    if (!images || images.length === 0) {
      this.showEmptyFolder(container, folderName);
      return;
    }

    container.innerHTML = images.map(image => this.createImageItem(image, folderName)).join('');
  }

  createImageItem(image, folderName) {
    const imageUrl = `../images/${folderName}/${image.filename}`;
    const fileSize = this.formatFileSize(image.size);
    
    // System folder için "Yeni İcon Yap" butonu ekle
    const systemIconButton = folderName === 'system' ? `
          <button class="gallery-action-btn set-icon" title="Yeni İcon Yap" onclick="galleryManager.setAsNewIcon('${image.filename}')">
            ⭐
          </button>
        ` : '';
    
    return `
      <div class="gallery-image-item" data-filename="${image.filename}" data-folder="${folderName}">
        <img src="${imageUrl}" alt="${image.originalName}" class="gallery-image">
        <div class="gallery-image-actions">
          <button class="gallery-action-btn copy" title="URL Kopyala" onclick="galleryManager.copyImageUrl('${imageUrl}')">
            📋
          </button>
          ${systemIconButton}
          <button class="gallery-action-btn delete" title="Sil" onclick="galleryManager.deleteImage('${image.filename}', '${folderName}')">
            🗑️
          </button>
        </div>
        <div class="gallery-image-info">
          <div class="gallery-image-name">${image.originalName}</div>
          <div class="gallery-image-meta">
            <span>${fileSize}</span>
            <span>${image.dimensions || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
  }

  showEmptyFolder(container, folderName) {
    const folderLabels = {
      'system': 'Sistem İkonları',
      'profile': 'Profil Fotoğrafları',
      'blog-covers': 'Blog Kapak Resimleri',
      'blog-content': 'Blog İçerik Resimleri'
    };

    container.innerHTML = `
      <div class="folder-empty">
        <div class="folder-empty-icon">🖼️</div>
        <p class="folder-empty-text">${folderLabels[folderName]} klasöründe henüz resim bulunmuyor.</p>
      </div>
    `;
  }

  async loadDeletedImages() {
    const container = document.getElementById('deletedImages');
    if (!container) return;

    try {
      const response = await fetch(`${API_BASE_URL}/gallery/deleted`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to get deleted images`);
      }

      const data = await response.json();
      this.renderDeletedImages(container, data.images || []);
    } catch (error) {
      console.error('Error loading deleted images:', error);
      this.showEmptyDeletedFolder(container);
    }
  }

  renderDeletedImages(container, images) {
    if (!images || images.length === 0) {
      this.showEmptyDeletedFolder(container);
      return;
    }

    container.innerHTML = images.map(image => this.createDeletedImageItem(image)).join('');
    this.updateDeletedActions(images.length > 0);
  }

  createDeletedImageItem(image) {
    const imageUrl = `../images/deleted/${image.filename}`;
    const fileSize = this.formatFileSize(image.size);
    const deletedDate = new Date(image.deletedAt).toLocaleDateString('tr-TR');
    
    return `
      <div class="gallery-image-item deleted-item" data-filename="${image.filename}" data-folder="deleted">
        <img src="${imageUrl}" alt="${image.originalName}" class="gallery-image">
        <div class="gallery-image-actions">
          <button class="gallery-action-btn restore" title="Geri Yükle" onclick="galleryManager.restoreImage('${image.filename}')">
            ↩️
          </button>
          <button class="gallery-action-btn delete-permanent" title="Kalıcı Olarak Sil" onclick="galleryManager.permanentDeleteImage('${image.filename}')">
            🗑️
          </button>
        </div>
        <div class="gallery-image-info">
          <div class="gallery-image-name">${image.originalName}</div>
          <div class="gallery-image-meta">
            <span>${fileSize}</span>
            <span>${image.originalFolder}</span>
          </div>
          <div class="deleted-info">
            <small>Silindi: ${deletedDate}</small>
          </div>
        </div>
      </div>
    `;
  }

  showEmptyDeletedFolder(container) {
    container.innerHTML = `
      <div class="folder-empty">
        <div class="folder-empty-icon">🗑️</div>
        <p class="folder-empty-text">Silinen resim bulunmuyor.</p>
      </div>
    `;
    this.updateDeletedActions(false);
  }

  updateDeletedActions(hasImages) {
    const deleteAllBtn = document.getElementById('deleteAllDeletedBtn');
    const restoreAllBtn = document.getElementById('restoreAllDeletedBtn');
    
    if (deleteAllBtn) deleteAllBtn.disabled = !hasImages;
    if (restoreAllBtn) restoreAllBtn.disabled = !hasImages;
  }

  updateFolderCounts() {
    const folders = ['system', 'profile', 'blog-covers', 'blog-content'];
    
    folders.forEach(folder => {
      const container = document.getElementById(`${folder}Images`);
      if (container) {
        const imageCount = container.querySelectorAll('.gallery-image-item').length;
        const countElement = document.querySelector(`#${folder}-folder .folder-count`);
        if (countElement) {
          countElement.textContent = `(${imageCount} resim)`;
        }
      }
    });

    // Update deleted folder count
    const deletedContainer = document.getElementById('deletedImages');
    if (deletedContainer) {
      const deletedCount = deletedContainer.querySelectorAll('.gallery-image-item').length;
      const deletedCountElement = document.querySelector('#deleted-folder .folder-count');
      if (deletedCountElement) {
        deletedCountElement.textContent = `(${deletedCount} resim)`;
      }
    }
  }

  filterGallery() {
    const folders = ['system', 'profile', 'blog-covers', 'blog-content'];
    
    folders.forEach(folder => {
      const folderElement = document.getElementById(`${folder}-folder`);
      if (folderElement) {
        if (this.currentFolder === 'all' || this.currentFolder === folder) {
          folderElement.style.display = 'block';
        } else {
          folderElement.style.display = 'none';
        }
      }
    });
  }

  showUploadArea() {
    const uploadArea = document.getElementById('galleryUploadArea');
    if (uploadArea) {
      uploadArea.style.display = 'block';
      uploadArea.scrollIntoView({ behavior: 'smooth' });
    }
  }

  closeGalleryUpload() {
    const uploadArea = document.getElementById('galleryUploadArea');
    if (uploadArea) {
      uploadArea.style.display = 'none';
    }
    this.resetUpload();
  }

  handleFileSelection(files) {
    if (!files || files.length === 0) return;

    this.uploadedFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (this.uploadedFiles.length === 0) {
      alert('Lütfen sadece resim dosyaları seçin.');
      return;
    }

    this.enableUploadButton();
    this.showSelectedFiles();
  }

  showSelectedFiles() {
    const uploadZone = document.getElementById('uploadZone');
    if (!uploadZone) return;

    const fileList = this.uploadedFiles.map(file => `
      <div class="selected-file">
        <span>${file.name}</span>
        <span>(${this.formatFileSize(file.size)})</span>
      </div>
    `).join('');

    uploadZone.innerHTML = `
      <div class="upload-content">
        <h4>Seçilen Dosyalar</h4>
        <div class="selected-files">
          ${fileList}
        </div>
        <p>Toplam: ${this.uploadedFiles.length} resim</p>
      </div>
    `;
  }

  enableUploadButton() {
    const startUploadBtn = document.getElementById('startUploadBtn');
    if (startUploadBtn) {
      startUploadBtn.disabled = false;
    }
  }

  async startUpload() {
    const targetFolder = document.getElementById('uploadTargetFolder').value;
    const startUploadBtn = document.getElementById('startUploadBtn');
    
    if (startUploadBtn) {
      startUploadBtn.disabled = true;
      startUploadBtn.textContent = 'Yükleniyor...';
    }

    try {
      for (let i = 0; i < this.uploadedFiles.length; i++) {
        const file = this.uploadedFiles[i];
        await this.uploadFile(file, targetFolder);
        
        // Update progress
        const progress = ((i + 1) / this.uploadedFiles.length) * 100;
        this.updateUploadProgress(progress);
      }

      // Refresh gallery
      await this.loadGallery();
      
      // Show success message
      this.showUploadSuccess();
      
      // Reset upload
      this.resetUpload();
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Resim yüklenirken hata oluştu: ' + error.message);
    } finally {
      if (startUploadBtn) {
        startUploadBtn.disabled = false;
        startUploadBtn.textContent = 'Yüklemeyi Başlat';
      }
    }
  }

  async uploadFile(file, targetFolder) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', targetFolder);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
  }

  updateUploadProgress(progress) {
    // This would update a progress bar if implemented
    console.log(`Upload progress: ${progress}%`);
  }

  showUploadSuccess() {
    alert(`${this.uploadedFiles.length} resim başarıyla yüklendi!`);
  }

  resetUpload() {
    this.uploadedFiles = [];
    const fileInput = document.getElementById('galleryFileInput');
    if (fileInput) {
      fileInput.value = '';
    }
    
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
      uploadZone.innerHTML = `
        <div class="upload-content">
          <svg class="upload-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <h4>Resim Yükle</h4>
          <p>Resimleri buraya sürükleyip bırakın veya tıklayarak seçin</p>
          <input type="file" id="galleryFileInput" multiple accept="image/*" style="display: none;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('galleryFileInput').click()">
            Bilgisayardan Seç
          </button>
        </div>
      `;
    }
  }

  copyImageUrl(imageUrl) {
    navigator.clipboard.writeText(imageUrl).then(() => {
      alert('Resim URL\'si kopyalandı!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = imageUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Resim URL\'si kopyalandı!');
    });
  }

  async deleteImage(filename, folderName) {
    if (!confirm(`"${filename}" dosyasını silmek istediğinizden emin misiniz?\n\nResim "Son Silinenler" bölümüne taşınacak ve geri yüklenebilir.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/gallery/${folderName}/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      // Remove from DOM
      const imageElement = document.querySelector(`[data-filename="${filename}"][data-folder="${folderName}"]`);
      if (imageElement) {
        imageElement.remove();
        this.updateFolderCounts();
      }

      // Reload deleted images
      await this.loadDeletedImages();
      
      alert('Resim "Son Silinenler" bölümüne taşındı!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Resim silinirken hata oluştu: ' + error.message);
    }
  }

  async restoreImage(filename) {
    if (!confirm(`"${filename}" dosyasını geri yüklemek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/gallery/deleted/${filename}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Restore failed');
      }

      // Remove from deleted DOM
      const imageElement = document.querySelector(`[data-filename="${filename}"][data-folder="deleted"]`);
      if (imageElement) {
        imageElement.remove();
        this.updateFolderCounts();
      }

      // Reload all gallery to show restored image
      await this.loadGallery();
      
      alert('Resim başarıyla geri yüklendi!');
    } catch (error) {
      console.error('Restore error:', error);
      alert('Resim geri yüklenirken hata oluştu: ' + error.message);
    }
  }

  async permanentDeleteImage(filename) {
    if (!confirm(`"${filename}" dosyasını kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/gallery/deleted/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Permanent delete failed');
      }

      // Remove from DOM
      const imageElement = document.querySelector(`[data-filename="${filename}"][data-folder="deleted"]`);
      if (imageElement) {
        imageElement.remove();
        this.updateFolderCounts();
      }
      
      alert('Resim kalıcı olarak silindi!');
    } catch (error) {
      console.error('Permanent delete error:', error);
      alert('Resim kalıcı olarak silinirken hata oluştu: ' + error.message);
    }
  }

  async deleteAllDeleted() {
    const deletedContainer = document.getElementById('deletedImages');
    const deletedItems = deletedContainer.querySelectorAll('.gallery-image-item');
    
    if (deletedItems.length === 0) {
      alert('Silinecek resim bulunmuyor!');
      return;
    }

    if (!confirm(`${deletedItems.length} resmi kalıcı olarak silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    try {
      const deletePromises = Array.from(deletedItems).map(item => {
        const filename = item.dataset.filename;
        return fetch(`${API_BASE_URL}/gallery/deleted/${filename}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          }
        });
      });

      await Promise.all(deletePromises);
      
      // Clear deleted images container
      await this.loadDeletedImages();
      
      alert(`${deletedItems.length} resim kalıcı olarak silindi!`);
    } catch (error) {
      console.error('Delete all error:', error);
      alert('Resimler silinirken hata oluştu: ' + error.message);
    }
  }

  async restoreAllDeleted() {
    const deletedContainer = document.getElementById('deletedImages');
    const deletedItems = deletedContainer.querySelectorAll('.gallery-image-item');
    
    if (deletedItems.length === 0) {
      alert('Geri yüklenecek resim bulunmuyor!');
      return;
    }

    if (!confirm(`${deletedItems.length} resmi geri yüklemek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const restorePromises = Array.from(deletedItems).map(item => {
        const filename = item.dataset.filename;
        return fetch(`${API_BASE_URL}/gallery/deleted/${filename}/restore`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          }
        });
      });

      await Promise.all(restorePromises);
      
      // Reload all gallery to show restored images
      await this.loadGallery();
      
      alert(`${deletedItems.length} resim başarıyla geri yüklendi!`);
    } catch (error) {
      console.error('Restore all error:', error);
      alert('Resimler geri yüklenirken hata oluştu: ' + error.message);
    }
  }

  async setAsNewIcon(filename) {
    if (!confirm(`"${filename}" dosyasını yeni sistem ikonu olarak ayarlamak istediğinizden emin misiniz?\n\nBu işlem tüm HTML dosyalarındaki favicon referanslarını güncelleyecektir.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/set-icon`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Icon update failed');
      }

      alert('✅ Yeni sistem ikonu başarıyla ayarlandı!\n\nTüm HTML dosyalarındaki favicon referansları güncellendi.');
      
      // Sayfayı yenile ki yeni favicon görünsün
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Set icon error:', error);
      alert('İkon ayarlanırken hata oluştu: ' + error.message);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize gallery manager
let galleryManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize existing functionality
  initMarkdownEditors();
  
  // Initialize gallery manager
  galleryManager = new GalleryManager();
  
  // Make galleryManager globally available
  window.galleryManager = galleryManager;
});

// Global functions for HTML onclick handlers
function closeGalleryUpload() {
  if (galleryManager) {
    galleryManager.closeGalleryUpload();
  }
}
