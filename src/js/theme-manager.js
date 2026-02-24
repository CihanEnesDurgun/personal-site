/**
 * Universal Theme Manager Module
 * Handles theme loading, switching, and persistence across all pages
 * 
 * Usage:
 *   1. Include this script: <script src="theme-manager.js"></script>
 *   2. Call: await loadCustomTheme();
 *   3. Initialize: const themeManager = new ThemeManager();
 */

/* ===== Global Theme Loader ===== */
/**
 * Loads custom theme from server (primary) or localStorage (fallback)
 * Should be called before ThemeManager initialization
 */
async function loadCustomTheme() {
  try {
    console.log('🎨 Loading custom theme from server...');

    // Primary: Load from server
    const response = await fetch('/api/theme');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.theme) {
        const themeData = data.theme;
        console.log('✅ Theme loaded from server');
        applyThemeVariables(themeData);

        // Sync to localStorage as backup
        localStorage.setItem('customTheme', JSON.stringify(themeData));
        return themeData;
      }
    }
  } catch (error) {
    console.warn('⚠️ Server theme loading failed:', error.message);
  }

  // Fallback: Load from localStorage
  try {
    const customTheme = localStorage.getItem('customTheme');
    if (customTheme) {
      const themeData = JSON.parse(customTheme);
      if (themeData.light && themeData.dark) {
        console.log('📦 Theme loaded from localStorage (fallback)');
        applyThemeVariables(themeData);
        return themeData;
      }
    }
  } catch (error) {
    console.error('❌ Error loading custom theme:', error);
  }

  console.log('ℹ️ Using default theme');
  return null;
}

/**
 * Apply theme variables to CSS custom properties
 * @param {Object} themeData - Theme configuration object
 */
function applyThemeVariables(themeData) {
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

  // Apply font family
  if (themeData.fontFamily) {
    document.body.style.fontFamily = `'${themeData.fontFamily}', system-ui, -apple-system, sans-serif`;
  }
}

/* ===== Theme Manager Class ===== */
/**
 * Main theme management class
 * Handles theme switching, persistence, and UI updates
 */
class ThemeManager {
  constructor() {
    this.root = document.documentElement;
    this.themeToggle = document.getElementById('themeToggle');

    // SVG icons for theme toggle button
    this.icons = {
      sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm7-6a1 1 0 0 1 1 1 1 1 0 1 1-2 0 1 1 0 0 1 1-1ZM4 12a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm12.95 6.364a1 1 0 0 1 1.415 1.415 1 1 0 1 1-1.415-1.415ZM5.636 5.636a1 1 0 1 1 1.415 1.415A1 1 0 1 1 5.636 5.636Zm12.728 0a1 1 0 0 1 0 1.415 1 1 0 1 1-1.415-1.415 1 1 0 0 1 1.415 0ZM7.05 18.364a1 1 0 1 1-1.415 1.415A1 1 0 0 1 7.05 18.364ZM12 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z"/></svg>',
      moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z"/></svg>'
    };

    // Default theme configuration
    this.defaultTheme = {
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

    this.init();
  }

  /**
   * Initialize theme manager
   * Sets up event listeners and applies initial theme
   */
  init() {
    if (!this.themeToggle) {
      console.warn('⚠️ Theme toggle button not found - theme switching disabled');
      return;
    }

    // Set initial theme
    this.setTheme(this.getCurrentTheme());

    // Add click listener for theme toggle
    this.themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });

    console.log('✅ ThemeManager initialized');
  }

  /**
   * Get current theme preference
   * Priority: localStorage > system preference
   * @returns {string} 'dark' or 'light'
   */
  getCurrentTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark' ? 'dark' : 'light';
    }

    // Use system preference as fallback
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Apply theme colors and update UI
   * @param {string} theme - 'dark' or 'light'
   */
  async setTheme(theme) {
    const isDark = theme === 'dark';

    // Try to get theme data from localStorage first, then from server
    let themeData = null;

    // First: Check localStorage
    const savedTheme = localStorage.getItem('customTheme');
    if (savedTheme) {
      try {
        themeData = JSON.parse(savedTheme);
        console.log('📦 Using cached theme data');
      } catch (error) {
        console.warn('⚠️ Invalid cached theme data');
      }
    }

    // Second: If no cached data, try to load from server
    if (!themeData) {
      try {
        console.log('🌐 Loading theme from server...');
        const response = await fetch('/api/theme');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.theme) {
            themeData = data.theme;
            // Cache the theme data
            localStorage.setItem('customTheme', JSON.stringify(themeData));
            console.log('✅ Theme loaded from server and cached');
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not load theme from server:', error.message);
      }
    }

    // Apply theme colors
    if (themeData) {
      const colors = isDark ? themeData.dark : themeData.light;

      this.root.style.setProperty('--bg', colors.bg);
      this.root.style.setProperty('--panel', colors.panel);
      this.root.style.setProperty('--ink', colors.ink);
      this.root.style.setProperty('--muted', colors.muted);
      this.root.style.setProperty('--line', colors.line);
      this.root.style.setProperty('--accent', colors.accent);

      console.log(`🎨 Applied ${theme} theme colors`);
    } else {
      console.warn('⚠️ No theme data available, using defaults');
    }

    // Toggle dark class on root element
    this.root.classList.toggle('dark', isDark);

    // Save preference to localStorage
    localStorage.setItem('theme', theme);

    // Update toggle button icon
    if (this.themeToggle) {
      this.themeToggle.innerHTML = isDark ? this.icons.sun : this.icons.moon;
    }

    // Force browser repaint
    this.root.offsetHeight;

    console.log(`🎨 Theme set to: ${theme}`);
  }

  /**
   * Toggle between light and dark themes
   */
  async toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    await this.setTheme(newTheme);
  }

  /**
   * Get current theme data
   * @returns {Object} Theme configuration object
   */
  getThemeData() {
    try {
      const savedTheme = localStorage.getItem('customTheme');
      if (savedTheme) {
        return JSON.parse(savedTheme);
      }
    } catch (error) {
      console.error('❌ Error reading theme data:', error);
    }
    return this.defaultTheme;
  }
}

// Make functions globally available
if (typeof window !== 'undefined') {
  window.loadCustomTheme = loadCustomTheme;
  window.ThemeManager = ThemeManager;
  window.applyThemeVariables = applyThemeVariables;
}

console.log('📦 Theme Manager Module loaded');

